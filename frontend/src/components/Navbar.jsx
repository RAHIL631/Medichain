// frontend/src/components/Navbar.jsx
// Premium healthcare navigation bar — light theme
import React, { useState, useEffect } from 'react';
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

  useEffect(() => setMenuOpen(false), [location.pathname]);

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
          <Link to="/" className="flex items-center flex-shrink-0 group">
            <img
              src={mediChainLogo}
              alt="MediChain"
              className="h-10 w-auto object-contain transition-opacity group-hover:opacity-90"
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
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-hc-border text-xs font-medium text-hc-text-muted hover:text-hc-text hover:bg-hc-bg-alt transition-colors"
                    aria-label="Connect wallet"
                    id="navbar-connect-wallet-btn"
                  >
                    <Wallet className="w-3.5 h-3.5" />
                    Connect Wallet
                  </button>
                )}

                <button className="relative p-2 rounded-lg text-hc-text-muted hover:text-hc-text hover:bg-hc-bg-alt transition-colors" aria-label="Notifications">
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-hc-danger rounded-full" aria-hidden="true" />
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
                  className="p-2 rounded-lg text-hc-text-muted hover:text-hc-danger hover:bg-hc-danger-soft transition-all duration-150"
                  title="Sign out"
                  aria-label="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="hc-btn hc-btn-ghost hc-btn-sm">Sign In</Link>
                <Link to="/register" className="hc-btn hc-btn-primary hc-btn-sm">Get Started</Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg text-hc-text-muted hover:bg-hc-bg-alt transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="md:hidden border-t border-hc-border bg-hc-surface px-4 py-4 space-y-1 animate-slide-down">
          {isAuthenticated ? (
            <>
              {/* User info */}
              <div className="flex items-center gap-3 px-3 py-3 mb-2 bg-hc-bg-alt rounded-xl">
                <div className="w-9 h-9 rounded-full bg-hc-blue flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {initials}
                </div>
                <div>
                  <p className="text-sm font-semibold text-hc-text">{user?.name}</p>
                  <p className="text-xs text-hc-text-muted capitalize">{user?.email}</p>
                </div>
              </div>

              {navLinks.map(({ label, path, Icon }) => (
                <Link
                  key={path}
                  to={path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive(path) ? 'bg-hc-blue-soft text-hc-blue font-semibold' : 'text-hc-text-muted hover:text-hc-text'
                  }`}
                >
                  {Icon && <Icon className="w-4 h-4" />}
                  {label}
                </Link>
              ))}

              <div className="pt-2 mt-2 border-t border-hc-border-light">
                <Link to="/profile" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-hc-text hover:bg-hc-bg-alt">
                  <User className="w-4 h-4" /> Profile
                </Link>
                <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-hc-danger hover:bg-hc-danger-soft transition-colors">
                  <LogOut className="w-4 h-4" /> Sign out
                </button>
              </div>
            </>
          ) : (
            <>
              {PUBLIC_NAV.map(({ label, href }) => (
                <a key={href} href={href} className="block px-3 py-2.5 rounded-lg text-sm font-medium text-hc-text hover:bg-hc-bg-alt transition-colors">{label}</a>
              ))}
              <div className="flex gap-2 pt-3 border-t border-hc-border-light mt-2">
                <Link to="/login" className="hc-btn hc-btn-ghost flex-1 justify-center">Sign In</Link>
                <Link to="/register" className="hc-btn hc-btn-primary flex-1 justify-center">Get Started</Link>
              </div>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
