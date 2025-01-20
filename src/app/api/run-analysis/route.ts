// src/app/api/run-analysis/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { generateDailySummary } from '@/lib/analysis';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    // Verify API key (you should set this in your environment variables)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.ANALYSIS_API_KEY}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Generate summary
    const analysis = await generateDailySummary();

    // Save analysis to database
    const { error: dbError } = await supabase
      .from('daily_summaries')
      .insert({
        date: new Date().toISOString().split('T')[0],
        nps_average: analysis.npsAverage,
        positive_themes: analysis.positiveThemes,
        negative_themes: analysis.negativeThemes,
        summary: analysis.summary
      });

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { error: 'Failed to save analysis' },
        { status: 500 }
      );
    }

    return NextResponse.json(analysis);
  } catch (error) {
    console.error('Error running analysis:', error);
    return NextResponse.json(
      { error: 'Failed to run analysis' },
      { status: 500 }
    );
  }
}