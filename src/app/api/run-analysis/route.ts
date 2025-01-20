// src/app/api/run-analysis/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { generateDailySummary, generateMonthlySummary } from '@/lib/analysis';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    // Verify API key
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.ANALYSIS_API_KEY}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the current date
    const now = new Date();
    const isLastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() === now.getDate();

    // Always run daily analysis
    const dailyAnalysis = await generateDailySummary();

    // Save daily analysis
    const { error: dailyError } = await supabase
      .from('daily_summaries')
      .insert({
        date: now.toISOString().split('T')[0],
        nps_average: dailyAnalysis.npsAverage,
        positive_themes: dailyAnalysis.positiveThemes,
        negative_themes: dailyAnalysis.negativeThemes,
        summary: dailyAnalysis.summary
      });

    if (dailyError) {
      console.error('Daily analysis error:', dailyError);
    }

    // Run monthly analysis on the last day of the month
    if (isLastDayOfMonth) {
      const monthlyAnalysis = await generateMonthlySummary();
      
      const { error: monthlyError } = await supabase
        .from('monthly_summaries')
        .insert({
          year_month: monthlyAnalysis.yearMonth,
          nps_average: monthlyAnalysis.npsAverage,
          nps_trend: monthlyAnalysis.npsTrend,
          total_responses: monthlyAnalysis.totalResponses,
          positive_themes: monthlyAnalysis.positiveThemes,
          negative_themes: monthlyAnalysis.negativeThemes,
          summary: monthlyAnalysis.summary
        });

      if (monthlyError) {
        console.error('Monthly analysis error:', monthlyError);
      }

      return NextResponse.json({
        daily: dailyAnalysis,
        monthly: monthlyAnalysis
      });
    }

    return NextResponse.json({ daily: dailyAnalysis });
  } catch (error) {
    console.error('Error running analysis:', error);
    return NextResponse.json(
      { error: 'Failed to run analysis' },
      { status: 500 }
    );
  }
}