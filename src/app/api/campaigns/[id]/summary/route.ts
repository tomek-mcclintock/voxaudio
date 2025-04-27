// src/app/api/campaigns/[id]/summary/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import OpenAI from 'openai';
import { PostgrestError } from '@supabase/supabase-js';

// Set runtime to edge for better performance
export const runtime = 'edge';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
  log(`Starting summary generation for campaign: ${params.id}`);
  
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
    log('User data fetched', { userId: user.id, companyId: userData.company_id });

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
    log('Company data fetched', { companyName: company.name });

    // Get campaign details including campaign questions
    log('Fetching campaign details');
    const { data: campaign, error: campaignError } = await supabase
      .from('feedback_campaigns')
      .select('*, questions')
      .eq('id', campaignId)
      .eq('company_id', userData.company_id)
      .single();

    if (campaignError) {
      log('Campaign fetch error', campaignError);
      throw new Error(`Campaign fetch error: ${campaignError.message}`);
    }
    log('Campaign data fetched', { 
      campaignName: campaign.name, 
      questionCount: campaign.questions?.length || 0,
      includeNps: campaign.include_nps
    });

    // Get all feedback for this campaign with question responses
    log('Fetching feedback submissions');
    const { data: feedbackEntries, error: feedbackError } = await supabase
      .from('feedback_submissions')
      .select(`
        nps_score, 
        transcription, 
        voice_file_url,
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
        summary: 'No feedback available for this campaign.'
      });
    }

    // Prepare context information for the AI
    const companyName = company.name;
    const campaignName = campaign.name;
    
    // Format the questions that were asked
    let questionsInfo = '';
    if (campaign.questions && campaign.questions.length > 0) {
      questionsInfo = 'Questions asked in this campaign:\n';
      campaign.questions.forEach((q: any) => {
        questionsInfo += `- ${q.text}\n`;
      });
    }
    
    if (campaign.include_nps) {
      const npsQuestion = campaign.nps_question || 'How likely are you to recommend us to a friend or colleague?';
      questionsInfo += `- ${npsQuestion} (NPS score 1-10)\n`;
    }

    // Limit number of feedback entries to process to avoid timeouts (max 200)
    const limitedEntries = feedbackEntries.slice(0, 200);
    log(`Processing ${limitedEntries.length} feedback entries (limited from ${feedbackEntries.length})`);

    // Combine all feedback texts with question responses
    const feedbackTexts = limitedEntries
      .map((entry, index) => {
        let feedbackText = `[Feedback #${index + 1}]`;
        
        // Add NPS score if available
        if (entry.nps_score !== null) {
          feedbackText += ` [NPS Score: ${entry.nps_score}/10]`;
        }
        
        // Add transcription if available
        if (entry.transcription) {
          feedbackText += `\n${entry.transcription}`;
        }
        
        // Add question responses if available
        if (entry.question_responses && entry.question_responses.length > 0) {
          feedbackText += '\nResponses:';
          
          entry.question_responses.forEach((response: any) => {
            // Find the question text for this response
            let questionText = 'Question';
            if (campaign.questions) {
              const question = campaign.questions.find((q: any) => q.id === response.question_id);
              if (question) {
                questionText = question.text;
              }
            }
            
            // Get the response value or transcription
            let responseValue = response.response_value;
            if (response.transcription) {
              responseValue = `[Voice] ${response.transcription}`;
            }
            
            feedbackText += `\n- ${questionText}: ${responseValue}`;
          });
        }
        
        return feedbackText.trim() ? feedbackText : null;
      })
      .filter((text): text is string => text !== null)
      .join('\n\n');

    if (!feedbackTexts) {
      log('No text feedback available for analysis');
      return NextResponse.json({
        summary: 'No text feedback available for analysis.'
      });
    }

    // Create a context-aware system prompt requesting bullet points
    const systemPrompt = `
    You are analyzing customer feedback for ${companyName}'s campaign "${campaignName}".
    
    ${questionsInfo}
    
    Create a concise summary with 4-8 specific bullet points that include:
    - The main themes or patterns with SPECIFIC examples and comments from customers
    - Key issues mentioned by customers with DIRECT QUOTES where possible
    - Specific product features or aspects that received positive feedback
    - Detailed, actionable insights for ${companyName} with concrete suggestions
    
    Important instructions:
    1. Format your response as simple HTML with <ul> and <li> for lists and <strong> for emphasis
    2. Be extremely specific - include exact quotes and details
    3. If you mention statistics, count actual occurrences (e.g., "5 out of 20 customers mentioned...")
    4. Focus on unique, actionable insights rather than generic observations
    5. Include direct customer language and phrasing where possible
    6. For each issue identified, suggest a potential solution or action item
    `;
    

    // Log what we're sending to OpenAI (truncated for readability)
    log('Sending to OpenAI', { 
      model: 'gpt-4o',
      systemPrompt: systemPrompt.trim(),
      feedbackTextLength: feedbackTexts.length,
      feedbackTextSample: feedbackTexts.substring(0, 200) + '...' 
    });

    // Use OpenAI to analyze the feedback with gpt-4o for better performance
    const startTime = Date.now();
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: systemPrompt.trim()
        },
        {
          role: "user",
          content: feedbackTexts
        }
      ],
      temperature: 0.3, // Lower temperature for more focused output
      max_tokens: 500, // Allow more tokens for bullet points
    });
    const endTime = Date.now();

    const summary = response.choices[0].message.content || 'Unable to generate summary.';
    log(`OpenAI response received in ${endTime - startTime}ms`, {
      summaryLength: summary.length,
      summary: summary
    });

    // Save summary to database
    log('Saving summary to database');
    const { error: updateError } = await supabase
      .from('feedback_campaigns')
      .update({ summary: summary })
      .eq('id', campaignId);
      
    if (updateError) {
      log('Error saving summary', updateError);
    } else {
      log('Summary saved successfully');
    }

    return NextResponse.json({ 
      summary,
      processingTime: endTime - startTime,
      feedbackProcessed: limitedEntries.length,
      totalFeedback: feedbackEntries.length
    });

  } catch (error: any) {
    log('Error generating summary', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate summary',
        message: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}