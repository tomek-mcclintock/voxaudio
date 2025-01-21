import { NextRequest, NextResponse } from 'next/server';
import { generateDailySummary, generateMonthlySummary } from '@/lib/analysis';
import { supabase } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    console.log('Starting analysis process...');
    
    // Get current date info
    const now = new Date();
    const isLastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() === now.getDate();

    // Always run daily analysis
    console.log('Running daily analysis...');
    const dailyAnalysis = await generateDailySummary();

    // Save daily analysis
    console.log('Saving daily analysis...');
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
      console.error('Error saving daily analysis:', dailyError);
      return NextResponse.json(
        { error: 'Failed to save daily analysis' },
        { status: 500 }
      );
    }

    // If it's the last day of the month, run monthly analysis
    let monthlyAnalysis = null;
    if (isLastDayOfMonth) {
      console.log('Running monthly analysis...');
      monthlyAnalysis = await generateMonthlySummary();

      console.log('Saving monthly analysis...');
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
        console.error('Error saving monthly analysis:', monthlyError);
        return NextResponse.json(
          { error: 'Failed to save monthly analysis' },
          { status: 500 }
        );
      }
    }

    console.log('Analysis process complete');
    return NextResponse.json({
      success: true,
      daily: dailyAnalysis,
      monthly: monthlyAnalysis
    });

  } catch (error) {
    console.error('Error running analysis:', error);
    return NextResponse.json(
      { error: 'Failed to run analysis' },
      { status: 500 }
    );
  }
}