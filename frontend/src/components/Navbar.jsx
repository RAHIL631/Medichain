// frontend/src/components/Navbar.jsx
// Premium healthcare navigation bar — light theme
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWalletContext } from '../context/WalletContext';
import {
  Shield, Bell, LogOut, User, Menu, X,
  FileText, Lock, Brain, Home, Heart, Stethoscope, Wallet
} from 'lucide-react';
import mediChainLogo from '../medichain-logo.png';

const PATIENT_NAV = [
  { label: 'Dashboard',   path: '/patient-dashboard', Icon: Home        },
  { label: 'My Records',  path: '/records',            Icon: FileText    },
  { label: 'Access',      path: '/access',             Icon: Lock        },
  { label: 'AI Insights', path: '/ai-dashboard',       Icon: Brain       },
  { label: 'Health Risk', path: '/health-risk',        Icon: Heart       },
];

const DOCTOR_NAV = [
  { label: 'Doctor Portal', path: '/doctor-dashboard', Icon: Stethoscope },
  { label: 'AI CDSS',       path: '/ai-dashboard',     Icon: Brain       },
];

const PUBLIC_NAV = [
  { label: 'Features',     href: '#features'     },
  { label: 'How it Works', href: '#how-it-works' },
  { label: 'Security',     href: '#security'     },
];

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const { isConnected, shortAddress, connectWallet } = useWalletContext();
  const location = useLocation();
  const [menuOpen, setMenuOpen]   = useState(false);
  const [scrolled, setScrolled]   = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    closeMenu();
  }, [location.pathname, closeMenu]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') closeMenu();
    };
    if (menuOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [menuOpen, closeMenu]);

  const isActive = (path) => location.pathname === path;

  const navLinks = !isAuthenticated ? PUBLIC_NAV
    : user?.role === 'patient' ? PATIENT_NAV
    : (user?.role === 'doctor' || user?.role === 'hospital') ? DOCTOR_NAV
    : [];

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  return (
    <nav className={`sticky top-0 z-50 bg-hc-surface transition-shadow duration-200 ${scrolled ? 'shadow-hc-card' : 'border-b border-hc-border-light'}`}
      role="navigation" aria-label="Main navigation"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center flex-shrink-0 group" onClick={closeMenu}>
            <img
              src={mediChainLogo}
              alt="MediChain"
              className="h-9 sm:h-10 w-auto object-contain transition-opacity group-hover:opacity-90"
            />
          </Link>

          {/* Desktop center nav */}
          <div className="hidden md:flex items-center gap-1">
            {isAuthenticated ? navLinks.map(({ label, path, Icon }) => (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive(path)
                    ? 'bg-hc-blue-soft text-hc-blue font-semibold'
                    : 'text-hc-text-muted hover:text-hc-text hover:bg-hc-bg-alt'
                }`}
                aria-current={isActive(path) ? 'page' : undefined}
              >
                {Icon && <Icon className="w-4 h-4" />}
                {label}
              </Link>
            )) : PUBLIC_NAV.map(({ label, href }) => (
              <a
                key={href}
                href={href}
                className="px-3 py-2 rounded-lg text-sm font-medium text-hc-text-muted hover:text-hc-text hover:bg-hc-bg-alt transition-all duration-150"
              >
                {label}
              </a>
            ))}
          </div>

          {/* Desktop right section */}
          <div className="hidden md:flex items-center gap-2">
            {/* Secure badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-hc-success-soft text-hc-success text-xs font-medium mr-1">
              <Shield className="w-3 h-3" />
              <span>Secured</span>
            </div>

            {isAuthenticated ? (
              <>
                {/* Optional wallet connect — secondary action */}
                {isConnected ? (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-hc-success/30 bg-hc-success-soft text-xs font-semibold text-hc-success">
                    <div className="w-1.5 h-1.5 rounded-full bg-hc-success" />
                    {shortAddress}
                  </div>
                ) : (
                  <button
                    onClick={connectWallet}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-hc-border text-xs font-medium text-hc-text-muted hover:text-hc-text hover:bg-hc-bg-alt transition-colors min-h-[36px]"
                    aria-label="Connect wallet"
                    id="navbar-connect-wallet-btn"
                  >
                    <Wallet className="w-3.5 h-3.5" />
                    Connect Wallet
                  </button>
                )}

                <button className="relative p-2 rounded-lg text-hc-text-muted hover:text-hc-text hover:bg-hc-bg-alt transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center" aria-label="Notifications">
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-2 right-2 w-2 h-2 bg-hc-danger rounded-full" aria-hidden="true" />
                </button>

                <Link to="/profile" className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-hc-bg-alt transition-colors group">
                  <div className="w-8 h-8 rounded-full bg-hc-blue flex items-center justify-center text-white text-xs font-bold">
                    {initials}
                  </div>
                  <div className="text-left hidden lg:block">
                    <p className="text-xs font-semibold text-hc-text leading-none">{user?.name?.split(' ')[0]}</p>
                    <p className="text-[10px] text-hc-text-muted capitalize">{user?.role}</p>
                  </div>
                </Link>

                <button
                  onClick={logout}
                  className="p-2 rounded-lg text-hc-text-muted hover:text-hc-danger hover:bg-hc-danger-soft transition-all duration-150 min-w-[40px] min-h-[40px] flex items-center justify-center"
                  title="Sign out"
                  aria-label="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="hc-btn hc-btn-ghost hc-btn-sm min-h-[40px]">Sign In</Link>
                <Link to="/register" className="hc-btn hc-btn-primary hc-btn-sm min-h-[40px]">Get Started</Link>
              </>
            )}
          </div>

          {/* Mobile hamburger button - min 44x44 */}
          <button
            className="md:hidden w-11 h-11 flex items-center justify-center rounded-xl text-hc-text-muted hover:bg-hc-bg-alt active:bg-hc-border-light transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Backdrop Overlay */}
      {menuOpen && (
        <div
          className="md:hidden fixed inset-0 top-16 z-40 bg-hc-navy/40 backdrop-blur-xs animate-fade-in"
          onClick={closeMenu}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer */}
      {menuOpen && (
        <div 
          className="md:hidden fixed inset-x-0 top-16 z-50 max-h-[calc(100vh-4rem)] overflow-y-auto border-b border-hc-border bg-hc-surface px-4 py-5 shadow-hc-card-lg animate-slide-down"
          style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}
        >
          {isAuthenticated ? (
            <>
              {/* User info */}
              <div className="flex items-center gap-3 px-3.5 py-3 mb-3 bg-hc-bg-alt rounded-xl border border-hc-border-light">
                <div className="w-10 h-10 rounded-full bg-hc-blue flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-hc-text truncate">{user?.name}</p>
                  <p className="text-xs text-hc-text-muted truncate">{user?.email}</p>
                </div>
                <span className="hc-badge hc-badge-primary capitalize text-[10px]">{user?.role}</span>
              </div>

              <div className="space-y-1">
                {navLinks.map(({ label, path, Icon }) => (
                  <Link
                    key={path}
                    to={path}
                    onClick={closeMenu}
                    className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-colors min-h-[44px] ${
                      isActive(path) ? 'bg-hc-blue-soft text-hc-blue font-bold' : 'text-hc-text hover:bg-hc-bg-alt'
                    }`}
                  >
                    {Icon && <Icon className="w-5 h-5 flex-shrink-0" />}
                    <span>{label}</span>
                  </Link>
                ))}
              </div>

              <div className="pt-3 mt-3 border-t border-hc-border-light space-y-1">
                <Link 
                  to="/profile" 
                  onClick={closeMenu}
                  className="flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium text-hc-text hover:bg-hc-bg-alt min-h-[44px]"
                >
                  <User className="w-5 h-5 flex-shrink-0 text-hc-text-muted" /> 
                  <span>Profile & Wallet</span>
                </Link>
                <button 
                  onClick={() => { logout(); closeMenu(); }} 
                  className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium text-hc-danger hover:bg-hc-danger-soft transition-colors min-h-[44px]"
                >
                  <LogOut className="w-5 h-5 flex-shrink-0" /> 
                  <span>Sign out</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1 mb-4">
                <a
                  href="/"
                  onClick={closeMenu}
                  className="block px-3.5 py-3 rounded-xl text-sm font-semibold text-hc-text hover:bg-hc-bg-alt transition-colors min-h-[44px] flex items-center"
                >
                  Home
                </a>
                {PUBLIC_NAV.map(({ label, href }) => (
                  <a 
                    key={href} 
                    href={href} 
                    onClick={closeMenu} 
                    className="block px-3.5 py-3 rounded-xl text-sm font-semibold text-hc-text hover:bg-hc-bg-alt transition-colors min-h-[44px] flex items-center"
                  >
                    {label}
                  </a>
                ))}
              </div>

              <div className="flex flex-col gap-2.5 pt-3 border-t border-hc-border-light">
                <Link to="/login" onClick={closeMenu} className="hc-btn hc-btn-ghost w-full justify-center min-h-[48px] text-base">
                  Sign In
                </Link>
                <Link to="/register" onClick={closeMenu} className="hc-btn hc-btn-primary w-full justify-center min-h-[48px] text-base">
                  Get Started
                </Link>
              </div>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
