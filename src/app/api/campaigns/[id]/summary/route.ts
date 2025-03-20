// src/app/api/campaigns/[id]/summary/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const campaignId = params.id;

    // Get current user's company
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('company_id')
      .eq('email', user?.email)
      .single();

    if (userError) throw userError;

    // Get company information
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('name')
      .eq('id', userData.company_id)
      .single();

    if (companyError) throw companyError;

    // Get campaign details including campaign questions
    const { data: campaign, error: campaignError } = await supabase
      .from('feedback_campaigns')
      .select('*, questions')
      .eq('id', campaignId)
      .eq('company_id', userData.company_id)
      .single();

    if (campaignError) {
      throw campaignError;
    }

    // Get all feedback for this campaign with question responses
    const { data: feedbackEntries, error: feedbackError } = await supabase
      .from('feedback_submissions')
      .select(`
        nps_score, 
        transcription, 
        voice_file_url,
        question_responses (
          question_id,
          response_value
        )
      `)
      .eq('campaign_id', campaignId)
      .eq('company_id', userData.company_id);

    if (feedbackError) {
      throw feedbackError;
    }

    if (!feedbackEntries || feedbackEntries.length === 0) {
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

    // Combine all feedback texts with question responses
    const feedbackTexts = feedbackEntries
      .map(entry => {
        let feedbackText = '';
        
        // Add NPS score if available
        if (entry.nps_score !== null) {
          feedbackText += `[NPS Score: ${entry.nps_score}/10] `;
        }
        
        // Add transcription if available
        if (entry.transcription) {
          feedbackText += entry.transcription;
        }
        
        // Add question responses if available
        if (entry.question_responses && entry.question_responses.length > 0) {
          feedbackText += '\nQuestion responses:\n';
          
          entry.question_responses.forEach((response: any) => {
            // Find the question text for this response
            let questionText = 'Question';
            if (campaign.questions) {
              const question = campaign.questions.find((q: any) => q.id === response.question_id);
              if (question) {
                questionText = question.text;
              }
            }
            
            feedbackText += `- ${questionText}: ${response.response_value}\n`;
          });
        }
        
        return feedbackText.trim() ? feedbackText : null;
      })
      .filter(text => text !== null)
      .join('\n\n---\n\n');

    if (!feedbackTexts) {
      return NextResponse.json({
        summary: 'No text feedback available for analysis.'
      });
    }

    // Create a context-aware system prompt
    const systemPrompt = `
You are analyzing customer feedback for ${companyName}'s campaign "${campaignName}".

${questionsInfo}

Create a concise paragraph (150-200 words) summarizing:
1. The main patterns and themes in the feedback
2. Key issues or concerns mentioned by customers
3. Positive aspects highlighted by customers (if any)
4. Actionable insights that ${companyName} could implement

Focus on being specific and data-driven. Mention the frequency of common themes when possible (e.g., "40% of customers mentioned...").
`;

    // Use OpenAI to analyze the feedback
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: systemPrompt.trim()
        },
        {
          role: "user",
          content: feedbackTexts
        }
      ]
    });

    const summary = response.choices[0].message.content || 'Unable to generate summary.';

    // Save summary to database
    await supabase
      .from('feedback_campaigns')
      .update({ summary: summary })
      .eq('id', campaignId);

    return NextResponse.json({ summary });

  } catch (error) {
    console.error('Error generating campaign summary:', error);
    return NextResponse.json(
      { error: 'Failed to generate summary' },
      { status: 500 }
    );
  }
}