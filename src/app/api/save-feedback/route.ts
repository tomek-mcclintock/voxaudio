// src/app/api/save-feedback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { uploadVoiceRecording } from '@/lib/s3';
import { transcribeAudio, analyzeFeedback } from '@/lib/openai';
import { appendToSheet, formatFeedbackForSheets } from '@/lib/googleSheets';

export const runtime = 'nodejs';

// Create service role client to bypass RLS
const serviceRoleClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

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
    
    // New fields for question voice recordings
    const hasVoiceQuestions = formData.get('hasVoiceQuestions') === 'true';
    const voiceQuestionIdsStr = formData.get('voiceQuestionIds') as string | null;
    let voiceQuestionIds: string[] = [];
    
    // Extract additional parameters
    const additionalParamsStr = formData.get('additionalParams') as string | null;
    let metadata = {};
    if (additionalParamsStr) {
      try {
        metadata = JSON.parse(additionalParamsStr);
        console.log('Additional parameters:', metadata);
      } catch (e) {
        console.error('Failed to parse additionalParams:', e);
      }
    }
    
    if (hasVoiceQuestions && voiceQuestionIdsStr) {
      try {
        voiceQuestionIds = JSON.parse(voiceQuestionIdsStr);
        console.log('Voice question IDs:', voiceQuestionIds);
      } catch (e) {
        console.error('Failed to parse voice question IDs:', e);
      }
    }

    console.log('Order ID from form:', orderId);
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
      questionResponses,
      hasVoiceQuestions,
      voiceQuestionIds
    });

    // Validate basic required fields
    if (!companyId || !campaignId) {
      console.log('Missing required fields: company ID or campaign ID');
      return NextResponse.json(
        { error: 'Missing required fields: company ID or campaign ID' },
        { status: 400 }
      );
    }

    // Validate campaign exists and belongs to company - using service role client
    const { data: campaign, error: campaignError } = await serviceRoleClient
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

    // Process main audio feedback (related to NPS)
    if (audioFile) {
      try {
        console.log('Processing main audio file...');
        const arrayBuffer = await audioFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        console.log('Uploading to S3...');
        voiceFileUrl = await uploadVoiceRecording(buffer, `${companyId}/${campaignId}/${orderId || 'no-order-id'}`);
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

    // Process voice recordings for individual questions
    const questionVoiceFiles: Record<string, string> = {};
    const questionTranscriptions: Record<string, string> = {};
    
    if (hasVoiceQuestions && voiceQuestionIds.length > 0) {
      console.log('Processing voice recordings for questions...');
      
      for (const questionId of voiceQuestionIds) {
        const questionAudioFile = formData.get(`question_audio_${questionId}`) as Blob | null;
        
        if (questionAudioFile) {
          try {
            console.log(`Processing audio for question ${questionId}...`);
            const arrayBuffer = await questionAudioFile.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            
            // Upload to S3 with a distinct path
            const filePath = await uploadVoiceRecording(
              buffer, 
              `${companyId}/${campaignId}/question_${questionId}_${orderId || 'no-order-id'}`
            );
            questionVoiceFiles[questionId] = filePath;
            
            // Transcribe the audio
            const questionTranscription = await transcribeAudio(buffer);
            if (questionTranscription) {
              questionTranscriptions[questionId] = questionTranscription;
            }
            
            console.log(`Processed audio for question ${questionId}, filePath: ${filePath}`);
          } catch (error) {
            console.error(`Error processing audio for question ${questionId}:`, error);
            // Continue with other questions rather than failing the entire submission
          }
        }
      }
    }

    // Convert empty string OrderID to null to ensure it's properly handled by the database
    const orderIdToSave = orderId && orderId.trim() !== '' ? orderId : null;
    console.log('Order ID to save to database:', orderIdToSave);

    // Check if the campaign has NPS enabled
    const { data: campaignSettings, error: settingsError } = await serviceRoleClient
      .from('feedback_campaigns')
      .select('include_nps')
      .eq('id', campaignId)
      .single();
      
    if (settingsError) {
      console.error('Error checking campaign NPS settings:', settingsError);
      // Continue anyway with default behavior
    }
    
    // Use null for NPS score if not included in campaign
    const finalNpsScore = (campaignSettings && !campaignSettings.include_nps) ? null : npsScore;
    
    // NEW CODE: Check for duplicate submissions based on metadata
    // Only check if metadata is not empty
    let existingSubmission = null;
    
    if (metadata && Object.keys(metadata).length > 0) {
      console.log('Checking for existing submissions with same metadata');
      
      // We'll look for submissions with the exact same metadata JSON
      const { data: existingSubmissions, error: queryError } = await serviceRoleClient
        .from('feedback_submissions')
        .select('id, metadata, created_at')
        .eq('company_id', companyId)
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false });
    
      if (queryError) {
        console.error('Error querying existing submissions:', queryError);
      } else if (existingSubmissions && existingSubmissions.length > 0) {
        // Check each submission's metadata to find a match
        for (const submission of existingSubmissions) {
          if (submission.metadata) {
            // Compare the metadata objects
            const isEqual = compareMetadata(metadata, submission.metadata);
            if (isEqual) {
              console.log(`Found existing submission with matching metadata: ${submission.id}`);
              existingSubmission = submission;
              break;
            }
          }
        }
      }
    }
    
    // Prepare the feedback data
    const feedbackData = {
      company_id: companyId,
      campaign_id: campaignId,
      order_id: orderIdToSave,
      nps_score: finalNpsScore,
      voice_file_url: voiceFileUrl,
      transcription,
      sentiment,
      processed: false,
      metadata: metadata
    };
    
    let feedback;
    let feedbackError;
    
    // Use the existing submission if found, otherwise create a new one
    if (existingSubmission) {
      console.log(`Updating existing submission: ${existingSubmission.id}`);
      
      // Update the existing submission with new data
      const { data, error } = await serviceRoleClient
        .from('feedback_submissions')
        .update(feedbackData)
        .eq('id', existingSubmission.id)
        .select()
        .single();
        
      feedback = data;
      feedbackError = error;
      
      if (error) {
        console.error('Error updating existing submission:', error);
      } else {
        console.log('Successfully updated existing submission:', data);
      }
    } else {
      console.log('Creating new submission');
      
      // Create a new feedback submission
      const { data, error } = await serviceRoleClient
        .from('feedback_submissions')
        .insert(feedbackData)
        .select()
        .single();
        
      feedback = data;
      feedbackError = error;
      
      if (error) {
        console.error('Error creating new submission:', error);
      } else {
        console.log('Successfully created new submission:', data);
      }
    }

    if (feedbackError) {
      console.error('Database error saving feedback:', feedbackError);
      return NextResponse.json(
        { error: 'Failed to save feedback' },
        { status: 500 }
      );
    }

    console.log('Feedback saved successfully:', feedback);

    // Save question responses if any
    if ((questionResponses || Object.keys(questionTranscriptions).length > 0) && feedback) {
      console.log('About to save question responses. Feedback ID:', feedback.id);
      
      // If we're updating an existing submission, first delete any existing responses
      if (existingSubmission) {
        console.log('Deleting existing question responses for submission:', feedback.id);
        const { error: deleteError } = await serviceRoleClient
          .from('question_responses')
          .delete()
          .eq('feedback_submission_id', feedback.id);
          
        if (deleteError) {
          console.error('Error deleting existing question responses:', deleteError);
        } else {
          console.log('Successfully deleted existing question responses');
        }
      }
      
      // Format text responses for insertion
      const questionResponsesArray = [];
      
      // Add text responses
      if (questionResponses) {
        for (const [questionId, value] of Object.entries(questionResponses)) {
          questionResponsesArray.push({
            feedback_submission_id: feedback.id,
            question_id: questionId,
            response_value: typeof value === 'string' ? value : JSON.stringify(value),
            voice_file_url: questionVoiceFiles[questionId] || null,
            transcription: questionTranscriptions[questionId] || null
          });
        }
      }
      
      // Add voice-only responses (if not already in text responses)
      for (const questionId of Object.keys(questionTranscriptions)) {
        if (!questionResponses || !questionResponses[questionId]) {
          questionResponsesArray.push({
            feedback_submission_id: feedback.id,
            question_id: questionId,
            response_value: null, // No text response
            voice_file_url: questionVoiceFiles[questionId] || null,
            transcription: questionTranscriptions[questionId] || null
          });
        }
      }

      console.log('Formatted responses for insertion:', questionResponsesArray);

      if (questionResponsesArray.length > 0) {
        // Attempt to save responses - using service role client
        const { data: savedResponses, error: responsesError } = await serviceRoleClient
          .from('question_responses')
          .insert(questionResponsesArray)
          .select();

        if (responsesError) {
          console.error('Failed to save question responses:', responsesError);
        } else {
          console.log('Successfully saved responses:', savedResponses);
        }
      }
    } else {
      console.log('No question responses to save or no feedback ID available');
    }

    // Check for Google Sheets connection and sync if exists
    console.log('Checking for Google Sheets connection...');
    const { data: sheetsConnection } = await serviceRoleClient
      .from('google_sheets_connections')
      .select('*')
      .eq('campaign_id', campaignId)
      .single();

    if (sheetsConnection) {
      console.log('Found Google Sheets connection, syncing data...');
      try {
        // Format data for sheets, including both text and voice transcriptions
        const allResponses = { ...questionResponses };
        
        // Add transcriptions from voice responses
        for (const [questionId, transcriptionText] of Object.entries(questionTranscriptions)) {
          if (!allResponses[questionId]) {
            allResponses[questionId] = `[Voice] ${transcriptionText}`;
          }
        }
        
        const formattedData = formatFeedbackForSheets({
          created_at: feedback.created_at,
          order_id: orderIdToSave || 'N/A',
          nps_score: npsScore,
          transcription: transcription,
          sentiment: sentiment,
          ...Object.keys(allResponses).length > 0 && { responses: JSON.stringify(allResponses) }
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
      hasQuestionResponses: !!questionResponses || Object.keys(questionTranscriptions).length > 0
    });
  } catch (error) {
    console.error('Error processing feedback:', error);
    return NextResponse.json(
      { error: 'Failed to process feedback' },
      { status: 500 }
    );
  }
}

// Helper function to compare metadata objects
function compareMetadata(obj1: any, obj2: any): boolean {
  // If both are null or undefined, they're equal
  if (!obj1 && !obj2) return true;
  
  // If only one is null/undefined, they're not equal
  if (!obj1 || !obj2) return false;
  
  // Get all keys from both objects
  const allKeys = [...new Set([...Object.keys(obj1), ...Object.keys(obj2)])];
  
  // Compare each key
  for (const key of allKeys) {
    // If key exists in both objects
    if (key in obj1 && key in obj2) {
      // If values don't match, objects aren't equal
      if (obj1[key] !== obj2[key]) return false;
    } else {
      // If key exists in only one object, they're not equal
      return false;
    }
  }
  
  // If we got here, all keys and values match
  return true;
}
