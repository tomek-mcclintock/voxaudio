// src/app/api/dashboard/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

// Add type definition for daily summaries
interface DailySummary {
  id: string;
  company_id: string;
  date: string;
  total_responses: number;
  voice_responses: number;
  created_at: string;
  updated_at: string;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('company_id')
      .eq('email', user?.email)
      .single();

    if (userError) throw userError;

    const companyId = userData.company_id;
    const now = new Date();
    
    // Calculate date 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);
    
    // Explicitly type summaries as empty array of DailySummary
    const summaries: DailySummary[] = [];
    
    // Fetch feedback with question responses
    const { data: feedback, error: feedbackError } = await supabase
      .from('feedback_submissions')
      .select(`
        *,
        feedback_campaigns!inner (
          name,
          questions
        ),
        question_responses (
          question_id,
          response_value,
          voice_file_url
        )
      `)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(1000)
      .lte('created_at', now.toISOString());

    if (feedbackError) {
      throw feedbackError;
    }

    const headers = new Headers({
      'Cache-Control': 'no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    });

    return new NextResponse(JSON.stringify({
      companyId,
      timestamp: now.toISOString(),
      dailySummaries: summaries,
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