// src/components/UserMenu.tsx
'use client';

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { LogOut, ChevronDown } from 'lucide-react';

export default function UserMenu({ userEmail }: { userEmail: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const supabase = createClientComponentClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
      >
        <span className="text-sm">{userEmail}</span>
        <ChevronDown className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 py-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5">
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      )}
    </div>
  );
}

// Update src/app/dashboard/layout.tsx
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { CompanyProvider, CompanyContextType } from '@/lib/contexts/CompanyContext';
import { redirect } from 'next/navigation';
import DashboardNav from '@/components/DashboardNav';
import UserMenu from '@/components/UserMenu';

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
              <UserMenu userEmail={user.email || ''} />
            </div>
          </div>
        </header>
        <DashboardNav />
        <main>{children}</main>
      </div>
    </CompanyProvider>
  );
}