// frontend/src/components/Sidebar.jsx
// Premium healthcare sidebar — light theme
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Activity, ChevronLeft, ChevronRight, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ navItems = [] }) {
  const { logout } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`flex flex-col bg-hc-surface border-r border-hc-border transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-60'
      } min-h-screen flex-shrink-0`}
      aria-label="Sidebar navigation"
    >
      {/* Logo */}
      <div className={`flex items-center gap-2.5 h-16 px-4 border-b border-hc-border-light ${collapsed ? 'justify-center' : ''}`}>
        <div className="w-8 h-8 bg-hc-blue rounded-lg flex items-center justify-center flex-shrink-0">
          <Activity className="w-4 h-4 text-white" />
        </div>
        {!collapsed && <span className="text-sm font-bold text-hc-text">MediChain</span>}
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map(({ label, path, icon: Icon }) => {
          const active = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              title={collapsed ? label : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                active
                  ? 'bg-hc-blue-soft text-hc-blue font-semibold shadow-xs'
                  : 'text-hc-text-muted hover:bg-hc-bg-alt hover:text-hc-text'
              } ${collapsed ? 'justify-center px-2' : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              {Icon && <span className="w-5 h-5 flex-shrink-0">{typeof Icon === 'function' ? <Icon className="w-5 h-5" /> : Icon}</span>}
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-hc-border-light p-2 space-y-1">
        <button
          onClick={logout}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-hc-text-muted hover:text-hc-danger hover:bg-hc-danger-soft transition-all duration-150 ${
            collapsed ? 'justify-center px-2' : ''
          }`}
          title={collapsed ? 'Sign out' : undefined}
          aria-label="Sign out"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && 'Sign out'}
        </button>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-hc-text-muted hover:bg-hc-bg-alt transition-colors ${
            collapsed ? 'justify-center px-2' : ''
          }`}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <><ChevronLeft className="w-4 h-4" /><span>Collapse</span></>}
        </button>
      </div>
    </aside>
  );
}

