// src/app/api/process-transcriptions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { transcribeAudio } from '@/lib/openai';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

// Set maximum duration for this function
export const maxDuration = 300; // 5 minutes (or maximum allowed by your Vercel plan)

// Create service role client to bypass RLS
const serviceRoleClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Create AWS S3 client
const s3 = new S3Client({
  region: process.env.AWS_REGION || '',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

// Helper function to convert stream to buffer
async function streamToBuffer(stream: any): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    
    // Handle different types of streams
    if (stream instanceof Readable) {
      // Node.js Readable stream
      stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      stream.on('error', (err) => reject(err));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
    } else if (typeof stream.transformToByteArray === 'function') {
      // AWS SDK v3 stream with transformToByteArray method
      stream.transformToByteArray()
        .then((data: Uint8Array) => resolve(Buffer.from(data)))
        .catch(reject);
    } else if (typeof stream.transformToString === 'function') {
      // AWS SDK v3 stream with transformToString method
      stream.transformToString()
        .then((data: string) => resolve(Buffer.from(data)))
        .catch(reject);
    } else if (stream.getReader) {
      // Web ReadableStream
      const reader = stream.getReader();
      const readChunk = async () => {
        try {
          const result = await reader.read();
          // Properly type the result with explicit interface
          const { done, value } = result as { done: boolean; value: Uint8Array };
          
          if (done) {
            resolve(Buffer.concat(chunks));
            return;
          }
          chunks.push(Buffer.from(value));
          readChunk();
        } catch (error) {
          reject(error);
        }
      };
      readChunk();
    } else {
      reject(new Error('Unknown stream type'));
    }
  });
}

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
          
        try {
          // Get the audio file directly from AWS S3
          console.log(`Attempting to download from S3: bucket='ruggable-feedback-recordings', key='${response.voice_file_url}'`);
          
          const s3Response = await s3.send(
            new GetObjectCommand({
              Bucket: 'ruggable-feedback-recordings',
              Key: response.voice_file_url,
            })
          );
          
          // Get the file content from the stream
          if (!s3Response.Body) {
            throw new Error('Empty response body from S3');
          }
          
          // Convert stream to buffer using our helper function
          console.log('Converting S3 response stream to buffer');
          const buffer = await streamToBuffer(s3Response.Body);
          
          console.log(`Successfully downloaded file, size: ${buffer.length} bytes`);
          
          // Transcribe the audio
          console.log(`Transcribing audio for response ${response.id}`);
          const transcription = await transcribeAudio(buffer);
          console.log(`Transcription complete for response ${response.id}: "${transcription.substring(0, 50)}..."`);
          
          // Update the response with the transcription
          await serviceRoleClient
            .from('question_responses')
            .update({ 
              transcription: transcription,
              transcription_status: 'completed'
            })
            .eq('id', response.id);
            
          console.log(`Successfully updated database with transcription for response ${response.id}`);
        } catch (s3Error) {
          console.error(`Error accessing S3 for response ${response.id}:`, s3Error);
          
          // Mark as file error
          await serviceRoleClient
            .from('question_responses')
            .update({ transcription_status: 'file_error' })
            .eq('id', response.id);
            
          // Continue to next response
          continue;
        }
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