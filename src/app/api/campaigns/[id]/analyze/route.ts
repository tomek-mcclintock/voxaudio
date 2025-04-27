// src/app/api/campaigns/[id]/analyze/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { analyzeFeedbackTopics } from '@/lib/clustering';

// Set to nodejs runtime to allow longer execution
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes

// Force dynamic to ensure we don't cache results
export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();
  console.log(`Starting feedback analysis for campaign: ${params.id}`);
  
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const campaignId = params.id;
    
    // Parse request data with error handling
    let feedbackIds: string[] = [];
    try {
      const requestData = await request.json();
      feedbackIds = requestData.feedbackIds || [];
    } catch (e) {
      console.error('Error parsing request data:', e);
      // Continue with no filter if parsing fails
    }
    
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
    
    // Fetch feedback submissions - with limit to prevent timeouts
    const maxFeedbackToProcess = 200; // Reasonable limit for analysis
    
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
      .eq('company_id', userData.company_id)
      .order('created_at', { ascending: false }) // Get the most recent feedback
      .limit(maxFeedbackToProcess);
    
    // If specific feedback IDs were provided, filter to those
    if (feedbackIds && feedbackIds.length > 0) {
      console.log(`Filtering to ${feedbackIds.length} specific feedback entries`);
      query = query.in('id', feedbackIds);
    }
    
    // Execute query with timing
    console.log('Fetching feedback data from database');
    const fetchStartTime = Date.now();
    const { data: feedbackEntries, error: feedbackError } = await query;
    console.log(`Fetch completed in ${Date.now() - fetchStartTime}ms`);
    
    if (feedbackError) {
      throw new Error(`Feedback fetch error: ${feedbackError.message}`);
    }
    
    if (!feedbackEntries || feedbackEntries.length === 0) {
      return NextResponse.json({
        message: 'No feedback available for analysis.'
      });
    }
    
    console.log(`Retrieved ${feedbackEntries.length} feedback entries for analysis`);
    
    // Process topic analysis
    console.log('Starting topic analysis...');
    const analysisStartTime = Date.now();
    
    const topics = await analyzeFeedbackTopics(feedbackEntries);
    
    console.log(`Topic analysis completed in ${Date.now() - analysisStartTime}ms`);
    
    // Calculate some basic statistics
    const sentimentCounts = {
      positive: feedbackEntries.filter(entry => entry.sentiment === 'positive').length,
      negative: feedbackEntries.filter(entry => entry.sentiment === 'negative').length,
      neutral: feedbackEntries.filter(entry => entry.sentiment === 'neutral').length
    };
    
    const npsStats = calculateNpsStats(feedbackEntries);
    
    const totalTime = Date.now() - startTime;
    console.log(`Total analysis time: ${totalTime}ms`);
    
    // Return the results
    return NextResponse.json({
      topics: topics, // Make sure this is at the top level
      feedbackCount: feedbackEntries.length,
      stats: {
        sentiment: sentimentCounts,
        nps: npsStats
      },
      processingTime: totalTime
    });
    
  } catch (error: any) {
    console.error('Error in feedback analysis:', error);
    
    // Create a meaningful error response
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Unknown error during analysis';
    
    return NextResponse.json(
      { 
        error: 'Failed to analyze feedback',
        message: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * Calculate NPS statistics from feedback data
 */
function calculateNpsStats(feedbackEntries: any[]) {
  // Get NPS scores
  const scores = feedbackEntries
    .map(entry => entry.nps_score)
    .filter(score => score !== null);
  
  if (scores.length === 0) {
    return {
      average: null,
      promoterPercentage: 0,
      detractorPercentage: 0,
      passivePercentage: 0
    };
  }
  
  // Calculate averages
  const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  
  // Calculate NPS segments
  const promoters = scores.filter(score => score >= 9).length;
  const detractors = scores.filter(score => score <= 6).length;
  const passives = scores.filter(score => score > 6 && score < 9).length;
  
  const promoterPercentage = (promoters / scores.length) * 100;
  const detractorPercentage = (detractors / scores.length) * 100;
  const passivePercentage = (passives / scores.length) * 100;
  
  return {
    average: parseFloat(average.toFixed(1)),
    promoterPercentage: parseFloat(promoterPercentage.toFixed(1)),
    detractorPercentage: parseFloat(detractorPercentage.toFixed(1)),
    passivePercentage: parseFloat(passivePercentage.toFixed(1)),
    promoters,
    detractors,
    passives,
    total: scores.length
  };
}