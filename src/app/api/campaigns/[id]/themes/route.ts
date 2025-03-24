// src/app/api/campaigns/[id]/themes/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { analyzeFeedbackThemes } from '@/lib/themeAnalysis';

// Set runtime to edge for better performance
export const runtime = 'edge';

// Function to log with timestamps
function log(message: string, data: any = null) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  log(`Starting theme analysis for campaign: ${params.id}`);
  
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const campaignId = params.id;

    // Get current user's company
    log('Fetching user data');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      log('Auth error', authError);
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
      log('User data error', userError);
      throw new Error(`User data error: ${userError.message}`);
    }

    // Get company information
    log('Fetching company information');
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('name')
      .eq('id', userData.company_id)
      .single();

    if (companyError) {
      log('Company fetch error', companyError);
      throw new Error(`Company fetch error: ${companyError.message}`);
    }

    // Get campaign details
    log('Fetching campaign details');
    const { data: campaign, error: campaignError } = await supabase
      .from('feedback_campaigns')
      .select('name, language')
      .eq('id', campaignId)
      .eq('company_id', userData.company_id)
      .single();

    if (campaignError) {
      log('Campaign fetch error', campaignError);
      throw new Error(`Campaign fetch error: ${campaignError.message}`);
    }

    // Get all feedback for this campaign
    log('Fetching feedback submissions');
    const { data: feedbackEntries, error: feedbackError } = await supabase
      .from('feedback_submissions')
      .select(`
        id,
        transcription,
        question_responses (
          question_id,
          response_value,
          transcription
        )
      `)
      .eq('campaign_id', campaignId)
      .eq('company_id', userData.company_id);

    if (feedbackError) {
      log('Feedback fetch error', feedbackError);
      throw new Error(`Feedback fetch error: ${feedbackError.message}`);
    }

    log(`Fetched ${feedbackEntries?.length || 0} feedback submissions`);

    if (!feedbackEntries || feedbackEntries.length === 0) {
      log('No feedback available');
      return NextResponse.json({
        error: 'No feedback available for theme analysis'
      }, { status: 400 });
    }

    // Prepare feedback data for theme analysis
    const feedbackItems = feedbackEntries.map(entry => {
      // Combine main transcription with question responses
      let combinedText = entry.transcription || '';
      
      // Add question responses
      if (entry.question_responses && entry.question_responses.length > 0) {
        const questionTexts = entry.question_responses.map(response => {
          // Prioritize voice transcriptions
          if (response.transcription) {
            return response.transcription;
          }
          // Otherwise use text response
          return response.response_value || '';
        }).filter(Boolean);
        
        if (questionTexts.length > 0) {
          combinedText += '\n' + questionTexts.join('\n');
        }
      }
      
      return {
        id: entry.id,
        text: combinedText.trim()
      };
    }).filter(item => item.text); // Only include items with text

    if (feedbackItems.length === 0) {
      log('No text content available for analysis');
      return NextResponse.json({
        error: 'No text content available for theme analysis'
      }, { status: 400 });
    }

    // Analyze themes
    log('Analyzing feedback themes');
    const themeAnalysis = await analyzeFeedbackThemes(
      feedbackItems,
      campaign.name,
      company.name,
      campaign.language || 'en'
    );
    
    log('Theme analysis complete', { 
      themeCount: themeAnalysis.mainThemes.length,
      categories: Object.keys(themeAnalysis.categories)
    });

    // Save the theme analysis in the campaign (optional)
    const { error: updateError } = await supabase
      .from('feedback_campaigns')
      .update({ 
        theme_analysis: themeAnalysis,
        last_analyzed: new Date().toISOString()
      })
      .eq('id', campaignId);
      
    if (updateError) {
      log('Error saving theme analysis', updateError);
      // Continue anyway as we'll return the results directly
    }

    return NextResponse.json({ 
      themeAnalysis,
      analyzedFeedbackCount: feedbackItems.length,
      totalFeedbackCount: feedbackEntries.length
    });

  } catch (error: any) {
    log('Error in theme analysis', error);
    return NextResponse.json(
      { 
        error: 'Failed to analyze themes',
        message: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}