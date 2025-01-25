// src/lib/contexts/CompanyContext.tsx
'use client';

import { createContext, useContext, ReactNode } from 'react';

interface CompanyContextType {
  id: string;
  name: string;
  logo_url?: string;
  primary_color?: string;
}

const CompanyContext = createContext<CompanyContextType | null>(null);

export function CompanyProvider({ 
  children, 
  company 
}: { 
  children: ReactNode;
  company: CompanyContextType;
}) {
  return (
    <CompanyContext.Provider value={company}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
}

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