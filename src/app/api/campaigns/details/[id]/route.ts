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

    // Get campaign details - UPDATED: Only select fields that actually exist
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

    // Get feedback submissions for this campaign
    const { data: submissions, error: submissionsError } = await supabase
      .from('feedback_submissions')
      .select(`
        id,
        created_at,
        order_id,
        sentiment
      `)
      .eq('campaign_id', params.id)
      .eq('company_id', userData.company_id)
      .order('created_at', { ascending: false });

    if (submissionsError) {
      console.error('Error fetching submissions:', submissionsError);
      throw submissionsError;
    }

    // Get all question responses for all feedback submissions
    if (!submissions || submissions.length === 0) {
      return NextResponse.json({
        campaign,
        feedback: []
      });
    }

    const submissionIds = submissions.map(sub => sub.id);
    
    const { data: allResponses, error: responsesError } = await supabase
      .from('question_responses')
      .select('*')
      .in('feedback_submission_id', submissionIds);

    if (responsesError) {
      console.error('Error fetching question responses:', responsesError);
      throw responsesError;
    }

    // Map responses to their submissions
    const processedFeedback = submissions.map(submission => {
      // Find all responses for this submission
      const responses = allResponses?.filter(
        response => response.feedback_submission_id === submission.id
      ) || [];

      // Find NPS score response
      const npsScoreResponse = responses.find(r => r.question_id === 'nps_score');
      const npsScore = npsScoreResponse?.response_value 
        ? parseInt(npsScoreResponse.response_value) 
        : null;
      
      // Use the transcription from the NPS response (if exists)
      const transcription = npsScoreResponse?.transcription || null;

      return {
        ...submission,
        nps_score: npsScore,
        transcription,
        question_responses: responses
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