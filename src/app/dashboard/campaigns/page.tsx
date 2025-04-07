// src/app/dashboard/campaigns/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useCompany } from '@/lib/contexts/CompanyContext';
import { Plus, Link as LinkIcon, BarChart, Trash2 } from 'lucide-react';
import Link from 'next/link';

// Define a type for the campaign
interface Campaign {
  id: string;
  name: string;
  questions?: any[];
  start_date?: string | null;
  end_date?: string | null;
  active: boolean;
}

export default function CampaignsPage() {
  const company = useCompany();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<Campaign | null>(null);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const response = await fetch('/api/campaigns');
      const data = await response.json();
      if (response.ok) {
        setCampaigns(data.campaigns);
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyFeedbackLink = async (campaignId: string) => {
    const link = `${window.location.origin}/feedback?cid=${company.id}&campaign=${campaignId}`;
    await navigator.clipboard.writeText(link);
    alert('Feedback link copied to clipboard!');
  };

  const handleDeleteClick = (campaign: Campaign) => {
    setCampaignToDelete(campaign);
    setShowConfirmDelete(true);
  };

  const confirmDelete = async () => {
    if (!campaignToDelete) return;
    
    try {
      const response = await fetch(`/api/campaigns/${campaignToDelete.id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        // Remove the campaign from the state
        setCampaigns(campaigns.filter((c) => c.id !== campaignToDelete.id));
        setShowConfirmDelete(false);
        setCampaignToDelete(null);
      } else {
        alert('Failed to delete campaign. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting campaign:', error);
      alert('An error occurred while deleting the campaign.');
    }
  };

  const cancelDelete = () => {
    setShowConfirmDelete(false);
    setCampaignToDelete(null);
  };

  if (loading) {
    return <div className="p-8">Loading campaigns...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Feedback Campaigns</h1>
        <Link
          href="/dashboard/campaigns/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          New Campaign
        </Link>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDelete && campaignToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Delete Campaign</h3>
            <p className="mb-6">
              Are you sure you want to delete the campaign "{campaignToDelete.name}"? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Campaign Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Questions
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date Range
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {campaigns.map((campaign) => (
              <tr key={campaign.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Link 
                    href={`/dashboard/campaigns/${campaign.id}`}
                    className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                  >
                    {campaign.name}
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">
                    {campaign.questions?.length || 0} questions
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">
                    {campaign.start_date ? new Date(campaign.start_date).toLocaleDateString() : 'No start date'} 
                    {' - '}
                    {campaign.end_date ? new Date(campaign.end_date).toLocaleDateString() : 'No end date'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    campaign.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {campaign.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex gap-3">
                    <button
                      onClick={() => copyFeedbackLink(campaign.id)}
                      className="text-blue-600 hover:text-blue-900"
                      title="Copy feedback link"
                    >
                      <LinkIcon className="w-5 h-5" />
                    </button>
                    <Link
                      href={`/dashboard/campaigns/${campaign.id}`}
                      className="text-blue-600 hover:text-blue-900"
                      title="View campaign analytics"
                    >
                      <BarChart className="w-5 h-5" />
                    </Link>
                    <button
                      onClick={() => handleDeleteClick(campaign)}
                      className="text-red-600 hover:text-red-900"
                      title="Delete campaign"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}