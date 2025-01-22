import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Tell Next.js this is a dynamic route
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    // Get current timestamp for the query
    const now = new Date().toISOString();
    
    console.log('Fetching dashboard data at:', now);
    
    // Fetch last 30 days of summaries with timestamp filter
    const { data: summaries, error: summariesError } = await supabase
      .from('daily_summaries')
      .select('*')
      .order('date', { ascending: false })
      .limit(30)
      .lte('created_at', now); // Only get entries up to now

    if (summariesError) {
      console.error('Summaries error:', summariesError);
      throw summariesError;
    }

    // Fetch recent feedback with timestamp filter
    const { data: feedback, error: feedbackError } = await supabase
      .from('feedback_submissions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)
      .lte('created_at', now); // Only get entries up to now

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