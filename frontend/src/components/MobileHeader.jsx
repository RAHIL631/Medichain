// frontend/src/components/MobileHeader.jsx
// MediChain — Purpose-built mobile dashboard header.
// Shown only on mobile (< lg). Has logo, hamburger, notification icon, avatar.
// Tapping hamburger opens a full slide-in drawer with nav + logout.
// Drawer closes on: nav item click, outside tap, Escape key.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWalletContext } from '../context/WalletContext';
import mediChainLogo from '../medichain-logo.png';
import {
  Menu, X, LogOut, Bell, User,
  Home, FileText, Lock, Brain, BarChart3,
  Stethoscope, Activity, Heart, Upload, FileCheck,
  Wallet, ChevronRight
} from 'lucide-react';

const PATIENT_NAV = [
  { label: 'Dashboard',  path: '/patient-dashboard', Icon: Home     },
  { label: 'Records',    path: '/records',            Icon: FileText },
  { label: 'Access',     path: '/access',             Icon: Lock     },
  { label: 'AI Insights',path: '/ai-dashboard',       Icon: Brain    },
  { label: 'Health Risk',path: '/health-risk',        Icon: Heart    },
  { label: 'Analytics',  path: '/analytics',          Icon: BarChart3},
  { label: 'Profile',    path: '/profile',            Icon: User     },
];

const DOCTOR_NAV = [
  { label: 'Dashboard',   path: '/doctor-dashboard',   Icon: Stethoscope },
  { label: 'Upload Rx',   path: '/upload-prescription', Icon: Upload      },
  { label: 'AI CDSS',     path: '/ai-dashboard',        Icon: Brain       },
  { label: 'Rx Validator',path: '/prescription-validator',Icon: FileCheck  },
  { label: 'Health Risk', path: '/health-risk',         Icon: Heart       },
  { label: 'Analytics',   path: '/analytics',           Icon: Activity    },
  { label: 'Profile',     path: '/profile',             Icon: User        },
];

export default function MobileHeader() {
  const { user, logout } = useAuth();
  const { isConnected, shortAddress } = useWalletContext();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef(null);

  const navItems = user?.role === 'patient' ? PATIENT_NAV
    : (user?.role === 'doctor' || user?.role === 'hospital') ? DOCTOR_NAV
    : PATIENT_NAV;

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  // Close on Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') closeDrawer(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [closeDrawer]);

  // Close on route change
  useEffect(() => { closeDrawer(); }, [location.pathname, closeDrawer]);

  // Lock body scroll when drawer open
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  return (
    <>
      {/* ── Header bar ──────────────────────────────────────────────────── */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between h-14 px-4 bg-hc-surface border-b border-hc-border-light">
        {/* Left — Logo */}
        <Link to="/" className="flex items-center flex-shrink-0" aria-label="MediChain home">
          <img
            src={mediChainLogo}
            alt="MediChain"
            className="h-8 w-auto object-contain"
          />
        </Link>

        {/* Right — actions */}
        <div className="flex items-center gap-1">
          {/* Wallet status pill */}
          {isConnected && (
            <div className="hidden xs:flex items-center gap-1 px-2 py-1 rounded-full bg-hc-success-soft border border-hc-success/20 text-[10px] font-semibold text-hc-success">
              <div className="w-1.5 h-1.5 rounded-full bg-hc-success flex-shrink-0" />
              <span className="font-mono">{shortAddress}</span>
            </div>
          )}

          {/* Notifications */}
          <button
            className="relative w-10 h-10 flex items-center justify-center rounded-xl text-hc-text-muted hover:bg-hc-bg-alt transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-hc-danger rounded-full" aria-hidden="true" />
          </button>

          {/* Avatar */}
          <Link
            to="/profile"
            className="w-10 h-10 rounded-full bg-hc-blue flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            aria-label="My profile"
          >
            {initials}
          </Link>

          {/* Hamburger */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="w-10 h-10 flex items-center justify-center rounded-xl text-hc-text-muted hover:bg-hc-bg-alt transition-colors"
            aria-label="Open navigation menu"
            aria-expanded={drawerOpen}
            aria-controls="mobile-nav-drawer"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* ── Drawer overlay ───────────────────────────────────────────────── */}
      {drawerOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-hc-navy/40 backdrop-blur-sm animate-fade-in"
          onClick={closeDrawer}
          aria-hidden="true"
        />
      )}

      {/* ── Drawer panel ─────────────────────────────────────────────────── */}
      <aside
        id="mobile-nav-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={`lg:hidden fixed top-0 right-0 bottom-0 z-50 w-72 max-w-[85vw] flex flex-col bg-hc-surface border-l border-hc-border shadow-hc-card-lg transition-transform duration-300 ${
          drawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        ref={drawerRef}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-hc-border-light flex-shrink-0">
          <img src={mediChainLogo} alt="MediChain" className="h-8 w-auto object-contain" />
          <button
            onClick={closeDrawer}
            className="w-10 h-10 flex items-center justify-center rounded-xl text-hc-text-muted hover:bg-hc-bg-alt transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User info */}
        <div className="px-4 py-4 border-b border-hc-border-light flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-hc-blue flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-hc-text truncate">{user?.name}</p>
              <p className="text-xs text-hc-text-muted truncate">{user?.email}</p>
              <span className="hc-badge hc-badge-primary mt-1 capitalize">{user?.role}</span>
            </div>
          </div>
          {/* Wallet status */}
          <div className="mt-3 flex items-center gap-2">
            {isConnected ? (
              <div className="flex items-center gap-1.5 text-xs text-hc-success font-semibold">
                <div className="w-1.5 h-1.5 rounded-full bg-hc-success" />
                <span className="font-mono">{shortAddress}</span>
                <span className="text-hc-text-muted font-normal">· Sepolia</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-hc-text-muted">
                <Wallet className="w-3.5 h-3.5" />
                <span>Wallet not connected</span>
              </div>
            )}
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-3 px-3" aria-label="Drawer navigation">
          <div className="space-y-0.5">
            {navItems.map(({ label, path, Icon }) => {
              const isActive = location.pathname === path;
              return (
                <NavLink
                  key={path}
                  to={path}
                  onClick={closeDrawer}
                  className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-hc-blue-soft text-hc-blue font-semibold'
                      : 'text-hc-text-muted hover:bg-hc-bg-alt hover:text-hc-text'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1">{label}</span>
                  {isActive && <ChevronRight className="w-4 h-4 opacity-50" />}
                </NavLink>
              );
            })}
          </div>
        </nav>

        {/* Footer actions */}
        <div className="border-t border-hc-border-light px-3 py-3 flex-shrink-0 space-y-1">
          <button
            onClick={() => { logout(); closeDrawer(); }}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-hc-danger hover:bg-hc-danger-soft transition-colors"
            aria-label="Sign out"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
