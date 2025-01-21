import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function GET() {
  try {
    // Fetch last 30 days of summaries
    const { data: summaries, error: summariesError } = await supabase
      .from('daily_summaries')
      .select('*')
      .order('date', { ascending: false })
      .limit(30);

    if (summariesError) throw summariesError;

    // Fetch recent feedback entries
    const { data: feedback, error: feedbackError } = await supabase
      .from('feedback_submissions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (feedbackError) throw feedbackError;

    return NextResponse.json({
      dailySummaries: summaries || [],
      recentFeedback: feedback || []
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}