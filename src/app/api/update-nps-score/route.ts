// src/app/api/update-nps-score/route.ts (full file)

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
    
    // Log all FormData entries for debugging
    console.log('NPS Update - Raw FormData entries:');
    for (const pair of formData.entries()) {
      console.log(pair[0], ':', pair[1]);
    }
    
    const companyId = formData.get('companyId') as string;
    const campaignId = formData.get('campaignId') as string;
    const npsScoreStr = formData.get('npsScore') as string;
    const npsScore = npsScoreStr ? parseInt(npsScoreStr) : null;
    const orderId = formData.get('orderId') as string;
    const clientId = formData.get('clientId') as string;
    
    if (!companyId || !campaignId || npsScore === null) {
      console.error('Missing required fields for NPS update');
      return NextResponse.json(
        { error: 'Missing required fields: company ID, campaign ID, or NPS score' },
        { status: 400 }
      );
    }
    
    // Extract additional parameters
    const additionalParamsStr = formData.get('additionalParams') as string | null;
    let metadata = {};
    if (additionalParamsStr) {
      try {
        metadata = JSON.parse(additionalParamsStr);
        console.log('NPS Update - Additional parameters:', metadata);
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
      clientId // Add this line
    };
    
    const submissionId = generateUniqueSubmissionId(submissionData);
    console.log('Generated submission ID:', submissionId);
    
    // Check for existing submissions with this unique ID
    const { data: existingSubmission, error: queryError } = await serviceRoleClient
      .from('feedback_submissions')
      .select('id, nps_score, metadata')
      .eq('submission_identifier', submissionId)
      .maybeSingle();
    
    if (queryError) {
      console.error('Error querying existing submissions:', queryError);
      // Continue with submission anyway
    }
    
    if (existingSubmission) {
      // Update the existing submission
      console.log(`Updating existing submission with ID: ${existingSubmission.id}`);
      const { error: updateError } = await serviceRoleClient
        .from('feedback_submissions')
        .update({ 
          nps_score: npsScore,
          metadata: metadata  // Update metadata in case structure changed
        })
        .eq('id', existingSubmission.id);
        
      if (updateError) {
        console.error('Error updating NPS score:', updateError);
        throw updateError;
      }
      
      console.log('NPS score successfully updated for existing submission');
    } else {
      // Create a new submission
      console.log('Creating new submission with NPS score');
      const { data: newSubmission, error: insertError } = await serviceRoleClient
        .from('feedback_submissions')
        .insert({
          company_id: companyId,
          campaign_id: campaignId,
          order_id: orderId || null,
          nps_score: npsScore,
          metadata: metadata,
          processed: false,
          submission_identifier: submissionId  // Store the unique identifier
        })
        .select()
        .single();
        
      if (insertError) {
        console.error('Error creating NPS score submission:', insertError);
        throw insertError;
      }
      
      console.log('New submission created with ID:', newSubmission?.id);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating NPS score:', error);
    return NextResponse.json(
      { error: 'Failed to update NPS score' },
      { status: 500 }
    );
  }
}