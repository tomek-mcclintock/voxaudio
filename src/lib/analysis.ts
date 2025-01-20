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

  const npsAverage = feedbackEntries.reduce((acc, entry) => acc + entry.nps_score, 0) / feedbackEntries.length;

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

  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: "You are analyzing customer feedback for Ruggable UK. Identify key themes and provide a concise summary."
      },
      {
        role: "user",
        content: `Analyze the following feedback and provide a JSON response with these keys:
        - positiveThemes: array of key positive themes
        - negativeThemes: array of key negative themes
        - summary: a 2-3 paragraph summary of insights
        
        Feedback transcriptions:
        ${transcriptions}`
      }
    ],
    response_format: { type: "json_object" }
  });
  
  const analysis = JSON.parse(response.choices[0].message.content || '{}');

  return {
    npsAverage,
    ...analysis
  };
}

export async function generateMonthlySummary(): Promise<{
  yearMonth: string;
  npsAverage: number;
  npsTrend: number[];
  totalResponses: number;
  positiveThemes: string[];
  negativeThemes: string[];
  summary: string;
}> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  
  const { data: feedbackEntries, error } = await supabase
    .from('feedback_submissions')
    .select('*')
    .gte('created_at', startOfMonth.toISOString())
    .lt('created_at', new Date().toISOString());

  if (error) {
    throw new Error('Failed to fetch monthly feedback entries');
  }

  if (!feedbackEntries.length) {
    return {
      yearMonth: startOfMonth.toISOString().slice(0, 7),
      npsAverage: 0,
      npsTrend: [],
      totalResponses: 0,
      positiveThemes: [],
      negativeThemes: [],
      summary: 'No feedback received this month.',
    };
  }

  const npsAverage = feedbackEntries.reduce((acc, entry) => acc + entry.nps_score, 0) / feedbackEntries.length;
  
  const dailyScores = new Map();
  feedbackEntries.forEach(entry => {
    const date = entry.created_at.slice(0, 10);
    if (!dailyScores.has(date)) {
      dailyScores.set(date, { total: 0, count: 0 });
    }
    const day = dailyScores.get(date);
    day.total += entry.nps_score;
    day.count += 1;
  });

  const npsTrend = Array.from(dailyScores.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([_, values]) => Number((values.total / values.count).toFixed(1)));

  const transcriptions = feedbackEntries
    .filter(entry => entry.transcription)
    .map(entry => entry.transcription)
    .join('\n\n');

  if (!transcriptions) {
    return {
      yearMonth: startOfMonth.toISOString().slice(0, 7),
      npsAverage,
      npsTrend,
      totalResponses: feedbackEntries.length,
      positiveThemes: [],
      negativeThemes: [],
      summary: `Monthly NPS Average: ${npsAverage.toFixed(1)}. No voice feedback received.`,
    };
  }

  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: "You are analyzing monthly customer feedback for Ruggable UK. Identify key themes and provide a comprehensive summary."
      },
      {
        role: "user",
        content: `Analyze this month's feedback and provide a JSON response with these keys:
        - positiveThemes: array of major positive themes with frequency (e.g., "Easy to clean (mentioned in 45% of reviews)")
        - negativeThemes: array of major negative themes with frequency
        - summary: comprehensive monthly summary of insights, trends, and recommendations
        
        Feedback transcriptions:
        ${transcriptions}`
      }
    ],
    response_format: { type: "json_object" }
  });
  
  const analysis = JSON.parse(response.choices[0].message.content || '{}');

  return {
    yearMonth: startOfMonth.toISOString().slice(0, 7),
    npsAverage,
    npsTrend,
    totalResponses: feedbackEntries.length,
    ...analysis
  };
}