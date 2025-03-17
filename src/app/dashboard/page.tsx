// src/app/dashboard/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useCompany } from '@/lib/contexts/CompanyContext';

interface FeedbackEntry {
  campaign_id: string;
  voice_file_url: string | null;
  feedback_campaigns: {
    name: string;
  };
}

interface CampaignSummary {
  id: string;
  name: string;
  responseCount: number;
}

interface DashboardData {
  totalResponses: number;
  voiceRecordings: number;
  campaigns: CampaignSummary[];
}

export default function DashboardPage() {
  const company = useCompany();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      const timestamp = new Date().getTime();
      const response = await fetch(`/api/dashboard?timestamp=${timestamp}`, {
        cache: 'no-store',
        next: { revalidate: 0 },
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const result = await response.json();
      
      // Count total responses and voice recordings
      let totalResponses = 0;
      let voiceRecordings = 0;
      
      // Process campaign data
      const campaignData: Record<string, CampaignSummary> = {};
      
      result.recentFeedback.forEach((feedback: FeedbackEntry) => {
        totalResponses++;
        if (feedback.voice_file_url) {
          voiceRecordings++;
        }
        
        // Count responses per campaign
        const campaignId = feedback.campaign_id;
        if (!campaignData[campaignId]) {
          campaignData[campaignId] = {
            id: campaignId,
            name: feedback.feedback_campaigns.name,
            responseCount: 0
          };
        }
        campaignData[campaignId].responseCount++;
      });
      
      setData({
        totalResponses,
        voiceRecordings,
        campaigns: Object.values(campaignData)
      });
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const intervalId = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(intervalId);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading dashboard...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-red-600">{error || 'Failed to load data'}</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-8">{company.name} Feedback Dashboard</h1>
      
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-2">Total Responses</h3>
          <p className="text-3xl font-bold">{data.totalResponses}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-2">Voice Recordings</h3>
          <p className="text-3xl font-bold">{data.voiceRecordings}</p>
        </div>
      </div>

      {/* Campaign List */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Active Campaigns</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Campaign Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Responses</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.campaigns.map((campaign) => (
                <tr key={campaign.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <a href={`/dashboard/campaigns/${campaign.id}`} className="text-blue-600 hover:underline">
                      {campaign.name}
                    </a>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {campaign.responseCount}
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