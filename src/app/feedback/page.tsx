// src/app/feedback/page.tsx
import { Suspense } from 'react';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import FeedbackForm from '@/components/FeedbackForm';
import Header from '@/components/Header';
import type { Campaign } from '@/types/campaign';

export default async function FeedbackPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  // Create regular Supabase client for authenticated operations
  const regularClient = createServerComponentClient({ cookies });
  
  // Create service role client to bypass RLS for public access
  const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );
  
  // Choose which client to use - for feedback page we use service client to bypass RLS
  const supabase = serviceClient;
  
  let companyData = null;
  let campaignData = null;

  // Helper to get param as string
  const getParamAsString = (key: string): string => {
    const value = searchParams[key];
    return typeof value === 'string' ? value : Array.isArray(value) ? value[0] || '' : '';
  };

  // Find the order ID parameter regardless of case
  const orderIdParam = Object.keys(searchParams).find(
    key => key.toLowerCase() === 'orderid'
  );
  
  // Get the order ID from the case-insensitive parameter or fallback to 'id'
  const orderId = orderIdParam 
    ? getParamAsString(orderIdParam) 
    : (getParamAsString('id') || '');
  
  // Get company ID (cid) parameter
  const cidParam = Object.keys(searchParams).find(
    key => key.toLowerCase() === 'cid'
  );
  const companyId = cidParam ? getParamAsString(cidParam) : '';

  // Get campaign parameter
  const campaignParam = Object.keys(searchParams).find(
    key => key.toLowerCase() === 'campaign'
  );
  const campaignId = campaignParam ? getParamAsString(campaignParam) : '';
  
  // Get NPS score from URL if present
  const npsScoreParam = getParamAsString('npsScore');
  const npsScore = npsScoreParam ? parseInt(npsScoreParam, 10) : null;
  
  // Collect all other parameters to pass as metadata
  const additionalParams: Record<string, string> = {};
  Object.keys(searchParams).forEach(key => {
    // Skip the ones we've already handled specifically
    if (!['orderid', 'id', 'cid', 'campaign', 'npsscore'].includes(key.toLowerCase())) {
      additionalParams[key] = getParamAsString(key);
    }
  });

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
              npsScore={npsScore}
              additionalParams={additionalParams}
            />
          </Suspense>
        </div>
      </main>
    </div>
  );
}