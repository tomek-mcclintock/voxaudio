// src/app/api/save-feedback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { uploadVoiceRecording } from '@/lib/s3';
import { transcribeAudio, analyzeFeedback } from '@/lib/openai';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    console.log('Starting feedback submission...');
    
    const formData = await request.formData();
    const orderId = formData.get('orderId') as string;
    const npsScore = formData.get('npsScore') ? parseInt(formData.get('npsScore') as string) : null;
    const companyId = formData.get('companyId') as string;
    const campaignId = formData.get('campaignId') as string;
    const audioFile = formData.get('audio') as Blob | null;
    const textFeedback = formData.get('textFeedback') as string | null;
    const questionResponsesStr = formData.get('questionResponses') as string | null;
    const questionResponses = questionResponsesStr ? JSON.parse(questionResponsesStr) : null;

    console.log('Received data:', { 
      orderId, 
      npsScore, 
      companyId, 
      campaignId, 
      hasAudio: !!audioFile,
      hasText: !!textFeedback,
      hasQuestionResponses: !!questionResponses
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

    // Start a database transaction
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
      console.error('Database error:', feedbackError);
      return NextResponse.json(
        { error: 'Failed to save feedback' },
        { status: 500 }
      );
    }

    // Save question responses if any
    if (questionResponses && feedback) {
      const questionResponsesArray = Object.entries(questionResponses).map(([questionId, value]) => ({
        feedback_submission_id: feedback.id,
        question_id: questionId,
        response_value: typeof value === 'string' ? value : JSON.stringify(value)
      }));

      const { error: responsesError } = await supabase
        .from('question_responses')
        .insert(questionResponsesArray);

      if (responsesError) {
        console.error('Error saving question responses:', responsesError);
        // Don't fail the whole submission if question responses fail
        // but log it for monitoring
      }
    }

    console.log('Feedback submission complete');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing feedback:', error);
    return NextResponse.json(
      { error: 'Failed to process feedback' },
      { status: 500 }
    );
  }
}