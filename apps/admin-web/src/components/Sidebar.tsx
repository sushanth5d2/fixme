'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: '📊' },
  { href: '/fixers', label: 'Fixer Verification', icon: '✅' },
  { href: '/requests', label: 'Repair Requests', icon: '📋' },
  { href: '/complaints', label: 'Complaints', icon: '⚠️' },
  { href: '/categories', label: 'Categories', icon: '📱' },
  { href: '/brands', label: 'Brands', icon: '🏷️' },
  { href: '/reviews', label: 'Reviews', icon: '⭐' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-primary text-white flex flex-col border-r border-gray-800">
      {/* Logo */}
      <div className="p-6 border-b border-gray-700">
        <h1 className="text-xl font-bold">🔧 Fix Me</h1>
        <p className="text-xs text-gray-400 mt-1">Admin Dashboard</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href as any}
              className={clsx(
                'flex items-center gap-3 px-6 py-3 text-sm transition-colors',
                isActive
                  ? 'bg-accent text-white font-medium'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              )}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-700 text-xs text-gray-500">
        Fix Me Admin v1.0
      </div>
    </aside>
  );
}
