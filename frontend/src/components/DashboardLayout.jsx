// frontend/src/components/DashboardLayout.jsx
// MediChain — Premium healthcare dashboard layout
//
// Mobile:  MobileHeader (sticky top) + main content + BottomNav (fixed bottom)
// Desktop: Sidebar (left) + main content (right)
//
// Main content gets bottom padding on mobile to prevent content hiding behind bottom nav.

import React from 'react';
import Sidebar from './Sidebar';
import MobileHeader from './MobileHeader';
import BottomNav from './BottomNav';

export default function DashboardLayout({ children, navItems = [] }) {
  const mappedNav = navItems.map(item => ({ ...item, icon: item.icon }));

  return (
    <div className="flex min-h-screen bg-hc-bg">
      {/* Desktop sidebar — hidden on mobile */}
      <div className="hidden lg:flex">
        <Sidebar navItems={mappedNav} />
      </div>

      {/* Main content column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header — hidden on desktop */}
        <MobileHeader />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {/* Mobile: add bottom padding so content isn't hidden behind BottomNav
              Desktop: standard padding, no bottom nav adjustment needed */}
          <div className="p-4 sm:p-5 lg:p-8 pb-24 lg:pb-8">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile bottom navigation — fixed, hidden on desktop */}
      <BottomNav />
    </div>
  );
}
