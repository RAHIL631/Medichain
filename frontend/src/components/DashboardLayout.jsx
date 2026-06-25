import React from 'react';
import Sidebar from './Sidebar';

const DashboardLayout = ({ children, role, navItems }) => {
  return (
    <div className="flex bg-medichain-bg-dark min-h-screen">
      <Sidebar role={role} navItems={navItems} />
      
      <main className="flex-grow p-8 overflow-y-auto">
        {/* Top Header */}
        <div className="flex justify-between items-center mb-10">
          <div>
            <h2 className="text-3xl font-display font-bold">Good Morning, Alex</h2>
            <p className="text-text-secondary mt-1">Blockchain connectivity established</p>
          </div>
          
          <div className="flex gap-4">
            <div className="glass-card px-4 py-2 flex items-center gap-2 border-accent-cyan/20">
              <div className="w-2 h-2 rounded-full bg-status-success shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
              <span className="text-xs font-mono uppercase tracking-tighter">Live Monitor</span>
            </div>
            
            <button className="glass-card p-2 hover:bg-medichain-surface transition-colors">
              <svg className="w-5 h-5 text-accent-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>
          </div>
        </div>

        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;
