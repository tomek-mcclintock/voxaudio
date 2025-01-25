// src/app/dashboard/layout.tsx
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { CompanyProvider } from '@/lib/contexts/CompanyContext';
import { redirect } from 'next/navigation';

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

  // Get user's company data
  const { data: userData, error: companyError } = await supabase
    .from('users')
    .select(`
      company_id,
      companies (
        id,
        name,
        logo_url,
        primary_color
      )
    `)
    .eq('email', user.email)
    .single();

  if (companyError || !userData?.companies) {
    redirect('/login');
  }

  return (
    <CompanyProvider company={userData.companies}>
      {children}
    </CompanyProvider>
  );
}