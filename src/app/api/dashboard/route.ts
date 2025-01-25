import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Get current user's session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    // Get user's company_id
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('company_id')
      .eq('email', user?.email)
      .single();

    if (userError) throw userError;

    const companyId = userData.company_id;
    const now = new Date().toISOString();
    
    console.log('Fetching dashboard data for company:', companyId);
    
    // Fetch last 30 days of summaries for this company
    const { data: summaries, error: summariesError } = await supabase
      .from('daily_summaries')
      .select('*')
      .eq('company_id', companyId)
      .order('date', { ascending: false })
      .limit(30)
      .lte('created_at', now);

    if (summariesError) {
      console.error('Summaries error:', summariesError);
      throw summariesError;
    }

    // Fetch recent feedback for this company
    const { data: feedback, error: feedbackError } = await supabase
      .from('feedback_submissions')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(10)
      .lte('created_at', now);

    if (feedbackError) {
      console.error('Feedback error:', feedbackError);
      throw feedbackError;
    }

    // Add cache control headers
    const headers = new Headers({
      'Cache-Control': 'no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    });

    return new NextResponse(JSON.stringify({
      companyId,
      timestamp: now,
      dailySummaries: summaries || [],
      recentFeedback: feedback || []
    }), {
      headers,
      status: 200,
    });

  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}