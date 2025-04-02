// src/app/privacy/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import EnglishPrivacyPolicy from './english-policy';
import GermanPrivacyPolicy from './german-policy';

export default function PrivacyPage() {
  const searchParams = useSearchParams();
  const [language, setLanguage] = useState<'en' | 'de' | null>(null);

  useEffect(() => {
    // Check for explicit language parameter in URL
    const langParam = searchParams.get('lang');
    
    if (langParam === 'de') {
      setLanguage('de');
      return;
    }
    
    if (langParam === 'en') {
      setLanguage('en');
      return;
    }
    
    // If no explicit language parameter, check browser language
    const browserLang = navigator.language || (navigator as any).userLanguage;
    
    if (browserLang && browserLang.toLowerCase().startsWith('de')) {
      setLanguage('de');
      return;
    }
    
    // Default to English
    setLanguage('en');
  }, [searchParams]);

  // Show loading state until language is determined
  if (language === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg">
          <p className="text-lg">Loading privacy policy...</p>
        </div>
      </div>
    );
  }

  // Render the appropriate policy based on language
  return language === 'de' ? <GermanPrivacyPolicy /> : <EnglishPrivacyPolicy />;
}