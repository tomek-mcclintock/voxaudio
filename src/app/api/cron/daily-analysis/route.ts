// src/app/api/cron/daily-analysis/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Add this to prevent public access
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // Verify secret token to ensure only authorized calls can trigger this
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    
    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get all companies
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id')
      .eq('active', true);
    
    if (companiesError) {
      throw companiesError;
    }
    
    const results = [];
    
    // Run NPS calculation for each company
    for (const company of companies || []) {
      try {
        // Get current date
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        
        // For a 30-day rolling NPS, get feedback from the last 30 days
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const { data: feedbackEntries, error: feedbackError } = await supabase
          .from('feedback_submissions')
          .select('nps_score')
          .eq('company_id', company.id)
          .gte('created_at', thirtyDaysAgo.toISOString())
          .lt('created_at', now.toISOString());
        
        if (feedbackError) throw feedbackError;
        
        // Calculate proper NPS
        let npsScore = 0;
        if (feedbackEntries && feedbackEntries.length > 0) {
          // Count each category
          const promoters = feedbackEntries.filter(entry => entry.nps_score >= 9).length;
          const detractors = feedbackEntries.filter(entry => entry.nps_score <= 6).length;
          const total = feedbackEntries.length;
          
          // Calculate percentages and NPS
          const promoterPercentage = (promoters / total) * 100;
          const detractorPercentage = (detractors / total) * 100;
          npsScore = promoterPercentage - detractorPercentage;
        }
        
        // Check if we already have an entry for today
        const { data: existingEntry } = await supabase
          .from('daily_summaries')
          .select('id')
          .eq('company_id', company.id)
          .eq('date', dateStr)
          .single();
        
        if (existingEntry) {
          // Update only the NPS of the existing entry
          const { error: updateError } = await supabase
            .from('daily_summaries')
            .update({
              nps_average: npsScore // Note: field name is still nps_average in the DB
            })
            .eq('id', existingEntry.id);
            
          if (updateError) throw updateError;
        } else {
          // Create new entry with just NPS data
          const { error: insertError } = await supabase
            .from('daily_summaries')
            .insert({
              company_id: company.id,
              date: dateStr,
              nps_average: npsScore, // Using existing field name
              positive_themes: [],
              negative_themes: [],
              summary: 'NPS data only. Run analysis for sentiment details.'
            });
            
          if (insertError) throw insertError;
        }
        
        results.push({
          company_id: company.id,
          success: true,
          nps_score: npsScore
        });
      } catch (companyError) {
        console.error(`Error processing company ${company.id}:`, companyError);
        results.push({
          company_id: company.id,
          success: false,
          error: (companyError as Error).message
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results
    });
  } catch (error) {
    console.error('Error running scheduled NPS update:', error);
    return NextResponse.json(
      { error: 'Failed to run scheduled NPS update' },
      { status: 500 }
    );
  }
}