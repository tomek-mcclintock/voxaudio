// src/app/api/save-feedback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { uploadVoiceRecording } from '@/lib/s3';
import { transcribeAudio, analyzeFeedback } from '@/lib/openai';
import { appendToSheet, formatFeedbackForSheets } from '@/lib/googleSheets';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    console.log('Starting feedback submission...');
    
    const formData = await request.formData();
    
    // Log all FormData entries
    console.log('Raw FormData entries:');
    for (const pair of formData.entries()) {
      console.log(pair[0], ':', pair[1]);
    }

    const orderId = formData.get('orderId') as string;
    const npsScore = formData.get('npsScore') ? parseInt(formData.get('npsScore') as string) : null;
    const companyId = formData.get('companyId') as string;
    const campaignId = formData.get('campaignId') as string;
    const audioFile = formData.get('audio') as Blob | null;
    const textFeedback = formData.get('textFeedback') as string | null;
    const questionResponsesStr = formData.get('questionResponses') as string | null;

    console.log('Raw questionResponsesStr:', questionResponsesStr);

    let questionResponses = null;
    if (questionResponsesStr) {
      try {
        questionResponses = JSON.parse(questionResponsesStr);
        console.log('Parsed questionResponses:', questionResponses);
      } catch (e) {
        console.error('Failed to parse questionResponses:', e);
        console.error('Parse error details:', e);
      }
    }

    console.log('Processed form data:', { 
      orderId, 
      npsScore, 
      companyId, 
      campaignId, 
      hasAudio: !!audioFile,
      hasText: !!textFeedback,
      hasQuestionResponses: !!questionResponses,
      questionResponses
    });

    if (!orderId || !companyId || !campaignId) {
      console.log('Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate campaign exists and belongs to company
    const { data: campaign, error: campaignError } = await supabase
      .from('feedback_campaigns')
      .select('*')
      .eq('id', campaignId)
      .eq('company_id', companyId)
      .single();

    if (campaignError || !campaign) {
      console.error('Invalid campaign:', campaignError);
      return NextResponse.json(
        { error: 'Invalid campaign' },
        { status: 400 }
      );
    }

    let voiceFileUrl = null;
    let transcription = null;
    let sentiment = null;

    if (audioFile) {
      try {
        console.log('Processing audio file...');
        const arrayBuffer = await audioFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        console.log('Uploading to S3...');
        voiceFileUrl = await uploadVoiceRecording(buffer, `${companyId}/${campaignId}/${orderId}`);
        console.log('S3 upload complete:', voiceFileUrl);

        console.log('Transcribing audio...');
        transcription = await transcribeAudio(buffer);
        console.log('Transcription complete:', transcription);

        if (transcription) {
          console.log('Analyzing feedback...');
          const analysis = await analyzeFeedback(transcription);
          sentiment = analysis.sentiment;
          console.log('Analysis complete:', sentiment);
        }
      } catch (error) {
        console.error('Error processing audio:', error);
        return NextResponse.json(
          { error: 'Failed to process audio' },
          { status: 500 }
        );
      }
    } else if (textFeedback) {
      transcription = textFeedback;
      try {
        console.log('Analyzing text feedback...');
        const analysis = await analyzeFeedback(textFeedback);
        sentiment = analysis.sentiment;
        console.log('Analysis complete:', sentiment);
      } catch (error) {
        console.error('Error analyzing text:', error);
      }
    }

    // Save feedback submission
    console.log('Saving feedback submission...');
    const { data: feedback, error: feedbackError } = await supabase
      .from('feedback_submissions')
      .insert({
        company_id: companyId,
        campaign_id: campaignId,
        order_id: orderId,
        nps_score: npsScore,
        voice_file_url: voiceFileUrl,
        transcription,
        sentiment,
        processed: false,
      })
      .select()
      .single();

    if (feedbackError) {
      console.error('Database error saving feedback:', feedbackError);
      return NextResponse.json(
        { error: 'Failed to save feedback' },
        { status: 500 }
      );
    }

    console.log('Feedback saved successfully:', feedback);

    // Save question responses if any
    if (questionResponses && feedback) {
      console.log('About to save question responses. Feedback ID:', feedback.id);
      
      // Format responses for insertion
      const questionResponsesArray = Object.entries(questionResponses).map(([questionId, value]) => ({
        feedback_submission_id: feedback.id,
        question_id: questionId,
        response_value: typeof value === 'string' ? value : JSON.stringify(value)
      }));

      console.log('Formatted responses for insertion:', questionResponsesArray);

      // Attempt to save responses
      const { data: savedResponses, error: responsesError } = await supabase
        .from('question_responses')
        .insert(questionResponsesArray)
        .select();

      if (responsesError) {
        console.error('Failed to save question responses:', responsesError);
        console.error('Error details:', responsesError.details);
        console.error('Error message:', responsesError.message);
      } else {
        console.log('Successfully saved responses:', savedResponses);
      }
    } else {
      console.log('No question responses to save or no feedback ID available');
    }

    // Check for Google Sheets connection and sync if exists
    console.log('Checking for Google Sheets connection...');
    const { data: sheetsConnection } = await supabase
      .from('google_sheets_connections')
      .select('*')
      .eq('campaign_id', campaignId)
      .single();

    if (sheetsConnection) {
      console.log('Found Google Sheets connection, syncing data...');
      try {
        const formattedData = formatFeedbackForSheets({
          created_at: feedback.created_at,
          order_id: orderId,
          nps_score: npsScore,
          transcription: transcription,
          sentiment: sentiment,
          ...questionResponses && { responses: JSON.stringify(questionResponses) }
        });

        await appendToSheet(
          sheetsConnection.refresh_token,
          sheetsConnection.spreadsheet_id,
          sheetsConnection.sheet_name,
          formattedData
        );

        console.log('Successfully synced to Google Sheets');
      } catch (error) {
        console.error('Error syncing to Google Sheets:', error);
        // Don't fail the submission if Google Sheets sync fails
      }
    }

    console.log('Feedback submission process complete');
    return NextResponse.json({ 
      success: true,
      feedback,
      hasQuestionResponses: !!questionResponses
    });
  } catch (error) {
    console.error('Error processing feedback:', error);
    return NextResponse.json(
      { error: 'Failed to process feedback' },
      { status: 500 }
    );
  }
}