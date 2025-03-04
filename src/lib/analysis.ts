// src/lib/analysis.ts
import { supabase } from './supabase';
import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) throw new Error('Missing OPENAI_API_KEY')

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateDailySummary(companyId: string, dateStr?: string) {
  try {
    console.log(`Starting daily summary generation for company: ${companyId}, date: ${dateStr || 'today'}`);
    
    // Get the date range for the specified date or today
    const targetDate = dateStr ? new Date(dateStr) : new Date();
    targetDate.setHours(0, 0, 0, 0);
    
    // For a 30-day rolling NPS, get feedback from the 30 days prior
    const thirtyDaysAgo = new Date(targetDate);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Fetch feedback for the 30-day period for this company
    console.log('Fetching feedback...');
    const { data: feedbackEntries, error: feedbackError } = await supabase
      .from('feedback_submissions')
      .select('*')
      .eq('company_id', companyId)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .lt('created_at', targetDate.toISOString());

    if (feedbackError) {
      console.error('Error fetching feedback:', feedbackError);
      throw feedbackError;
    }

    console.log(`Found ${feedbackEntries?.length || 0} feedback entries for the 30-day period`);

    if (!feedbackEntries?.length) {
      return {
        npsAverage: 0,
        positiveThemes: [],
        negativeThemes: [],
        summary: 'No feedback received for this period.',
      };
    }

    // Calculate proper NPS
    const promoters = feedbackEntries.filter(entry => entry.nps_score >= 9).length;
    const detractors = feedbackEntries.filter(entry => entry.nps_score <= 6).length;
    const total = feedbackEntries.length;
    
    // Calculate percentages and NPS
    const promoterPercentage = (promoters / total) * 100;
    const detractorPercentage = (detractors / total) * 100;
    const npsScore = promoterPercentage - detractorPercentage;

    // Compile all transcriptions
    const transcriptions = feedbackEntries
      .filter(entry => entry.transcription)
      .map(entry => `Feedback (NPS Score ${entry.nps_score}): ${entry.transcription}`)
      .join('\n\n');

    if (!transcriptions) {
      return {
        npsAverage: npsScore,
        positiveThemes: [],
        negativeThemes: [],
        summary: `NPS Score: ${npsScore.toFixed(1)}. No voice feedback received for analysis.`,
      };
    }

    // Analyze feedback using GPT-4
    console.log('Analyzing feedback with GPT-4...');
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are analyzing customer feedback. Analyze the feedback and provide a response in this exact JSON format: {\"positiveThemes\": [\"theme1\", \"theme2\"], \"negativeThemes\": [\"theme1\", \"theme2\"], \"summary\": \"overall summary\"}"
        },
        {
          role: "user",
          content: `Analyze these customer feedback entries and identify key themes and patterns. Here are the feedbacks:\n\n${transcriptions}`
        }
      ]
    });

    // Parse the analysis
    const analysisText = response.choices[0].message.content;
    console.log('GPT Analysis:', analysisText);
    
    let analysis;
    try {
      analysis = JSON.parse(analysisText || '{}');
    } catch (e) {
      console.error('Error parsing GPT response:', e);
      analysis = {
        positiveThemes: [],
        negativeThemes: [],
        summary: analysisText || 'No analysis available'
      };
    }

    return {
      npsAverage: npsScore, // Using existing field name but storing correct NPS
      ...analysis
    };
  } catch (error) {
    console.error('Error generating daily summary:', error);
    throw error;
  }
}

export async function generateMonthlySummary(companyId: string) {
  try {
    console.log('Starting monthly summary generation for company:', companyId);
    
    // Get first day of current month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    // Fetch all feedback for the month for this company
    console.log('Fetching monthly feedback...');
    const { data: feedbackEntries, error: feedbackError } = await supabase
      .from('feedback_submissions')
      .select('*')
      .eq('company_id', companyId)
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

    // Calculate proper NPS
    const promoters = feedbackEntries.filter(entry => entry.nps_score >= 9).length;
    const detractors = feedbackEntries.filter(entry => entry.nps_score <= 6).length;
    const total = feedbackEntries.length;
    
    // Calculate percentages and NPS
    const promoterPercentage = (promoters / total) * 100;
    const detractorPercentage = (detractors / total) * 100;
    const npsScore = promoterPercentage - detractorPercentage;

    // Calculate daily scores for trend
    const dailyScores = new Map();
    feedbackEntries.forEach(entry => {
      const date = entry.created_at.split('T')[0];
      if (!dailyScores.has(date)) {
        dailyScores.set(date, { promoters: 0, passives: 0, detractors: 0, total: 0 });
      }
      const day = dailyScores.get(date);
      day.total += 1;
      
      if (entry.nps_score >= 9) {
        day.promoters += 1;
      } else if (entry.nps_score >= 7) {
        day.passives += 1;
      } else {
        day.detractors += 1;
      }
    });

    const npsTrend = Array.from(dailyScores.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([_, values]) => {
        if (values.total === 0) return 0;
        const promoterPct = (values.promoters / values.total) * 100;
        const detractorPct = (values.detractors / values.total) * 100;
        return Number((promoterPct - detractorPct).toFixed(1));
      });

    // Compile all transcriptions
    const transcriptions = feedbackEntries
      .filter(entry => entry.transcription)
      .map(entry => `Feedback (NPS Score ${entry.nps_score}): ${entry.transcription}`)
      .join('\n\n');

    let analysis = {
      positiveThemes: [],
      negativeThemes: [],
      summary: `Monthly NPS Score: ${npsScore.toFixed(1)}. No voice feedback received for analysis.`
    };

    if (transcriptions) {
      console.log('Analyzing monthly feedback with GPT-4...');
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are analyzing monthly customer feedback. Provide a JSON response with themes and insights."
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
      npsAverage: npsScore,
      npsTrend,
      totalResponses: feedbackEntries.length,
      ...analysis
    };
  } catch (error) {
    console.error('Error generating monthly summary:', error);
    throw error;
  }
}