// src/app/feedback/page.tsx
import { Suspense } from 'react';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import FeedbackForm from '@/components/FeedbackForm';
import Header from '@/components/Header';
import type { Campaign } from '@/types/campaign';

export default async function FeedbackPage({
  searchParams,
}: {
  searchParams: { id?: string; OrderID?: string; cid?: string; campaign?: string };
}) {
  const supabase = createServerComponentClient({ cookies });
  let companyData = null;
  let campaignData = null;

  // Get the Order ID from either OrderID or id parameter
  const orderId = searchParams.OrderID || searchParams.id || '';
  
  // Log OrderID for debugging
  console.log('URL parameters:', searchParams);
  console.log('Captured OrderID:', orderId);

  if (searchParams.cid) {
    // Get company data
    const { data: company } = await supabase
      .from('companies')
      .select('id, name, logo_url, primary_color')
      .eq('id', searchParams.cid)
      .single();
    
    companyData = company;

    // If campaign ID is provided, get campaign details
    if (searchParams.campaign) {
      const { data: campaign } = await supabase
        .from('feedback_campaigns')
        .select('*')
        .eq('id', searchParams.campaign)
        .eq('company_id', searchParams.cid)
        .single();

      campaignData = campaign;
    }
  }

  // Check if the link is valid
  const isValid = 
    companyData && 
    (searchParams.campaign ? campaignData : true);

  if (!isValid) {
    return (
      <div className="flex items-center justify-center min-h-full p-4">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Invalid Link</h2>
          <p className="text-gray-600">
            This feedback link appears to be invalid. Please use the link provided in your email.
          </p>
        </div>
      </div>
    );
  }

  // Check if campaign is active
  if (campaignData && !campaignData.active) {
    return (
      <div className="flex items-center justify-center min-h-full p-4">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Campaign Ended</h2>
          <p className="text-gray-600">
            This feedback campaign is no longer active.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header companyData={companyData} />
      
      <main className="flex-1 bg-gray-50">
        <div className="p-4">
          <Suspense
            fallback={
              <div className="flex justify-center items-center h-full">
                <div className="text-gray-600">Loading...</div>
              </div>
            }
          >
            <FeedbackForm 
              orderId={orderId} 
              companyId={searchParams.cid || ''}
              campaignId={searchParams.campaign}
              companyData={companyData}
              campaignData={campaignData as Campaign}
            />
          </Suspense>
        </div>
      </main>
    </div>
  );
}