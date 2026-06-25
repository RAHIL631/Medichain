import React from 'react';
import { NavLink } from 'react-router-dom';

const Sidebar = ({ role, navItems }) => {
  return (
    <div className="w-64 min-h-screen bg-medichain-bg-dark/80 backdrop-blur-xl border-r border-medichain-border flex flex-col p-6 sticky top-0 h-screen">
      {/* Brand Logo */}
      <div className="mb-12 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-blue to-accent-cyan flex items-center justify-center neon-glow">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <span className="text-xl font-display font-bold bg-gradient-to-r from-accent-blue to-accent-cyan bg-clip-text text-transparent">
          MediChain
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-grow space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `
              flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300
              ${isActive 
                ? 'bg-accent-blue/20 text-accent-cyan border border-accent-cyan/30 shadow-[0_0_15px_rgba(34,211,238,0.1)]' 
                : 'text-text-secondary hover:text-text-primary hover:bg-medichain-surface/50'}
            `}
          >
            <span className="w-6 h-6">{item.icon}</span>
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User Info / Wallet */}
      <div className="mt-auto pt-6 border-t border-medichain-border">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-medichain-surface border border-medichain-border flex items-center justify-center text-accent-cyan font-bold italic">
            {role[0]}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-bold truncate text-text-primary">Alex Johnson</p>
            <p className="text-xs text-text-secondary truncate uppercase">{role}</p>
          </div>
        </div>
        <div className="bg-medichain-bg-dark/50 border border-medichain-border rounded-lg px-3 py-2 flex items-center justify-between group cursor-pointer hover:border-accent-cyan/50 transition-all">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-2 h-2 rounded-full bg-status-success animate-pulse"></div>
            <span className="text-[10px] text-text-secondary font-mono truncate">0x7f3a...b19c</span>
          </div>
          <svg className="w-3 h-3 text-text-secondary group-hover:text-accent-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
