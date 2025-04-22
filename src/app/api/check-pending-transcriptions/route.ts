// src/app/api/check-pending-transcriptions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create service role client to bypass RLS
const serviceRoleClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function GET(request: NextRequest) {
  // Add cache control headers to prevent caching
  const headers = new Headers({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  });

  try {
    // Check for specific IDs to process
    const specificId = request.nextUrl.searchParams.get('id');
    
    let query = serviceRoleClient
      .from('question_responses')
      .select('id, feedback_submission_id, question_id, transcription_status, voice_file_url');
    
    // If a specific ID is provided, only process that one
    if (specificId) {
      console.log(`Processing specific question response ID: ${specificId}`);
      query = query.eq('id', specificId);
    } else {
      // Otherwise, get all pending/failed
      query = query.in('transcription_status', ['pending', 'pending_retry', 'failed', 'file_error'])
        .limit(10); // Process in smaller batches
    }
    
    const { data: pendingResponses, error: fetchError } = await query;
      
    if (fetchError) {
      console.error('Error fetching responses:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch transcriptions' }, { status: 500, headers });
    }
    
    if (!pendingResponses || pendingResponses.length === 0) {
      return NextResponse.json({ message: 'No transcriptions found to process' }, { headers });
    }
    
    console.log(`Found ${pendingResponses.length} transcriptions to process:`, 
      pendingResponses.map(r => ({ id: r.id, status: r.transcription_status, url: r.voice_file_url })));
    
    // First, mark all as pending again
    const responseIds = pendingResponses.map(r => r.id);
    const { error: updateError } = await serviceRoleClient
      .from('question_responses')
      .update({ 
        transcription_status: 'pending',
        transcription: null // Clear any previous transcription
      })
      .in('id', responseIds);
      
    if (updateError) {
      console.error('Error resetting transcription status:', updateError);
      return NextResponse.json({ error: 'Failed to reset transcription status' }, { status: 500, headers });
    }
    
    // Group by feedback submission
    const submissionMap = new Map();
    pendingResponses.forEach(response => {
      if (!submissionMap.has(response.feedback_submission_id)) {
        submissionMap.set(response.feedback_submission_id, []);
      }
      submissionMap.get(response.feedback_submission_id).push(response.question_id);
    });
    
    // Trigger processing for each submission
    const results = [];
    const timestamp = Date.now(); // Add timestamp to prevent caching
    for (const [feedbackId, questionIds] of submissionMap.entries()) {
      try {
        console.log(`Processing feedbackId: ${feedbackId}, questions: ${questionIds}`);
        
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/process-transcriptions?t=${timestamp}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store'
          },
          body: JSON.stringify({
            feedbackId,
            questionIds,
            forceReprocess: true // Add a flag to force reprocessing
          })
        });
        
        let responseData;
        try {
          responseData = await response.json();
        } catch (e) {
          responseData = await response.text();
        }
        
        results.push({
          feedbackId,
          questionIds,
          status: response.status,
          success: response.ok,
          response: responseData
        });
      } catch (error) {
        console.error(`Error processing feedbackId ${feedbackId}:`, error);
        results.push({
          feedbackId,
          questionIds,
          error: error instanceof Error ? error.message : String(error),
          success: false
        });
      }
    }
    
    return NextResponse.json({ 
      timestamp: new Date().toISOString(),
      processed: results,
      total: pendingResponses.length
    }, { headers });
    
  } catch (error) {
    console.error('Error processing transcriptions:', error);
    return NextResponse.json({ 
      error: 'Failed to process transcriptions',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500, headers });
  }
}