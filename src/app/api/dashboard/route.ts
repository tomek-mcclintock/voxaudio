import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function GET() {
  try {
    console.log('Fetching dashboard data...');
    
    // Fetch last 30 days of summaries
    const { data: summaries, error: summariesError } = await supabase
      .from('daily_summaries')
      .select('*')
      .order('date', { ascending: false })
      .limit(30);

    if (summariesError) {
      console.error('Summaries error:', summariesError);
      throw summariesError;
    }

    console.log('Fetched summaries:', summaries);

    // Fetch recent feedback entries
    const { data: feedback, error: feedbackError } = await supabase
      .from('feedback_submissions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (feedbackError) {
      console.error('Feedback error:', feedbackError);
      throw feedbackError;
    }

    console.log('Fetched feedback:', feedback);

    // Add no-cache headers
    const headers = {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store'
    };

    return NextResponse.json({
      dailySummaries: summaries || [],
      recentFeedback: feedback || []
    }, { headers });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}