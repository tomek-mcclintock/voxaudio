// src/app/api/campaigns/[id]/analysis/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const campaignId = params.id;
    
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
    
    // Get campaign with topic analysis
    const { data: campaign, error: campaignError } = await supabase
      .from('feedback_campaigns')
      .select('id, topic_analysis')
      .eq('id', campaignId)
      .eq('company_id', userData.company_id)
      .single();

    if (campaignError) {
      throw new Error(`Campaign fetch error: ${campaignError.message}`);
    }
    
    return NextResponse.json({
      topicAnalysis: campaign.topic_analysis
    });
  } catch (error: any) {
    console.error('Error fetching analysis:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch analysis',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}