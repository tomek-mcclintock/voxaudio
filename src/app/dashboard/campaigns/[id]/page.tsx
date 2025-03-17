// src/app/dashboard/campaigns/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useCompany } from '@/lib/contexts/CompanyContext';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';

interface CampaignData {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  active: boolean;
  created_at: string;
  include_nps: boolean;
}

interface FeedbackData {
  created_at: string;
  nps_score: number | null;
  transcription: string | null;
  sentiment: string | null;
  question_responses: Array<{
    question_id: string;
    response_value: string;
  }> | null;
}

interface CampaignStats {
  totalResponses: number;
  averageNPS: number | null;
  responsesWithVoice: number;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
}

interface DailyNpsData {
  promoters: number;
  detractors: number;
  total: number;
}

interface ChartDataPoint {
  date: string;
  nps: number;
}

export default function CampaignDetails({ params }: { params: { id: string } }) {
  const company = useCompany();
  const [campaign, setCampaign] = useState<CampaignData | null>(null);
  const [feedback, setFeedback] = useState<FeedbackData[]>([]);
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);

  useEffect(() => {
    fetchCampaignData();
  }, [params.id]);

  const fetchCampaignData = async () => {
    try {
      const response = await fetch(`/api/campaigns/details/${params.id}`);
      const data = await response.json();
      
      if (response.ok) {
        setCampaign(data.campaign);
        setFeedback(data.feedback);
        
        // Calculate stats
        const totalResponses = data.feedback.length;
        
        // Only calculate NPS if the campaign includes NPS questions
        let averageNPS = null;
        if (data.campaign.include_nps) {
          const npsScores = data.feedback
            .filter((f: FeedbackData) => f.nps_score !== null)
            .map((f: FeedbackData) => f.nps_score);
          
          // Calculate proper NPS (-100 to 100 scale)
          if (npsScores.length > 0) {
            const promoters = npsScores.filter((score: number | null) => score !== null && score >= 9).length;
            const detractors = npsScores.filter((score: number | null) => score !== null && score <= 6).length;
            const promoterPercentage = (promoters / npsScores.length) * 100;
            const detractorPercentage = (detractors / npsScores.length) * 100;
            averageNPS = promoterPercentage - detractorPercentage;
          }
        }
        
        const stats: CampaignStats = {
          totalResponses,
          averageNPS,
          responsesWithVoice: data.feedback.filter((f: FeedbackData) => f.transcription).length,
          positiveCount: data.feedback.filter((f: FeedbackData) => f.sentiment === 'positive').length,
          negativeCount: data.feedback.filter((f: FeedbackData) => f.sentiment === 'negative').length,
          neutralCount: data.feedback.filter((f: FeedbackData) => f.sentiment === 'neutral').length,
        };
        
        setStats(stats);
        
        // Prepare chart data if campaign includes NPS
        if (data.campaign.include_nps) {
          const npsDataByDate: Record<string, DailyNpsData> = {};
          
          // Group feedback by date and count promoters/detractors
          data.feedback.forEach((item: FeedbackData) => {
            if (item.nps_score === null) return;
            
            const date = new Date(item.created_at).toLocaleDateString();
            if (!npsDataByDate[date]) {
              npsDataByDate[date] = { promoters: 0, detractors: 0, total: 0 };
            }
            
            if (item.nps_score >= 9) npsDataByDate[date].promoters++;
            if (item.nps_score <= 6) npsDataByDate[date].detractors++;
            npsDataByDate[date].total++;
          });
          
          // Convert to array for the chart
          const chartPoints: ChartDataPoint[] = Object.entries(npsDataByDate)
            .map(([dateStr, data]) => {
              const promoterPct = (data.promoters / data.total) * 100;
              const detractorPct = (data.detractors / data.total) * 100;
              const npsScore = promoterPct - detractorPct;
              return {
                date: dateStr,
                nps: npsScore
              };
            })
            .sort((a: ChartDataPoint, b: ChartDataPoint) => 
              new Date(a.date).getTime() - new Date(b.date).getTime()
            );
          
          setChartData(chartPoints);
        }
      }
    } catch (error) {
      console.error('Error fetching campaign data:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    if (!campaign || !feedback) return;

    // Prepare feedback data
    const feedbackData = feedback.map(feedback => {
      // Base feedback data
      const baseData: Record<string, any> = {
        'Date': new Date(feedback.created_at).toLocaleDateString(),
        'Voice Feedback': feedback.transcription || '',
        'Sentiment': feedback.sentiment || ''
      };

      // Add NPS score if campaign includes NPS
      if (campaign.include_nps) {
        baseData['NPS Score'] = feedback.nps_score;
      }

      // Add question responses
      if (feedback.question_responses) {
        feedback.question_responses.forEach(response => {
          baseData[`Question ${response.question_id}`] = response.response_value;
        });
      }

      return baseData;
    });

    // Create workbook and add worksheets
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(feedbackData);
    XLSX.utils.book_append_sheet(wb, ws, campaign.name);

    // Generate Excel file
    XLSX.writeFile(wb, `${campaign.name}-feedback-export-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (loading) {
    return <div className="p-8">Loading campaign data...</div>;
  }

  if (!campaign) {
    return <div className="p-8">Campaign not found</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <Link 
          href="/dashboard/campaigns"
          className="text-blue-600 hover:text-blue-800 flex items-center gap-1 mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Campaigns
        </Link>
        
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold">{campaign.name}</h1>
            <p className="text-gray-600 mt-1">
              {campaign.start_date && campaign.end_date 
                ? `${new Date(campaign.start_date).toLocaleDateString()} - ${new Date(campaign.end_date).toLocaleDateString()}`
                : 'No date range set'
              }
            </p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            campaign.active 
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          }`}>
            {campaign.active ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 mb-8">
        <button
          onClick={exportToExcel}
          className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded transition-colors"
        >
          Export to Excel
        </button>
        
        <button
          onClick={() => window.location.href = `/api/auth/google/url?campaignId=${params.id}`}
          className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded transition-colors"
        >
          Connect Google Sheets
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Total Responses</h3>
            <p className="text-3xl font-semibold">{stats.totalResponses}</p>
          </div>
          {campaign.include_nps && stats.averageNPS !== null && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500">NPS Score</h3>
              <p className="text-3xl font-semibold">{stats.averageNPS.toFixed(1)}</p>
              <p className="text-xs text-gray-500">Range: -100 to 100</p>
            </div>
          )}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Voice Responses</h3>
            <p className="text-3xl font-semibold">{stats.responsesWithVoice}</p>
          </div>
        </div>
      )}

      {/* NPS Trend Chart - Only show if campaign includes NPS */}
      {campaign.include_nps && chartData.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">NPS Score Trend</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis 
                  domain={[-100, 100]} 
                  ticks={[-100, -50, 0, 50, 100]} 
                  label={{ value: 'NPS Score', angle: -90, position: 'insideLeft' }} 
                />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="nps" 
                  stroke="#2563eb" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Sentiment Analysis */}
      {stats && (stats.positiveCount > 0 || stats.negativeCount > 0 || stats.neutralCount > 0) && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Sentiment Analysis</h2>
          <div className="flex gap-4">
            <div className="flex-1 bg-green-50 p-4 rounded-lg">
              <div className="text-green-700 font-semibold mb-2">Positive</div>
              <div className="text-3xl font-bold text-green-600">{stats.positiveCount}</div>
            </div>
            <div className="flex-1 bg-gray-50 p-4 rounded-lg">
              <div className="text-gray-700 font-semibold mb-2">Neutral</div>
              <div className="text-3xl font-bold text-gray-600">{stats.neutralCount}</div>
            </div>
            <div className="flex-1 bg-red-50 p-4 rounded-lg">
              <div className="text-red-700 font-semibold mb-2">Negative</div>
              <div className="text-3xl font-bold text-red-600">{stats.negativeCount}</div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Feedback Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">Recent Feedback</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                {campaign.include_nps && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">NPS Score</th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sentiment</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Feedback</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {feedback.map((item, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(item.created_at).toLocaleDateString()}
                  </td>
                  {campaign.include_nps && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.nps_score !== null ? (
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          item.nps_score >= 9 ? 'bg-green-100 text-green-800' :
                          item.nps_score >= 7 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {item.nps_score}
                        </span>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.sentiment || 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {item.transcription ? (
                      <div className="max-w-xl">
                        {item.transcription.length > 100 
                          ? `${item.transcription.substring(0, 100)}...` 
                          : item.transcription
                        }
                      </div>
                    ) : (
                      'No voice feedback'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}