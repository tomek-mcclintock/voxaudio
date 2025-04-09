// src/app/api/update-nps-score/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
    console.log('Raw FormData entries:');
    for (const pair of formData.entries()) {
      console.log(pair[0], ':', pair[1]);
    }
    
    const companyId = formData.get('companyId') as string;
    const campaignId = formData.get('campaignId') as string;
    const npsScoreStr = formData.get('npsScore') as string;
    const npsScore = npsScoreStr ? parseInt(npsScoreStr) : null;
    const orderId = formData.get('orderId') as string;
    
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
      } catch (e) {
        console.error('Failed to parse additionalParams:', e);
      }
    }
    
    console.log(`Checking for existing submission for company: ${companyId}, campaign: ${campaignId}, order: ${orderId}`);
    
    // Check if we already have a submission for this order
    const { data: existingSubmissions, error: queryError } = await serviceRoleClient
      .from('feedback_submissions')
      .select('id')
      .eq('company_id', companyId)
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (queryError) {
      console.error('Error querying existing submissions:', queryError);
      throw queryError;
    }
    
    if (existingSubmissions && existingSubmissions.length > 0) {
      // Update the existing submission
      console.log(`Updating existing submission: ${existingSubmissions[0].id}`);
      const { error: updateError } = await serviceRoleClient
        .from('feedback_submissions')
        .update({ 
          nps_score: npsScore
        })
        .eq('id', existingSubmissions[0].id);
        
      if (updateError) {
        console.error('Error updating NPS score:', updateError);
        throw updateError;
      }
    } else {
      // Create a new submission
      console.log('Creating new submission with NPS score only');
      const { error: insertError } = await serviceRoleClient
        .from('feedback_submissions')
        .insert({
          company_id: companyId,
          campaign_id: campaignId,
          order_id: orderId || null,
          nps_score: npsScore,
          metadata: metadata,
          processed: false,
        });
        
      if (insertError) {
        console.error('Error creating NPS score submission:', insertError);
        throw insertError;
      }
    }
    
    console.log('NPS score successfully updated');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating NPS score:', error);
    return NextResponse.json(
      { error: 'Failed to update NPS score' },
      { status: 500 }
    );
  }
}