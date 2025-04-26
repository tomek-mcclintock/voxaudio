// src/app/api/campaigns/details/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

// Define types for our data structures
interface QuestionResponse {
  id: string;
  feedback_submission_id: string;
  question_id: string;
  response_value: string | null;
  transcription: string | null;
  voice_file_url: string | null;
  transcription_status: string | null;
}

interface FeedbackSubmission {
  created_at: string;
  order_id: string | null;
  nps_score: number | null;
  transcription: string | null;
  sentiment: string | null;
  question_responses: QuestionResponse[] | null;
}

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
      .select(`
        *,
        questions
      `)
      .eq('id', params.id)
      .eq('company_id', userData.company_id)
      .single();

    if (campaignError) {
      console.error('Error fetching campaign:', campaignError);
      throw campaignError;
    }

    console.log('Retrieved campaign:', campaign);

    // Get feedback for this campaign - without comments in the query string
    const { data: feedback, error: feedbackError } = await supabase
      .from('feedback_submissions')
      .select(`
        created_at,
        order_id,
        nps_score,
        transcription,
        sentiment,
        question_responses (*)
      `)
      .eq('campaign_id', params.id)
      .eq('company_id', userData.company_id)
      .order('created_at', { ascending: false });

    if (feedbackError) {
      console.error('Error fetching feedback:', feedbackError);
      throw feedbackError;
    }

    // Process feedback to ensure all fields are available regardless of storage location
    const processedFeedback = (feedback || []).map((item: FeedbackSubmission) => {
      // Check for NPS score in question_responses
      const npsScoreResponse = item.question_responses?.find((r: QuestionResponse) => r.question_id === 'nps_score');
      const npsScore = npsScoreResponse && npsScoreResponse.response_value
        ? parseInt(npsScoreResponse.response_value) 
        : item.nps_score; // Fallback to legacy field
      
      // Check for NPS feedback text/transcription in question_responses
      const npsFeedbackResponse = item.question_responses?.find((r: QuestionResponse) => r.question_id === 'nps_feedback');
      const transcription = 
        (npsFeedbackResponse?.transcription) || 
        (npsFeedbackResponse?.response_value) || 
        item.transcription;
      
      // Create a new object with all the original properties plus our updated ones
      return {
        ...item,
        nps_score: npsScore,
        transcription
      };
    });

    return NextResponse.json({
      campaign,
      feedback: processedFeedback
    });

  } catch (error) {
    console.error('Error in campaign details API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaign details' },
      { status: 500 }
    );
  }
}