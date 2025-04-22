// src/app/api/check-pending-transcriptions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create service role client to bypass RLS
const serviceRoleClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function GET(request: NextRequest) {
  try {
    // Find all pending, failed, and file_error transcriptions
    const { data: pendingResponses, error: fetchError } = await serviceRoleClient
      .from('question_responses')
      .select('id, feedback_submission_id, question_id, transcription_status')
      .in('transcription_status', ['pending', 'pending_retry', 'failed', 'file_error'])
      .limit(20); // Process in batches
      
    if (fetchError) {
      return NextResponse.json({ error: 'Failed to fetch pending transcriptions' }, { status: 500 });
    }
    
    if (!pendingResponses || pendingResponses.length === 0) {
      return NextResponse.json({ message: 'No pending or failed transcriptions found' });
    }
    
    console.log(`Found ${pendingResponses.length} transcriptions to retry:`, 
      pendingResponses.map(r => ({ id: r.id, status: r.transcription_status })));
    
    // First, mark all as pending again
    const responseIds = pendingResponses.map(r => r.id);
    const { error: updateError } = await serviceRoleClient
      .from('question_responses')
      .update({ transcription_status: 'pending' })
      .in('id', responseIds);
      
    if (updateError) {
      console.error('Error resetting transcription status:', updateError);
      return NextResponse.json({ error: 'Failed to reset transcription status' }, { status: 500 });
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
    for (const [feedbackId, questionIds] of submissionMap.entries()) {
      try {
        console.log(`Processing feedbackId: ${feedbackId}, questions: ${questionIds}`);
        
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/process-transcriptions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            feedbackId,
            questionIds
          })
        });
        
        const responseText = await response.text();
        
        results.push({
          feedbackId,
          questionCount: questionIds.length,
          status: response.status,
          success: response.ok,
          responseText: responseText.substring(0, 200) // Include part of the response for debugging
        });
      } catch (error) {
        console.error(`Error processing feedbackId ${feedbackId}:`, error);
        results.push({
          feedbackId,
          questionCount: questionIds.length,
          error: error instanceof Error ? error.message : String(error),
          success: false
        });
      }
    }
    
    return NextResponse.json({ 
      processed: results,
      total: pendingResponses.length
    });
    
  } catch (error) {
    console.error('Error processing transcriptions:', error);
    return NextResponse.json({ 
      error: 'Failed to process transcriptions',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}