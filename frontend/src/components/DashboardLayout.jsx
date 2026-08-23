// frontend/src/components/DashboardLayout.jsx
// Premium healthcare dashboard layout — light theme
import React from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

export default function DashboardLayout({ children, navItems = [] }) {
  // Map navItems to use Lucide icons if they come in as SVG elements
  const mappedNav = navItems.map(item => ({
    ...item,
    icon: item.icon,
  }));

  return (
    <div className="flex min-h-screen bg-hc-bg">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex">
        <Sidebar navItems={mappedNav} />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile navbar */}
        <div className="lg:hidden">
          <Navbar />
        </div>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
