'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { PropsWithChildren } from 'react';

const NAV_ITEMS = [
  { href: '/', label: 'Overview' },
  { href: '/setup', label: 'Setup' },
  { href: '/vehicles', label: 'Vehicles' },
  { href: '/listings', label: 'Listings' },
  { href: '/stale', label: 'Stale Queue' },
  { href: '/leads', label: 'Leads' },
  { href: '/reports', label: 'Reports' },
  { href: '/settings', label: 'Settings' },
  { href: '/assignments', label: 'Assignments' }
];

export function AppShell({ children }: PropsWithChildren) {
  const pathname = usePathname();

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="brand-lockup">
          <p className="eyebrow">LotPilot Beta</p>
          <h1>Dealer Console</h1>
          <p className="muted">
            Marketplace-first inventory reliability for one dealer and one rooftop at a time.
          </p>
        </div>
        <nav className="nav-stack">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link key={item.href} href={item.href} className={`nav-link ${active ? 'is-active' : ''}`}>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="app-main">{children}</main>
    </div>
  );
}
