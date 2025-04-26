// src/app/api/save-feedback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { uploadVoiceRecording } from '@/lib/s3';
import { transcribeAudio, analyzeFeedback } from '@/lib/openai';
import { generateUniqueSubmissionId } from '@/lib/utils';

export const runtime = 'nodejs';

// Create service role client to bypass RLS
const serviceRoleClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(request: NextRequest) {
  // Add a unique identifier for this submission attempt for tracking
  const submissionAttemptId = `voice-sub-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  console.log(`[${submissionAttemptId}] Starting feedback submission process...`);
  
  try {
    const formData = await request.formData();
    
    // Log all FormData entries
    console.log(`[${submissionAttemptId}] Raw FormData entries:`);
    for (const pair of formData.entries()) {
      // For audio files, just log that they exist but not the content
      if (pair[0] === 'audio' || pair[0].startsWith('question_audio_')) {
        console.log(`[${submissionAttemptId}] ${pair[0]} : [Audio File Present - ${(pair[1] as Blob).size} bytes]`);
      } else {
        console.log(`[${submissionAttemptId}] ${pair[0]} : ${pair[1]}`);
      }
    }

    const orderId = formData.get('orderId') as string;
    const npsScore = formData.get('npsScore') ? parseInt(formData.get('npsScore') as string) : null;
    const companyId = formData.get('companyId') as string;
    const campaignId = formData.get('campaignId') as string;
    const textFeedback = formData.get('textFeedback') as string | null;
    const questionResponsesStr = formData.get('questionResponses') as string | null;
    const clientId = formData.get('clientId') as string;
    
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
        console.log(`[${submissionAttemptId}] Additional parameters:`, metadata);
      } catch (e) {
        console.error(`[${submissionAttemptId}] Failed to parse additionalParams:`, e);
      }
    }
    
    if (hasVoiceQuestions && voiceQuestionIdsStr) {
      try {
        voiceQuestionIds = JSON.parse(voiceQuestionIdsStr);
        console.log(`[${submissionAttemptId}] Voice question IDs:`, voiceQuestionIds);
      } catch (e) {
        console.error(`[${submissionAttemptId}] Failed to parse voice question IDs:`, e);
      }
    }

    console.log(`[${submissionAttemptId}] Order ID from form:`, orderId);
    console.log(`[${submissionAttemptId}] Raw questionResponsesStr:`, questionResponsesStr);

    let questionResponses = null;
    if (questionResponsesStr) {
      try {
        questionResponses = JSON.parse(questionResponsesStr);
        console.log(`[${submissionAttemptId}] Parsed questionResponses:`, questionResponses);
      } catch (e) {
        console.error(`[${submissionAttemptId}] Failed to parse questionResponses:`, e);
        console.error(`[${submissionAttemptId}] Parse error details:`, e);
      }
    }

    console.log(`[${submissionAttemptId}] Processed form data:`, { 
      orderId, 
      npsScore, 
      companyId, 
      campaignId, 
      hasText: !!textFeedback,
      hasQuestionResponses: !!questionResponses,
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

    let sentiment = null;

    // Check if we have NPS text feedback from the question responses
    let feedbackText = textFeedback; // Create a mutable copy
    if (questionResponses && questionResponses['nps_feedback']) {
      feedbackText = questionResponses['nps_feedback'];
      delete questionResponses['nps_feedback']; // Remove it since we'll handle it specially
    }
    
    // Analyze sentiment if we have text feedback
    if (feedbackText) {
      try {
        console.log('Analyzing text feedback...');
        const analysis = await analyzeFeedback(feedbackText);
        sentiment = analysis.sentiment;
        console.log('Analysis complete:', sentiment);
      } catch (error) {
        console.error('Error analyzing text:', error);
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
    
    // Generate unique submission identifier
    const submissionData = {
      orderId: orderIdToSave,
      companyId,
      campaignId,
      additionalParams: metadata,
      clientId
    };
    
    const submissionId = generateUniqueSubmissionId(submissionData);
    console.log('Generated submission ID:', submissionId);
    
    // Check for existing submission with this unique ID
    const { data: existingSubmission, error: queryError } = await serviceRoleClient
      .from('feedback_submissions')
      .select('id, metadata, created_at')
      .eq('submission_identifier', submissionId)
      .maybeSingle();
    
    if (queryError) {
      console.error('Error querying existing submissions:', queryError);
    }
    
    // Prepare the feedback data - without the columns we're moving to question_responses
    const feedbackData = {
      company_id: companyId,
      campaign_id: campaignId,
      order_id: orderIdToSave,
      sentiment,
      processed: false,
      metadata: metadata,
      submission_identifier: submissionId,
      browser_client_id: clientId || null
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

    // Process question voice recordings
    const questionVoiceFiles: Record<string, string> = {};
    const pendingVoiceTranscriptions: string[] = [];

    if (hasVoiceQuestions && voiceQuestionIds.length > 0) {
      console.log(`[${submissionAttemptId}] Processing voice recordings for ${voiceQuestionIds.length} questions...`);
      
      for (const questionId of voiceQuestionIds) {
        const questionAudioFile = formData.get(`question_audio_${questionId}`) as Blob | null;
        
        if (questionAudioFile) {
          try {
            console.log(`[${submissionAttemptId}] Processing audio for question ${questionId}...`);
            console.log(`[${submissionAttemptId}] Question audio file type: ${questionAudioFile.type}, size: ${questionAudioFile.size} bytes`);
            const arrayBuffer = await questionAudioFile.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            console.log(`[${submissionAttemptId}] Successfully converted question audio to buffer, size: ${buffer.length} bytes`);
            
            // Upload to S3 with a distinct path
            const filePath = await uploadVoiceRecording(
              buffer, 
              `${companyId}/${campaignId}/question_${questionId}_${orderId || 'no-order-id'}`
            );
            questionVoiceFiles[questionId] = filePath;
            
            // Store file path and mark for async transcription
            pendingVoiceTranscriptions.push(questionId);
            
            console.log(`[${submissionAttemptId}] Uploaded audio for question ${questionId}, filePath: ${filePath}`);
          } catch (error) {
            console.error(`[${submissionAttemptId}] Error processing audio for question ${questionId}:`, error);
            // Log more details about the error
            if (error instanceof Error) {
              console.error(`[${submissionAttemptId}] Error name: ${error.name}, message: ${error.message}`);
              console.error(`[${submissionAttemptId}] Error stack:`, error.stack);
            }
            // Continue with other questions rather than failing the entire submission
          }
        } else {
          console.log(`[${submissionAttemptId}] No audio file found for question ${questionId}`);
        }
      }
    } else {
      console.log(`[${submissionAttemptId}] No voice questions to process`);
    }

    // Save question responses - MODIFIED for consolidated NPS
    if ((questionResponses || Object.keys(questionVoiceFiles).length > 0) && feedback) {
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
      
      // Process NPS score and feedback together if present
      if (npsScore !== null || feedbackText || questionVoiceFiles['nps_score'] || questionVoiceFiles['nps_feedback'] || 
        (questionResponses && questionResponses['nps_score'])) {  // Add this condition
      console.log('Processing consolidated NPS entry');
      const npsEntry: {
        feedback_submission_id: string;
        question_id: string;
        response_value: string | null;
        voice_file_url: string | null;
        transcription: string | null;
        transcription_status: string | null;
      } = {
        feedback_submission_id: feedback.id,
        question_id: 'nps_score',
        // Use the score from questionResponses if available, else use npsScore
        response_value: (questionResponses && questionResponses['nps_score']) 
                       ? questionResponses['nps_score']
                       : (npsScore !== null ? npsScore.toString() : null),
        voice_file_url: null,
        transcription: null,
        transcription_status: null
      };
  
  // Add voice file if present - prefer nps_score but fall back to nps_feedback
  if (questionVoiceFiles['nps_score']) {
    npsEntry.voice_file_url = questionVoiceFiles['nps_score'];
    npsEntry.transcription_status = 'pending';
  } else if (questionVoiceFiles['nps_feedback']) {
    npsEntry.voice_file_url = questionVoiceFiles['nps_feedback'];
    npsEntry.transcription_status = 'pending';
  }
  
  // Add text feedback if present
  if (feedbackText) {
    npsEntry.transcription = feedbackText;
    if (npsEntry.transcription_status === 'pending') {
      // If we have voice recording pending transcription, make note in status
      npsEntry.transcription_status = 'pending_with_text';
    } else {
      npsEntry.transcription_status = 'completed';
    }
  }
  
  questionResponsesArray.push(npsEntry);
  
  // Remove nps_feedback from the voiceQuestionIds since we're handling it specially
  const npsIndex = voiceQuestionIds.indexOf('nps_feedback');
  if (npsIndex > -1) {
    voiceQuestionIds.splice(npsIndex, 1);
  }
  const npsScoreIndex = voiceQuestionIds.indexOf('nps_score');
  if (npsScoreIndex > -1) {
    voiceQuestionIds.splice(npsScoreIndex, 1);
  }
}
      
      // Add other text responses
      if (questionResponses) {
        for (const [questionId, value] of Object.entries(questionResponses)) {
          // Skip NPS entries as we've already processed them
          if (questionId === 'nps_feedback' || questionId === 'nps_score') {
            continue;
          }
          
          questionResponsesArray.push({
            feedback_submission_id: feedback.id,
            question_id: questionId,
            response_value: typeof value === 'string' ? value : JSON.stringify(value),
            voice_file_url: questionVoiceFiles[questionId] || null,
            transcription: null,
            transcription_status: questionVoiceFiles[questionId] ? 'pending' : null
          });
        }
      }
      
      // Add voice-only responses (if not already in text responses)
      for (const questionId of Object.keys(questionVoiceFiles)) {
        // Skip nps entries as we've already processed them
        if (questionId === 'nps_feedback' || questionId === 'nps_score') {
          continue;
        }
        
        // Skip if we've already added this question
        if (questionResponses && questionResponses[questionId]) {
          continue;
        }
        
        questionResponsesArray.push({
          feedback_submission_id: feedback.id,
          question_id: questionId,
          response_value: null,
          voice_file_url: questionVoiceFiles[questionId] || null,
          transcription: null,
          transcription_status: 'pending' as string | null // Fix the type here
        });
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

    // Trigger transcription job asynchronously if needed
    if (pendingVoiceTranscriptions.length > 0) {
      try {
        console.log('Triggering async transcription for question voice recordings');
        
        // Create a direct call to the service role client instead of using fetch
        // This avoids the socket error issue with the fetch API in serverless functions
        const { error: transcriptionError } = await serviceRoleClient
          .from('question_responses')
          .update({ 
            transcription_status: 'pending_retry' 
          })
          .eq('feedback_submission_id', feedback.id)
          .in('question_id', pendingVoiceTranscriptions);
        
        if (transcriptionError) {
          console.error('Error marking questions for transcription:', transcriptionError);
        } else {
          console.log('Successfully marked questions for transcription');
          
          // Use a more reliable method to trigger the transcription
          // This avoids network requests within the same serverless function
          try {
            // Try to trigger directly if possible
            const directResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/process-transcriptions`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                feedbackId: feedback.id,
                questionIds: pendingVoiceTranscriptions
              }),
              // Add timeout to prevent hanging
              signal: AbortSignal.timeout(2000) // 2-second timeout
            });
            
            console.log('Direct transcription response status:', directResponse.status);
          } catch (fetchError) {
            // If direct trigger fails, that's okay - we've already marked the records
            console.log('Direct transcription trigger failed, will be processed by background job');
            console.error('Fetch error details:', fetchError);
          }
        }
      } catch (error) {
        console.error('Error starting transcription process:', error);
        // This is not critical - transcriptions will be retried later
      }
    }    

    console.log('Feedback submission process complete');
    return NextResponse.json({ 
      success: true,
      feedback,
      hasQuestionResponses: !!questionResponses || Object.keys(questionVoiceFiles).length > 0,
      transcriptionsInProgress: pendingVoiceTranscriptions.length > 0
    });
  } catch (error) {
    console.error('Error processing feedback:', error);
    return NextResponse.json(
      { error: 'Failed to process feedback' },
      { status: 500 }
    );
  }
}