// src/components/Header.tsx
'use client';

import Image from 'next/image';
import type { CompanyContextType } from '@/lib/contexts/CompanyContext';

interface HeaderProps {
  companyData?: CompanyContextType | null;
}

export default function Header({ companyData }: HeaderProps) {
  return (
    <header className="bg-white border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            {companyData?.logo_url ? (
              <div style={{ position: 'relative', height: '32px', width: '120px' }}>
                <Image
                  src={companyData.logo_url}
                  alt={companyData.name}
                  fill
                  style={{ objectFit: 'contain' }}
                  priority
                />
              </div>
            ) : (
              <div className="text-xl font-semibold">
                {companyData?.name || 'Feedback'}
              </div>
            )}
          </div>
          {/* Removed the Help Center link div that was here */}
        </div>
      </div>
    </header>
  );
}