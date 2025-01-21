'use client';

import Image from 'next/image';

export default function Header() {
  return (
    <header className="bg-white border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <div style={{ position: 'relative', height: '32px', width: '120px' }}>
              <Image
                src="/ruggable-logo.svg"
                alt="Ruggable"
                fill
                style={{ objectFit: 'contain' }}
                priority
              />
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <a 
              href="https://ruggable.co.uk/help" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Help Center
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}