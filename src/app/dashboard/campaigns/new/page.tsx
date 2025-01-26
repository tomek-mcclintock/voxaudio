// src/app/dashboard/campaigns/new/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useCompany } from '@/lib/contexts/CompanyContext';
import CampaignForm from '@/components/CampaignForm';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export default function NewCampaignPage() {
  const router = useRouter();
  const company = useCompany();

  const handleSubmit = async (campaignData: any) => {
    try {
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(campaignData),
      });

      if (!response.ok) {
        throw new Error('Failed to create campaign');
      }

      router.push('/dashboard/campaigns');
    } catch (error) {
      console.error('Error creating campaign:', error);
      alert('Failed to create campaign. Please try again.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link 
        href="/dashboard/campaigns"
        className="text-blue-600 hover:text-blue-800 flex items-center gap-1 mb-6"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Campaigns
      </Link>

      <h1 className="text-2xl font-bold mb-6">Create New Campaign</h1>
      
      <div className="bg-white rounded-lg shadow-sm p-6">
        <CampaignForm onSubmit={handleSubmit} />
      </div>
    </div>
  );
}