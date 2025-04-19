// src/app/api/process-transcriptions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { transcribeAudio } from '@/lib/openai';

// Set maximum duration for this function
export const maxDuration = 300; // 5 minutes (or maximum allowed by your Vercel plan)

// Create service role client to bypass RLS
const serviceRoleClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(request: NextRequest) {
  try {
    const { feedbackId, questionIds } = await request.json();
    
    console.log(`Processing transcriptions for feedback: ${feedbackId}, questions: ${questionIds}`);
    
    // Get the question responses that need to be processed
    const { data: responses, error: fetchError } = await serviceRoleClient
      .from('question_responses')
      .select('id, question_id, voice_file_url, transcription_status')
      .eq('feedback_submission_id', feedbackId)
      .in('question_id', questionIds)
      .eq('transcription_status', 'pending');
      
    if (fetchError) {
      console.error('Error fetching responses:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch responses' }, { status: 500 });
    }
    
    if (!responses || responses.length === 0) {
      console.log('No pending transcriptions found');
      return NextResponse.json({ success: true, message: 'No transcriptions to process' });
    }
    
    console.log(`Found ${responses.length} responses to process`);
    
    // Process each response
    for (const response of responses) {
      try {
        // Skip if no voice file URL
        if (!response.voice_file_url) {
          console.log(`No voice file URL for response ${response.id}, skipping`);
          continue;
        }
        
        console.log(`Processing transcription for response ${response.id}, file: ${response.voice_file_url}`);
        
        // Update status to processing
        await serviceRoleClient
          .from('question_responses')
          .update({ transcription_status: 'processing' })
          .eq('id', response.id);
        
        // Get the audio file from S3
        const { data: fileData, error: fileError } = await serviceRoleClient.storage
          .from('voice-recordings') // Make sure this matches your bucket name
          .download(response.voice_file_url);
          
        if (fileError || !fileData) {
          console.error(`Error downloading file: ${response.voice_file_url}`, fileError);
          await serviceRoleClient
            .from('question_responses')
            .update({ transcription_status: 'file_error' })
            .eq('id', response.id);
          continue;
        }
        
        // Convert to buffer
        const buffer = await fileData.arrayBuffer();
        
        // Transcribe the audio
        console.log(`Transcribing audio for response ${response.id}`);
        const transcription = await transcribeAudio(Buffer.from(buffer));
        console.log(`Transcription complete for response ${response.id}`);
        
        // Update the response with the transcription
        await serviceRoleClient
          .from('question_responses')
          .update({ 
            transcription: transcription,
            transcription_status: 'completed'
          })
          .eq('id', response.id);
          
        console.log(`Successfully transcribed response ${response.id}`);
        
      } catch (err) {
        console.error(`Error processing response ${response.id}:`, err);
        // Mark as failed but don't stop processing other responses
        await serviceRoleClient
          .from('question_responses')
          .update({ transcription_status: 'failed' })
          .eq('id', response.id);
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      processed: responses.length 
    });
    
  } catch (error) {
    console.error('Error in transcription processing:', error);
    return NextResponse.json(
      { error: 'Failed to process transcriptions' },
      { status: 500 }
    );
  }
}