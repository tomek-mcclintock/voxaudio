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
    console.log('NPS Update - Raw FormData entries:');
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
        console.log('NPS Update - Additional parameters:', metadata);
      } catch (e) {
        console.error('Failed to parse additionalParams:', e);
      }
    }
    
    // IMPROVED DUPLICATE DETECTION: Check for existing submissions with the same metadata
    let existingSubmission = null;
    
    if (metadata && Object.keys(metadata).length > 0) {
      console.log('NPS Update - Checking for existing submissions with same metadata');
      console.log('Current submission metadata:', JSON.stringify(metadata));
      
      const { data: existingSubmissions, error: queryError } = await serviceRoleClient
        .from('feedback_submissions')
        .select('id, metadata, created_at')
        .eq('company_id', companyId)
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (queryError) {
        console.error('Error querying existing submissions:', queryError);
      } else if (existingSubmissions && existingSubmissions.length > 0) {
        console.log(`Found ${existingSubmissions.length} previous submissions to check`);
        
        // Check each submission's metadata for an exact match
        for (const submission of existingSubmissions) {
          if (submission.metadata && Object.keys(submission.metadata).length > 0) {
            console.log(`Comparing with submission ${submission.id}`);
            
            const metadataSignature = createMetadataSignature(metadata);
            const existingSignature = createMetadataSignature(submission.metadata);
            
            console.log('Current signature:', metadataSignature);
            console.log('Existing signature:', existingSignature);
            
            if (metadataSignature === existingSignature) {
              console.log(`Metadata MATCH found for submission: ${submission.id}`);
              existingSubmission = submission;
              break;
            }
          }
        }
      }
    }
    
    if (existingSubmission) {
      // Update the existing submission
      console.log(`Updating existing submission: ${existingSubmission.id}`);
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

/**
 * Creates a comprehensive hash/signature from the entire metadata object
 * @param metadata The metadata object to hash
 * @returns A string representing the unique signature of the metadata
 */
function createMetadataSignature(metadata: any): string | null {
  if (!metadata || Object.keys(metadata).length === 0) {
    return null;
  }
  
  // Sort keys for consistent ordering
  const sortedKeys = Object.keys(metadata).sort();
  
  // Create a string of all key-value pairs
  return sortedKeys
    .filter(key => metadata[key] !== null && metadata[key] !== undefined && metadata[key] !== '')
    .map(key => `${key}:${metadata[key]}`)
    .join('|');
}
