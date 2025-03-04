// src/app/api/run-analysis/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { generateDailySummary, generateMonthlySummary } from '@/lib/analysis';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '1');
    const daysToAnalyze = isNaN(days) ? 1 : Math.min(days, 30); // Cap at 30 days
    
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get current user's session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    
    // Get user's company_id
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('company_id')
      .eq('email', user?.email)
      .single();
    
    if (userError) throw userError;
    
    const companyId = userData.company_id;
    console.log(`Running ${daysToAnalyze}-day analysis for company:`, companyId);
    
    // Create a custom function to analyze multiple days
    const results = [];
    
    // Start with today and go back daysToAnalyze days
    for (let i = 0; i < daysToAnalyze; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      console.log(`Analyzing date: ${dateStr}`);
      
      // We'll reuse the existing generateDailySummary function, 
      // but we need to pass the specific date
      const dailyAnalysis = await generateDailySummary(companyId, dateStr);
      
      // Save or update the daily analysis in the database
      const { data: existingEntry } = await supabase
        .from('daily_summaries')
        .select('id')
        .eq('company_id', companyId)
        .eq('date', dateStr)
        .single();
      
      if (existingEntry) {
        // Update existing entry
        await supabase
          .from('daily_summaries')
          .update({
            nps_average: dailyAnalysis.npsAverage,
            positive_themes: dailyAnalysis.positiveThemes,
            negative_themes: dailyAnalysis.negativeThemes,
            summary: dailyAnalysis.summary
          })
          .eq('id', existingEntry.id);
      } else {
        // Create new entry
        await supabase
          .from('daily_summaries')
          .insert({
            company_id: companyId,
            date: dateStr,
            nps_average: dailyAnalysis.npsAverage,
            positive_themes: dailyAnalysis.positiveThemes,
            negative_themes: dailyAnalysis.negativeThemes,
            summary: dailyAnalysis.summary
          });
      }
      
      results.push({
        date: dateStr,
        nps_average: dailyAnalysis.npsAverage
      });
    }
    
    // If it's the last day of the month, still run monthly analysis as before
    const now = new Date();
    const isLastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() === now.getDate();
    
    let monthlyAnalysis = null;
    if (isLastDayOfMonth) {
      console.log('Running monthly analysis...');
      monthlyAnalysis = await generateMonthlySummary(companyId);
      
      console.log('Saving monthly analysis...');
      const { error: monthlyError } = await supabase
        .from('monthly_summaries')
        .insert({
          company_id: companyId,
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
      }
    }
    
    console.log('Analysis process complete');
    return NextResponse.json({
      success: true,
      days_analyzed: daysToAnalyze,
      results: results,
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