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

// Helper function to split array into chunks
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log(`Starting campaign details fetch for ID: ${params.id}`);
  
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Get current user's company
    console.log('Fetching user data...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      console.error('Auth error:', authError);
      throw authError;
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('company_id')
      .eq('email', user?.email)
      .single();

    if (userError) {
      console.error('User error:', userError);
      throw userError;
    }

    console.log(`User company ID: ${userData.company_id}`);

    // Get campaign details
    console.log('Fetching campaign...');
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

    console.log('Campaign fetched successfully:', campaign.name);

    // Get feedback submissions for this campaign - LIMIT to most recent 100 for performance
    console.log('Fetching feedback submissions...');
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
      .order('created_at', { ascending: false })
      .limit(500); // LIMIT to 100 most recent submissions

    if (submissionsError) {
      console.error('Error fetching submissions:', submissionsError);
      throw submissionsError;
    }

    console.log(`Found ${submissions?.length || 0} submissions (limited to most recent 100)`);

    // Get all question responses for all feedback submissions
    if (!submissions || submissions.length === 0) {
      console.log('No submissions found, returning empty feedback array');
      return NextResponse.json({
        campaign,
        feedback: []
      });
    }

    const submissionIds = submissions.map(sub => sub.id);
    console.log(`Fetching question responses for ${submissionIds.length} submissions...`);
    
    // Batch the requests into chunks of 50 to avoid hitting database limits
    const batchSize = 50;
    const submissionChunks = chunkArray(submissionIds, batchSize);
    console.log(`Split into ${submissionChunks.length} batches of ${batchSize}`);
    
    let allResponses: any[] = [];
    
    for (let i = 0; i < submissionChunks.length; i++) {
      const chunk = submissionChunks[i];
      console.log(`Processing batch ${i + 1}/${submissionChunks.length} with ${chunk.length} submissions`);
      
      try {
        const { data: batchResponses, error: batchError } = await supabase
          .from('question_responses')
          .select('*')
          .in('feedback_submission_id', chunk);

        if (batchError) {
          console.error(`Error fetching batch ${i + 1}:`, batchError);
          continue; // Skip this batch and continue with others
        }

        if (batchResponses) {
          allResponses.push(...batchResponses);
          console.log(`Batch ${i + 1} successful: ${batchResponses.length} responses`);
        }
      } catch (batchFetchError) {
        console.error(`Failed to fetch batch ${i + 1}:`, batchFetchError);
        continue; // Skip this batch
      }
    }

    console.log(`Total responses fetched: ${allResponses.length}`);

    // Map responses to their submissions
    const processedFeedback = submissions.map(submission => {
      // Find all responses for this submission
      const responses = allResponses.filter(
        response => response.feedback_submission_id === submission.id
      );

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

    console.log('Successfully processed all feedback');
    return NextResponse.json({
      campaign,
      feedback: processedFeedback
    });

  } catch (error) {
    console.error('Error in campaign details API:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    return NextResponse.json(
      { error: 'Failed to fetch campaign details', details: error },
      { status: 500 }
    );
  }
}