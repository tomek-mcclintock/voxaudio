import { supabase } from './supabase';
import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) throw new Error('Missing OPENAI_API_KEY')

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateDailySummary() {
  try {
    console.log('Starting daily summary generation...');
    
    // Get yesterday's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Fetch yesterday's feedback
    console.log('Fetching feedback...');
    const { data: feedbackEntries, error: feedbackError } = await supabase
      .from('feedback_submissions')
      .select('*')
      .gte('created_at', yesterday.toISOString())
      .lt('created_at', today.toISOString());

    if (feedbackError) {
      console.error('Error fetching feedback:', feedbackError);
      throw feedbackError;
    }

    console.log(`Found ${feedbackEntries?.length || 0} feedback entries`);

    if (!feedbackEntries?.length) {
      return {
        npsAverage: 0,
        positiveThemes: [],
        negativeThemes: [],
        summary: 'No feedback received for this period.',
      };
    }

    // Calculate NPS average
    const npsAverage = feedbackEntries.reduce((acc, entry) => acc + entry.nps_score, 0) / feedbackEntries.length;

    // Compile all transcriptions
    const transcriptions = feedbackEntries
      .filter(entry => entry.transcription)
      .map(entry => entry.transcription)
      .join('\n\n');

    if (!transcriptions) {
      return {
        npsAverage,
        positiveThemes: [],
        negativeThemes: [],
        summary: `Average NPS: ${npsAverage.toFixed(1)}. No voice feedback received.`,
      };
    }

    // Analyze feedback using GPT-4
    console.log('Analyzing feedback with GPT-4...');
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are analyzing customer feedback for Ruggable UK. You will provide a JSON response containing positive themes, negative themes, and a summary."
        },
        {
          role: "user",
          content: `Analyze the following feedback and provide:
          - A list of key positive themes
          - A list of key negative themes
          - A concise summary of the main points
          
          Feedback transcriptions:
          ${transcriptions}`
        }
      ]
    });

    // Parse the analysis
    const analysisText = response.choices[0].message.content;
    let analysis;
    try {
      analysis = JSON.parse(analysisText || '{}');
    } catch (e) {
      console.log('Error parsing GPT response, using formatted version');
      // If JSON parsing fails, create a structured response from the text
      analysis = {
        positiveThemes: [],
        negativeThemes: [],
        summary: analysisText || 'No analysis available'
      };
    }

    return {
      npsAverage,
      ...analysis
    };
  } catch (error) {
    console.error('Error generating daily summary:', error);
    throw error;
  }
}

export async function generateMonthlySummary() {
  try {
    console.log('Starting monthly summary generation...');
    
    // Get first day of current month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    // Fetch all feedback for the month
    console.log('Fetching monthly feedback...');
    const { data: feedbackEntries, error: feedbackError } = await supabase
      .from('feedback_submissions')
      .select('*')
      .gte('created_at', startOfMonth.toISOString())
      .lt('created_at', new Date().toISOString());

    if (feedbackError) {
      console.error('Error fetching monthly feedback:', feedbackError);
      throw feedbackError;
    }

    console.log(`Found ${feedbackEntries?.length || 0} feedback entries for the month`);

    if (!feedbackEntries?.length) {
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

    // Calculate NPS average
    const npsAverage = feedbackEntries.reduce((acc, entry) => acc + entry.nps_score, 0) / feedbackEntries.length;

    // Calculate daily scores for trend
    const dailyScores = new Map();
    feedbackEntries.forEach(entry => {
      const date = entry.created_at.split('T')[0];
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

    // Compile all transcriptions
    const transcriptions = feedbackEntries
      .filter(entry => entry.transcription)
      .map(entry => entry.transcription)
      .join('\n\n');

    let analysis = {
      positiveThemes: [],
      negativeThemes: [],
      summary: `Monthly NPS Average: ${npsAverage.toFixed(1)}. No voice feedback received.`
    };

    if (transcriptions) {
      console.log('Analyzing monthly feedback with GPT-4...');
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are analyzing monthly customer feedback for Ruggable UK. You will provide a JSON response with themes and insights."
          },
          {
            role: "user",
            content: `Analyze this month's feedback and provide:
            - Major positive themes with frequency (e.g., "Easy to clean (75% of reviews)")
            - Major negative themes with frequency
            - A comprehensive monthly summary with key insights
            
            Feedback transcriptions:
            ${transcriptions}`
          }
        ]
      });

      try {
        analysis = JSON.parse(response.choices[0].message.content || '{}');
      } catch (e) {
        console.log('Error parsing GPT response, using formatted version');
        analysis = {
          positiveThemes: [],
          negativeThemes: [],
          summary: response.choices[0].message.content || 'No monthly analysis available'
        };
      }
    }

    return {
      yearMonth: startOfMonth.toISOString().slice(0, 7),
      npsAverage,
      npsTrend,
      totalResponses: feedbackEntries.length,
      ...analysis
    };
  } catch (error) {
    console.error('Error generating monthly summary:', error);
    throw error;
  }
}