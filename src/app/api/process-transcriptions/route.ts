// src/app/api/process-transcriptions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { transcribeWithAssemblyAI } from '@/lib/assembly-ai'; // Update import
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
  // Existing streamToBuffer function code...
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    
    try {
      // For AWS SDK v3 Body which might be a ReadableStream
      if (stream && typeof stream.transformToByteArray === 'function') {
        stream.transformToByteArray()
          .then((data: Uint8Array) => {
            console.log("Successfully used transformToByteArray, length:", data.length);
            resolve(Buffer.from(data));
          })
          .catch((err: any) => {
            console.error("Error in transformToByteArray:", err);
            reject(err);
          });
        return;
      }
      
      // For Node.js Readable stream
      if (stream && typeof stream.on === 'function') {
        stream.on('data', (chunk: any) => {
          console.log("Got chunk of size:", chunk.length);
          chunks.push(Buffer.from(chunk));
        });
        stream.on('error', (err: any) => {
          console.error("Stream error:", err);
          reject(err);
        });
        stream.on('end', () => {
          console.log("Stream ended, total chunks:", chunks.length);
          resolve(Buffer.concat(chunks));
        });
        return;
      }
      
      // For browser ReadableStream
      if (stream && typeof stream.getReader === 'function') {
        const reader = stream.getReader();
        const readChunk = async () => {
          try {
            const result = await reader.read();
            // Properly type the result with explicit interface
            const { done, value } = result as { done: boolean; value: Uint8Array };
            
            if (done) {
              console.log("ReadableStream done, total chunks:", chunks.length);
              resolve(Buffer.concat(chunks));
              return;
            }
            console.log("ReadableStream chunk size:", value.length);
            chunks.push(Buffer.from(value));
            readChunk();
          } catch (error) {
            console.error("ReadableStream error:", error);
            reject(error);
          }
        };
        readChunk();
        return;
      }
      
      // If we get here, we couldn't handle the stream
      reject(new Error(`Unrecognized stream type: ${typeof stream}`));
    } catch (error) {
      console.error("Fatal error in streamToBuffer:", error);
      reject(error);
    }
  });
}

export async function POST(request: NextRequest) {
  try {
    const { feedbackId, questionIds, forceReprocess = false } = await request.json();
    
    console.log(`Processing transcriptions for feedback: ${feedbackId}, questions: ${questionIds}, forceReprocess: ${forceReprocess}`);
    
    // Get the question responses that need to be processed
    let query = serviceRoleClient
      .from('question_responses')
      .select('id, question_id, voice_file_url, transcription_status')
      .eq('feedback_submission_id', feedbackId);
      
    // Apply question_id filter if provided
    if (questionIds && questionIds.length > 0) {
      query = query.in('question_id', questionIds);
    } 
    // If not forcing reprocess, only get pending ones
    else if (!forceReprocess) {
      query = query.eq('transcription_status', 'pending');
    }
    
    const { data: responses, error: fetchError } = await query;
      
    if (fetchError) {
      console.error('Error fetching responses:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch responses' }, { status: 500 });
    }
    
    console.log(`Query results: Found ${responses?.length || 0} responses to process`);
    if (responses && responses.length > 0) {
      console.log('Response details:', responses.map(r => ({
        id: r.id,
        question_id: r.question_id,
        status: r.transcription_status,
        has_file: !!r.voice_file_url
      })));
    }
    
    if (!responses || responses.length === 0) {
      console.log('No transcriptions found to process');
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
        
        // Log the voice file URL for debugging
        console.log(`Processing voice file: ${response.voice_file_url}`);
        
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
          
          console.log('S3 response received, Body type:', typeof s3Response.Body, s3Response.Body.constructor ? s3Response.Body.constructor.name : 'unknown');
          
          // Convert stream to buffer using our helper function
          console.log('Converting S3 response stream to buffer');
          const buffer = await streamToBuffer(s3Response.Body);
          
          console.log(`Successfully downloaded file, size: ${buffer.length} bytes`);
          
          // Transcribe the audio using Assembly AI instead of OpenAI
          console.log(`Transcribing audio for response ${response.id} with Assembly AI`);
          const transcription = await transcribeWithAssemblyAI(buffer);
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
          console.error(`Error accessing S3 or transcribing for response ${response.id}:`, s3Error);
          console.error(`Error details: ${s3Error instanceof Error ? s3Error.message : 'Unknown error'}`);
          
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