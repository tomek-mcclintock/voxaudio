'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '@/lib/supabase';

interface DailySummary {
  date: string;
  nps_average: number;
  positive_themes: string[];
  negative_themes: string[];
  summary: string;
}

interface FeedbackEntry {
  created_at: string;
  order_id: string;
  nps_score: number;
  transcription: string | null;
  voice_file_url: string | null;
}

export default function DashboardPage() {
  const [dailySummaries, setDailySummaries] = useState<DailySummary[]>([]);
  const [recentFeedback, setRecentFeedback] = useState<FeedbackEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch last 30 days of summaries
        const { data: summaries, error: summariesError } = await supabase
          .from('daily_summaries')
          .select('*')
          .order('date', { ascending: false })
          .limit(30);

        if (summariesError) throw summariesError;

        // Fetch recent feedback entries
        const { data: feedback, error: feedbackError } = await supabase
          .from('feedback_submissions')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);

        if (feedbackError) throw feedbackError;

        setDailySummaries(summaries || []);
        setRecentFeedback(feedback || []);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
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

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-red-600">{error}</div>
      </div>
    );
  }

  // Prepare data for NPS trend chart
  const chartData = dailySummaries
    .map(summary => ({
      date: new Date(summary.date).toLocaleDateString(),
      nps: summary.nps_average
    }))
    .reverse();

  // Calculate overall NPS average
  const overallNPS = dailySummaries.length
    ? dailySummaries.reduce((acc, curr) => acc + (curr.nps_average || 0), 0) / dailySummaries.length
    : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-8">Ruggable Feedback Dashboard</h1>
      
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-2">30-Day NPS Average</h3>
          <p className="text-3xl font-bold">{overallNPS.toFixed(1)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-2">Total Responses</h3>
          <p className="text-3xl font-bold">{recentFeedback.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-2">Voice Recordings</h3>
          <p className="text-3xl font-bold">
            {recentFeedback.filter(f => f.voice_file_url).length}
          </p>
        </div>
      </div>

      {/* NPS Trend Chart */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">NPS Score Trend</h2>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[0, 10]} />
              <Tooltip />
              <Line type="monotone" dataKey="nps" stroke="#2563eb" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Latest Feedback */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Latest Feedback</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">Date</th>
                <th className="text-left py-3 px-4">Order ID</th>
                <th className="text-left py-3 px-4">NPS Score</th>
                <th className="text-left py-3 px-4">Feedback</th>
              </tr>
            </thead>
            <tbody>
              {recentFeedback.map((feedback) => (
                <tr key={feedback.order_id} className="border-b">
                  <td className="py-3 px-4">
                    {new Date(feedback.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4">{feedback.order_id}</td>
                  <td className="py-3 px-4">{feedback.nps_score}</td>
                  <td className="py-3 px-4">
                    {feedback.transcription ? (
                      <span>{feedback.transcription.slice(0, 100)}...</span>
                    ) : (
                      feedback.voice_file_url ? (
                        <span className="text-blue-600">Has voice recording</span>
                      ) : (
                        <span className="text-gray-400">No feedback provided</span>
                      )
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Latest Summary */}
      {dailySummaries[0] && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Latest Daily Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">Positive Themes</h3>
              <ul className="list-disc pl-5">
                {dailySummaries[0].positive_themes?.map((theme, i) => (
                  <li key={i} className="text-green-600">{theme}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Negative Themes</h3>
              <ul className="list-disc pl-5">
                {dailySummaries[0].negative_themes?.map((theme, i) => (
                  <li key={i} className="text-red-600">{theme}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-4">
            <h3 className="font-semibold mb-2">Summary</h3>
            <p className="text-gray-700">{dailySummaries[0].summary}</p>
          </div>
        </div>
      )}
    </div>
  );
}