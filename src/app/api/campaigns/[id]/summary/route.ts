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

    // Get campaign details to verify company access
    const { data: campaign, error: campaignError } = await supabase
      .from('feedback_campaigns')
      .select('*')
      .eq('id', campaignId)
      .eq('company_id', userData.company_id)
      .single();

    if (campaignError) {
      throw campaignError;
    }

    // Get all feedback for this campaign
    const { data: feedbackEntries, error: feedbackError } = await supabase
      .from('feedback_submissions')
      .select('nps_score, transcription, voice_file_url')
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

    // Combine all feedback texts
    const feedbackTexts = feedbackEntries
      .map(entry => {
        const text = entry.transcription || '';
        const scoreInfo = entry.nps_score !== null ? `[NPS: ${entry.nps_score}] ` : '';
        return text ? `${scoreInfo}${text}` : null;
      })
      .filter(text => text !== null)
      .join('\n\n');

    if (!feedbackTexts) {
      return NextResponse.json({
        summary: 'No text feedback available for analysis.'
      });
    }

    // Use OpenAI to analyze the feedback
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are analyzing customer feedback about returned rugs. Create a concise paragraph (150-200 words) summarizing the main reasons customers are returning rugs, common patterns in their feedback, and actionable insights for the company. Focus on specific, data-driven findings, not general advice."
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