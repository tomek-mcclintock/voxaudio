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
  searchParams: { [key: string]: string };
}) {
  const supabase = createServerComponentClient({ cookies });
  let companyData = null;
  let campaignData = null;

  // Log all URL parameters for debugging
  console.log('URL parameters:', searchParams);

  // Find the order ID parameter regardless of case
  const orderIdParam = Object.keys(searchParams).find(
    key => key.toLowerCase() === 'orderid'
  );
  
  // Get the order ID from the case-insensitive parameter or fallback to 'id'
  const orderId = orderIdParam 
    ? searchParams[orderIdParam] 
    : (searchParams.id || '');
  
  console.log('Captured OrderID:', orderId);

  // Get company ID (cid) parameter
  const cidParam = Object.keys(searchParams).find(
    key => key.toLowerCase() === 'cid'
  );
  const companyId = cidParam ? searchParams[cidParam] : '';

  // Get campaign parameter
  const campaignParam = Object.keys(searchParams).find(
    key => key.toLowerCase() === 'campaign'
  );
  const campaignId = campaignParam ? searchParams[campaignParam] : '';

  if (companyId) {
    // Get company data
    const { data: company } = await supabase
      .from('companies')
      .select('id, name, logo_url, primary_color')
      .eq('id', companyId)
      .single();
    
    companyData = company;

    // If campaign ID is provided, get campaign details
    if (campaignId) {
      const { data: campaign } = await supabase
        .from('feedback_campaigns')
        .select('*')
        .eq('id', campaignId)
        .eq('company_id', companyId)
        .single();

      campaignData = campaign;
    }
  }

  // Check if the link is valid
  const isValid = 
    companyData && 
    (campaignId ? campaignData : true);

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
              companyId={companyId}
              campaignId={campaignId}
              companyData={companyData}
              campaignData={campaignData as Campaign}
            />
          </Suspense>
        </div>
      </main>
    </div>
  );
}