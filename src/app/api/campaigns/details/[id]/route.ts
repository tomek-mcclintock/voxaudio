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

    // Get current user's company
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('company_id')
      .eq('email', user?.email)
      .single();

    if (userError) throw userError;

    // Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from('feedback_campaigns')
      .select('*')
      .eq('id', params.id)
      .eq('company_id', userData.company_id)
      .single();

    if (campaignError) {
      console.error('Error fetching campaign:', campaignError);
      throw campaignError;
    }

    // Get feedback for this campaign
    const { data: feedback, error: feedbackError } = await supabase
      .from('feedback_submissions')
      .select('created_at, nps_score, transcription, sentiment')
      .eq('campaign_id', params.id)
      .eq('company_id', userData.company_id)
      .order('created_at', { ascending: false });

    if (feedbackError) {
      console.error('Error fetching feedback:', feedbackError);
      throw feedbackError;
    }

    return NextResponse.json({
      campaign,
      feedback: feedback || []
    });

  } catch (error) {
    console.error('Error in campaign details API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaign details' },
      { status: 500 }
    );
  }
}