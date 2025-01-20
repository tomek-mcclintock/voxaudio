// lib/analysis.ts
import { supabase } from './supabase';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface FeedbackEntry {
  id: string;
  order_id: string;
  nps_score: number;
  transcription: string | null;
  sentiment: string | null;
  created_at: string;
}

export async function generateDailySummary(): Promise<{
  npsAverage: number;
  positiveThemes: string[];
  negativeThemes: string[];
  summary: string;
}> {
  // Fetch yesterday's feedback
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  const { data: feedbackEntries, error } = await supabase
    .from('feedback_submissions')
    .select('*')
    .gte('created_at', yesterday.toISOString())
    .lt('created_at', new Date().toISOString());

  if (error) {
    throw new Error('Failed to fetch feedback entries');
  }

  if (!feedbackEntries.length) {
    return {
      npsAverage: 0,
      positiveThemes: [],
      negativeThemes: [],
      summary: 'No feedback received for this period.',
    };
  }

  // Calculate NPS average
  const npsAverage = feedbackEntries.reduce((acc, entry) => acc + entry.nps_score, 0) / feedbackEntries.length;

  // Compile all transcriptions for analysis
  const transcriptions = feedbackEntries
    .filter(entry => entry.transcription)
    .map(entry => entry.transcription)
    .join('\n\n');

  if (!transcriptions) {
    return {
      npsAverage,
      positiveThemes: [],
      negativeThemes: [],
      summary: `NPS Average: ${npsAverage.toFixed(1)}. No voice feedback received.`,
    };
  }

  // Analyze themes and generate summary using GPT-4
  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: "You are analyzing customer feedback for Ruggable UK. Identify key themes and provide a concise summary."
      },
      {
        role: "user",
        content: `Analyze the following feedback and provide:
        1. A list of positive themes
        2. A list of negative themes
        3. A 2-3 paragraph summary of insights
        
        Feedback transcriptions:
        ${transcriptions}`
      }
    ]
  });
  
  const analysis = JSON.parse(response.choices[0].message.content || '{}');

  return {
    npsAverage,
    ...analysis
  };
}