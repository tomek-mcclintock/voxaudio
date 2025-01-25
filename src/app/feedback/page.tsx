// src/app/feedback/page.tsx
import { Suspense } from 'react';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import FeedbackForm from '@/components/FeedbackForm';
import Header from '@/components/Header';
import type { CompanyContextType } from '@/lib/contexts/CompanyContext';

interface SearchParams {
  id?: string;
  cid?: string;
}

export default async function FeedbackPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = createServerComponentClient({ cookies });
  let companyData: CompanyContextType | null = null;

  if (searchParams.cid) {
    const { data: company } = await supabase
      .from('companies')
      .select('id, name, logo_url, primary_color')
      .eq('id', searchParams.cid)
      .single();
    
    if (company) {
      companyData = {
        id: company.id,
        name: company.name,
        logo_url: company.logo_url,
        primary_color: company.primary_color
      };
    }
  }

  if (!searchParams.id || !searchParams.cid || !companyData) {
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
              orderId={searchParams.id} 
              companyId={searchParams.cid}
              companyData={companyData}
            />
          </Suspense>
        </div>
      </main>
    </div>
  );
}