// src/app/api/campaigns/[id]/analyze/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { createClusterMap, extractTopics } from '@/lib/clustering';

// Set to nodejs runtime to allow longer execution
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes

// Force dynamic to ensure we don't cache results
export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log(`Starting feedback analysis for campaign: ${params.id}`);
  
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const campaignId = params.id;
    const requestData = await request.json();
    const { feedbackIds } = requestData;
    
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
    
    // Get campaign details to ensure access is authorized
    const { data: campaign, error: campaignError } = await supabase
      .from('feedback_campaigns')
      .select('id, name, company_id')
      .eq('id', campaignId)
      .eq('company_id', userData.company_id)
      .single();

    if (campaignError) {
      throw new Error(`Campaign fetch error: ${campaignError.message}`);
    }
    
    // Fetch feedback submissions
    let query = supabase
      .from('feedback_submissions')
      .select(`
        id,
        created_at,
        order_id,
        nps_score,
        transcription,
        sentiment,
        question_responses (
          question_id,
          response_value,
          transcription,
          voice_file_url
        ),
        feedback_campaigns!inner (
          id,
          name,
          questions
        )
      `)
      .eq('campaign_id', campaignId)
      .eq('company_id', userData.company_id);
    
    // If specific feedback IDs were provided, filter to those
    if (feedbackIds && feedbackIds.length > 0) {
      query = query.in('id', feedbackIds);
    }
    
    // Execute query
    const { data: feedbackEntries, error: feedbackError } = await query;
    
    if (feedbackError) {
      throw new Error(`Feedback fetch error: ${feedbackError.message}`);
    }
    
    if (!feedbackEntries || feedbackEntries.length === 0) {
      return NextResponse.json({
        message: 'No feedback available for analysis.'
      });
    }
    
    // Create clusters from feedback
    console.log(`Creating clusters from ${feedbackEntries.length} feedback entries`);
    const clusters = await createClusterMap(feedbackEntries);
    
    // Extract all feedback texts for topic extraction
    const feedbackTexts = feedbackEntries.map(entry => {
      let text = '';
      
      // Add NPS score if available
      if (entry.nps_score !== null) {
        text += `NPS Score: ${entry.nps_score}/10. `;
      }
      
      // Add main transcription if available
      if (entry.transcription) {
        text += entry.transcription + ' ';
      }
      
      // Add question responses
      if (entry.question_responses && entry.question_responses.length > 0) {
        entry.question_responses.forEach((response: any) => {
          if (response.transcription) {
            text += response.transcription + ' ';
          } else if (response.response_value) {
            text += response.response_value + ' ';
          }
        });
      }
      
      return text.trim();
    }).filter(Boolean);
    
    // Extract topics from feedback
    console.log('Extracting topics from feedback texts');
    const topics = await extractTopics(feedbackTexts);
    
    // Return the results
    return NextResponse.json({
      clusters,
      topics,
      feedbackCount: feedbackEntries.length
    });
  } catch (error: any) {
    console.error('Error in feedback analysis:', error);
    return NextResponse.json(
      { 
        error: 'Failed to analyze feedback',
        message: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}