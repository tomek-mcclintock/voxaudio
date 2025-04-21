// src/app/api/save-feedback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { uploadVoiceRecording } from '@/lib/s3';
import { transcribeAudio, analyzeFeedback } from '@/lib/openai';
import { generateUniqueSubmissionId } from '@/lib/utils';  // Add this import

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
    const audioFile = formData.get('audio') as Blob | null;
    const textFeedback = formData.get('textFeedback') as string | null;
    const questionResponsesStr = formData.get('questionResponses') as string | null;
    
    // New logging for audio availability
    if (audioFile) {
      console.log(`[${submissionAttemptId}] Main audio file detected: ${audioFile.size} bytes, type: ${audioFile.type}`);
    } else {
      console.log(`[${submissionAttemptId}] No main audio file in submission`);
    }
    
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
      hasAudio: !!audioFile,
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

    let voiceFileUrl = null;
    let transcription = null;
    let sentiment = null;

    // Process main audio feedback (related to NPS)
    if (audioFile) {
      try {
        console.log(`[${submissionAttemptId}] Processing main audio file...`);
        console.log(`[${submissionAttemptId}] Audio file type: ${audioFile.type}, size: ${audioFile.size} bytes`);
        const arrayBuffer = await audioFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        console.log(`[${submissionAttemptId}] Successfully converted audio to buffer, size: ${buffer.length} bytes`);
    
        console.log(`[${submissionAttemptId}] Uploading to S3...`);
        voiceFileUrl = await uploadVoiceRecording(buffer, `${companyId}/${campaignId}/${orderId || 'no-order-id'}`);
        console.log(`[${submissionAttemptId}] S3 upload complete:`, voiceFileUrl);
    
        console.log(`[${submissionAttemptId}] Transcribing audio...`);
        transcription = await transcribeAudio(buffer);
        console.log(`[${submissionAttemptId}] Transcription complete:`, transcription ? transcription.substring(0, 100) + '...' : 'No transcription');
    
        if (transcription) {
          console.log(`[${submissionAttemptId}] Analyzing feedback...`);
          const analysis = await analyzeFeedback(transcription);
          sentiment = analysis.sentiment;
          console.log(`[${submissionAttemptId}] Analysis complete:`, sentiment);
        }
      } catch (error) {
        console.error(`[${submissionAttemptId}] Error processing audio:`, error);
        // Log more details about the error
        if (error instanceof Error) {
          console.error(`[${submissionAttemptId}] Error name: ${error.name}, message: ${error.message}`);
          console.error(`[${submissionAttemptId}] Error stack:`, error.stack);
        }
        return NextResponse.json(
          { error: 'Failed to process audio', details: error instanceof Error ? error.message : String(error) },
          { status: 500 }
        );
      }
    }
    else if (textFeedback) {
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
    
    // Generate unique submission identifier
    const submissionData = {
      orderId: orderIdToSave,
      companyId,
      campaignId,
      additionalParams: metadata
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
      metadata: metadata,
      submission_identifier: submissionId  // Store the unique identifier
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

    // Process question voice recordings - MODIFIED for longer recordings
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


    // Save question responses - MODIFIED for pending transcriptions
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
      
      // Add text responses
      if (questionResponses) {
        for (const [questionId, value] of Object.entries(questionResponses)) {
          questionResponsesArray.push({
            feedback_submission_id: feedback.id,
            question_id: questionId,
            response_value: typeof value === 'string' ? value : JSON.stringify(value),
            voice_file_url: questionVoiceFiles[questionId] || null,
            transcription: null,  // Will be updated asynchronously
            transcription_status: questionVoiceFiles[questionId] ? 'pending' : null
          });
        }
      }
      
      // Add voice-only responses (if not already in text responses)
      for (const questionId of Object.keys(questionVoiceFiles)) {
        if (!questionResponses || !questionResponses[questionId]) {
          questionResponsesArray.push({
            feedback_submission_id: feedback.id,
            question_id: questionId,
            response_value: null, // No text response
            voice_file_url: questionVoiceFiles[questionId] || null,
            transcription: null, // Will be updated asynchronously
            transcription_status: 'pending'
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

    // Trigger transcription job asynchronously if needed
    if (pendingVoiceTranscriptions.length > 0) {
      try {
        console.log('Triggering async transcription for question voice recordings');
        fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/process-transcriptions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            feedbackId: feedback.id,
            questionIds: pendingVoiceTranscriptions
          }),
        }).catch(err => {
          // Log but don't block on errors
          console.error('Error triggering transcription job:', err);
        });
      } catch (error) {
        console.error('Error starting async transcription:', error);
        // Continue anyway - transcription will be handled later
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