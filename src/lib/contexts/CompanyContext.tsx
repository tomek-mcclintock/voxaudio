// src/lib/contexts/CompanyContext.tsx
'use client';

import { createContext, useContext, ReactNode } from 'react';

export interface CompanyContextType {
  id: string;
  name: string;
  logo_url?: string | null;
  primary_color?: string | null;
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