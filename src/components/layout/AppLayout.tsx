'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const isAuthPage = pathname === '/login' || pathname === '/register';
  const isStorePage = pathname === '/store' || pathname.startsWith('/store') || pathname === '/checkout';
  const isClientPage = pathname === '/profile' || pathname === '/favoritos';
  const isApiAuth = pathname.startsWith('/api/auth');

  if (isAuthPage || isStorePage || isClientPage || isApiAuth) {
    return <>{children}</>;
  }

  return (
    <div className="app-container">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <div className="main-content">
        <Header collapsed={collapsed} setCollapsed={setCollapsed} />
        <main className="content-body">
          {children}
        </main>
      </div>
    </div>
  );
}
