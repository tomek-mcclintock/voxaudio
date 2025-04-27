// src/app/api/update-nps-score/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateUniqueSubmissionId } from '@/lib/utils';

export const runtime = 'edge';

// Create service role client to bypass RLS
const serviceRoleClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    const companyId = formData.get('companyId') as string;
    const campaignId = formData.get('campaignId') as string;
    const npsScoreStr = formData.get('npsScore') as string;
    const npsScore = npsScoreStr ? parseInt(npsScoreStr) : null;
    const orderId = formData.get('orderId') as string;
    const clientId = formData.get('clientId') as string;
    
    if (!companyId || !campaignId || npsScore === null) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Extract additional parameters
    const additionalParamsStr = formData.get('additionalParams') as string | null;
    let metadata = {};
    if (additionalParamsStr) {
      try {
        metadata = JSON.parse(additionalParamsStr);
      } catch (e) {
        console.error('Failed to parse additionalParams:', e);
      }
    }
    
    // Generate a unique submission identifier
    const submissionData = {
      orderId,
      companyId,
      campaignId,
      additionalParams: metadata,
      clientId
    };
    
    const submissionId = generateUniqueSubmissionId(submissionData);
    console.log(`Generated submission ID: ${submissionId}`);
    
    // Check for existing submissions with this unique ID
    const { data: existingSubmission, error: queryError } = await serviceRoleClient
      .from('feedback_submissions')
      .select('id, metadata')
      .eq('submission_identifier', submissionId)
      .maybeSingle();
    
    let feedbackSubmissionId;
    
    if (existingSubmission) {
      console.log(`Found existing submission: ${existingSubmission.id}`);
      // Update the existing submission metadata
      const { error: updateError } = await serviceRoleClient
        .from('feedback_submissions')
        .update({ 
          metadata: metadata,
          browser_client_id: clientId // Ensure we set the client ID
        })
        .eq('id', existingSubmission.id);
        
      if (updateError) {
        throw updateError;
      }
      
      feedbackSubmissionId = existingSubmission.id;
    } else {
      console.log(`Creating new submission with client ID: ${clientId}`);
      // Create a new submission
      const { data: newSubmission, error: insertError } = await serviceRoleClient
        .from('feedback_submissions')
        .insert({
          company_id: companyId,
          campaign_id: campaignId,
          order_id: orderId || null,
          metadata: metadata,
          processed: false,
          submission_identifier: submissionId,
          browser_client_id: clientId // Make sure to set the client ID
        })
        .select()
        .single();
        
      if (insertError) {
        throw insertError;
      }
      
      feedbackSubmissionId = newSubmission.id;
    }
    
    // Now handle the question_responses entry for the NPS score
    if (feedbackSubmissionId) {
      // Check for existing NPS score in question_responses
      const { data: existingNPS, error: npsCheckError } = await serviceRoleClient
        .from('question_responses')
        .select('id')
        .eq('feedback_submission_id', feedbackSubmissionId)
        .eq('question_id', 'nps_score')
        .maybeSingle();
        
      if (npsCheckError) {
        console.error('Error checking existing NPS response:', npsCheckError);
      } 
      
      if (existingNPS) {
        // Update existing NPS score
        await serviceRoleClient
          .from('question_responses')
          .update({ response_value: npsScore.toString() })
          .eq('id', existingNPS.id);
        
        console.log(`Updated existing NPS score: ${existingNPS.id}`);
      } else {
        // Create new NPS score entry
        const { data: newNps, error: npsInsertError } = await serviceRoleClient
          .from('question_responses')
          .insert([{
            feedback_submission_id: feedbackSubmissionId,
            question_id: 'nps_score',
            response_value: npsScore.toString(),
            transcription_status: 'completed'
          }])
          .select()
          .single();
          
        if (npsInsertError) {
          console.error('Error inserting NPS score:', npsInsertError);
        } else {
          console.log(`Created new NPS score entry: ${newNps.id}`);
        }
      }
    }
    
    return NextResponse.json({ 
      success: true,
      submissionId: feedbackSubmissionId
    });
  } catch (error) {
    console.error('Error updating NPS score:', error);
    return NextResponse.json(
      { error: 'Failed to update NPS score' },
      { status: 500 }
    );
  }
}