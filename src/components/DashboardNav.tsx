// src/components/DashboardNav.tsx
'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { BarChart2, MessageSquare, Settings } from 'lucide-react';

const navItems = [
  {
    name: 'Overview',
    href: '/dashboard',
    icon: BarChart2
  },
  {
    name: 'Campaigns',
    href: '/dashboard/campaigns',
    icon: MessageSquare
  },
  {
    name: 'Settings',
    href: '/dashboard/settings',
    icon: Settings
  }
];

export default function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="bg-white border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-8">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-3 py-4 text-sm font-medium border-b-2 ${
                  isActive
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-5 h-5 mr-2" />
                {item.name}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}