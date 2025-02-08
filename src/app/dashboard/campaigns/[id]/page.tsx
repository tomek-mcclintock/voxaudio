// src/app/dashboard/campaigns/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useCompany } from '@/lib/contexts/CompanyContext';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import GoogleSheetsConnect from '@/components/GoogleSheetsConnect';

interface CampaignData {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  active: boolean;
  created_at: string;
}

interface FeedbackData {
  created_at: string;
  nps_score: number;
  transcription: string | null;
  sentiment: string | null;
}

interface CampaignStats {
  totalResponses: number;
  averageNPS: number;
  responsesWithVoice: number;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
}

export default function CampaignDetails({ params }: { params: { id: string } }) {
  const company = useCompany();
  const [campaign, setCampaign] = useState<CampaignData | null>(null);
  const [feedback, setFeedback] = useState<FeedbackData[]>([]);
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [loading, setLoading] = useState(true);

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
        const npsScores = data.feedback.map((f: FeedbackData) => f.nps_score);
        const averageNPS = totalResponses ? 
          npsScores.reduce((a: number, b: number) => a + b, 0) / totalResponses : 
          0;
        
        const stats: CampaignStats = {
          totalResponses,
          averageNPS,
          responsesWithVoice: data.feedback.filter((f: FeedbackData) => f.transcription).length,
          positiveCount: data.feedback.filter((f: FeedbackData) => f.sentiment === 'positive').length,
          negativeCount: data.feedback.filter((f: FeedbackData) => f.sentiment === 'negative').length,
          neutralCount: data.feedback.filter((f: FeedbackData) => f.sentiment === 'neutral').length,
        };
        
        setStats(stats);
      }
    } catch (error) {
      console.error('Error fetching campaign data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8">Loading campaign data...</div>;
  }

  if (!campaign) {
    return <div className="p-8">Campaign not found</div>;
  }

  // Prepare data for NPS trend chart
  const chartData = feedback
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .map(item => ({
      date: new Date(item.created_at).toLocaleDateString(),
      nps: item.nps_score
    }));

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

      {/* Google Sheets Integration Section */}
      <div className="mb-8">
        <GoogleSheetsConnect 
          campaignId={params.id}
          onConnect={fetchCampaignData}
        />
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Total Responses</h3>
            <p className="text-3xl font-semibold">{stats.totalResponses}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Average NPS</h3>
            <p className="text-3xl font-semibold">{stats.averageNPS.toFixed(1)}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Voice Responses</h3>
            <p className="text-3xl font-semibold">{stats.responsesWithVoice}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Sentiment</h3>
            <div className="flex gap-2 mt-2">
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded">
                +{stats.positiveCount}
              </span>
              <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded">
                ={stats.neutralCount}
              </span>
              <span className="px-2 py-1 bg-red-100 text-red-800 rounded">
                -{stats.negativeCount}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">NPS Trend</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[0, 10]} />
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

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">Recent Feedback</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  NPS Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Sentiment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Feedback
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {feedback.map((item, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(item.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      item.nps_score >= 9 ? 'bg-green-100 text-green-800' :
                      item.nps_score >= 7 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {item.nps_score}
                    </span>
                  </td>
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