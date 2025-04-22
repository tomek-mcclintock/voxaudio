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
    // Find all pending_retry transcriptions
    const { data: pendingResponses, error: fetchError } = await serviceRoleClient
      .from('question_responses')
      .select('id, feedback_submission_id, question_id')
      .in('transcription_status', ['pending', 'pending_retry'])
      .limit(10); // Process in batches
      
    if (fetchError) {
      return NextResponse.json({ error: 'Failed to fetch pending transcriptions' }, { status: 500 });
    }
    
    if (!pendingResponses || pendingResponses.length === 0) {
      return NextResponse.json({ message: 'No pending transcriptions found' });
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
        
        results.push({
          feedbackId,
          questionCount: questionIds.length,
          status: response.status,
          success: response.ok
        });
      } catch (error) {
        results.push({
          feedbackId,
          questionCount: questionIds.length,
          error: error instanceof Error ? error.message : String(error),
          success: false
        });
      }
    }
    
    return NextResponse.json({ processed: results });
    
  } catch (error) {
    return NextResponse.json({ error: 'Failed to process pending transcriptions' }, { status: 500 });
  }
}