// src/app/api/campaigns/[id]/save-analysis/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const campaignId = params.id;
    const { topicAnalysis } = await request.json();
    
    // Get current user's company
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      throw new Error(`Authentication error: ${authError.message}`);
    }

    if (!user?.email) {
      throw new Error('User not authenticated or email not available');
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('company_id')
      .eq('email', user.email)
      .single();

    if (userError) {
      throw new Error(`User data error: ${userError.message}`);
    }
    
    // Get campaign details to ensure access is authorized
    const { data: campaign, error: campaignError } = await supabase
      .from('feedback_campaigns')
      .select('id, company_id')
      .eq('id', campaignId)
      .eq('company_id', userData.company_id)
      .single();

    if (campaignError) {
      throw new Error(`Campaign fetch error: ${campaignError.message}`);
    }
    
    // Save the topic analysis to the campaign
    const { error: updateError } = await supabase
      .from('feedback_campaigns')
      .update({ topic_analysis: topicAnalysis })
      .eq('id', campaignId);
      
    if (updateError) {
      throw new Error(`Failed to save analysis: ${updateError.message}`);
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error saving analysis:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to save analysis',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}