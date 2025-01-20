// src/app/dashboard/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface DailySummary {
  date: string;
  nps_average: number;
  positive_themes: string[];
  negative_themes: string[];
  summary: string;
}

interface MonthlySummary {
  year_month: string;
  nps_average: number;
  nps_trend: number[];
  total_responses: number;
  positive_themes: string[];
  negative_themes: string[];
  summary: string;
}

export default function DashboardPage() {
  const [latestDaily, setLatestDaily] = useState<DailySummary | null>(null);
  const [latestMonthly, setLatestMonthly] = useState<MonthlySummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      // Fetch latest daily summary
      const { data: dailyData } = await supabase
        .from('daily_summaries')
        .select('*')
        .order('date', { ascending: false })
        .limit(1)
        .single();

      // Fetch latest monthly summary
      const { data: monthlyData } = await supabase
        .from('monthly_summaries')
        .select('*')
        .order('year_month', { ascending: false })
        .limit(1)
        .single();

      setLatestDaily(dailyData);
      setLatestMonthly(monthlyData);
      setLoading(false);
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-8">Ruggable Feedback Dashboard</h1>
      
      {/* Daily Summary */}
      <div className="mb-8 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Latest Daily Summary</h2>
        {latestDaily ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-sm text-blue-600">Date</div>
                <div className="text-xl font-bold">{new Date(latestDaily.date).toLocaleDateString()}</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-sm text-green-600">NPS Average</div>
                <div className="text-xl font-bold">{latestDaily.nps_average.toFixed(1)}</div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2">Positive Themes</h3>
                <ul className="list-disc pl-5">
                  {latestDaily.positive_themes.map((theme, i) => (
                    <li key={i} className="text-green-600">{theme}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Negative Themes</h3>
                <ul className="list-disc pl-5">
                  {latestDaily.negative_themes.map((theme, i) => (
                    <li key={i} className="text-red-600">{theme}</li>
                  ))}
                </ul>
              </div>
            </div>
            
            <div className="mt-6">
              <h3 className="font-semibold mb-2">Summary</h3>
              <p className="text-gray-700 whitespace-pre-line">{latestDaily.summary}</p>
            </div>
          </>
        ) : (
          <p>No daily summary available</p>
        )}
      </div>

      {/* Monthly Summary */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Latest Monthly Summary</h2>
        {latestMonthly ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-sm text-blue-600">Month</div>
                <div className="text-xl font-bold">
                  {new Date(latestMonthly.year_month + '-01').toLocaleDateString(undefined, { year: 'numeric', month: 'long' })}
                </div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-sm text-green-600">Monthly NPS</div>
                <div className="text-xl font-bold">{latestMonthly.nps_average.toFixed(1)}</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-sm text-purple-600">Total Responses</div>
                <div className="text-xl font-bold">{latestMonthly.total_responses}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2">Major Positive Themes</h3>
                <ul className="list-disc pl-5">
                  {latestMonthly.positive_themes.map((theme, i) => (
                    <li key={i} className="text-green-600">{theme}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Major Negative Themes</h3>
                <ul className="list-disc pl-5">
                  {latestMonthly.negative_themes.map((theme, i) => (
                    <li key={i} className="text-red-600">{theme}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="font-semibold mb-2">Monthly Summary</h3>
              <p className="text-gray-700 whitespace-pre-line">{latestMonthly.summary}</p>
            </div>
          </>
        ) : (
          <p>No monthly summary available</p>
        )}
      </div>
    </div>
  );
}