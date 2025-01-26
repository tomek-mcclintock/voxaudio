// src/app/dashboard/layout.tsx
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { CompanyProvider, CompanyContextType } from '@/lib/contexts/CompanyContext';
import { redirect } from 'next/navigation';
import DashboardNav from '@/components/DashboardNav';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createServerComponentClient({ cookies });

  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    redirect('/login');
  }

  // First get the user's company_id
  const { data: userData, error: userError2 } = await supabase
    .from('users')
    .select('company_id')
    .eq('email', user.email)
    .single();

  if (userError2 || !userData?.company_id) {
    console.error('User company fetch error:', userError2);
    redirect('/login');
  }

  // Then get the company details
  const { data: companyData, error: companyError } = await supabase
    .from('companies')
    .select('id, name, logo_url, primary_color')
    .eq('id', userData.company_id)
    .single();

  if (companyError || !companyData) {
    console.error('Company fetch error:', companyError);
    redirect('/login');
  }

  const company: CompanyContextType = {
    id: companyData.id,
    name: companyData.name,
    logo_url: companyData.logo_url,
    primary_color: companyData.primary_color
  };

  return (
    <CompanyProvider company={company}>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <h1 className="text-xl font-semibold text-gray-900">{company.name}</h1>
              <div className="flex items-center">
                {/* Add user menu here later */}
              </div>
            </div>
          </div>
        </header>
        <DashboardNav />
        <main>{children}</main>
      </div>
    </CompanyProvider>
  );
}