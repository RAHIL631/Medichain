// frontend/src/components/BottomNav.jsx
// MediChain — Fixed bottom navigation for authenticated mobile users.
// Hidden on desktop (lg:hidden). Safe-area aware for iPhone.

import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Home, FileText, Brain, Lock, User, Stethoscope, Activity } from 'lucide-react';

const PATIENT_TABS = [
  { label: 'Home',    path: '/patient-dashboard', Icon: Home     },
  { label: 'Records', path: '/records',            Icon: FileText },
  { label: 'AI',      path: '/ai-dashboard',       Icon: Brain    },
  { label: 'Access',  path: '/access',             Icon: Lock     },
  { label: 'Profile', path: '/profile',            Icon: User     },
];

const DOCTOR_TABS = [
  { label: 'Home',      path: '/doctor-dashboard',  Icon: Stethoscope },
  { label: 'AI CDSS',   path: '/ai-dashboard',      Icon: Brain       },
  { label: 'Analytics', path: '/analytics',         Icon: Activity    },
  { label: 'Profile',   path: '/profile',           Icon: User        },
];

export default function BottomNav() {
  const { user } = useAuth();
  const location = useLocation();

  // Only show for authenticated patient/doctor/hospital users
  if (!user || user.role === 'admin') return null;

  const tabs = (user.role === 'patient') ? PATIENT_TABS
             : (user.role === 'doctor' || user.role === 'hospital') ? DOCTOR_TABS
             : PATIENT_TABS;

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-hc-surface border-t border-hc-border"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        height: 'calc(64px + env(safe-area-inset-bottom, 0px))',
      }}
      aria-label="Mobile bottom navigation"
    >
      <div className="flex items-stretch h-16">
        {tabs.map(({ label, path, Icon }) => {
          const isActive = location.pathname === path ||
            (path !== '/patient-dashboard' && path !== '/doctor-dashboard' &&
             location.pathname.startsWith(path));
          return (
            <NavLink
              key={path}
              to={path}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 min-w-0 transition-colors duration-150 relative"
              style={{ WebkitTapHighlightColor: 'transparent' }}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
            >
              {/* Active indicator bar */}
              {isActive && (
                <div
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-hc-blue"
                  aria-hidden="true"
                />
              )}
              <div
                className={`w-6 h-6 flex items-center justify-center transition-colors duration-150 ${
                  isActive ? 'text-hc-blue' : 'text-hc-text-light'
                }`}
              >
                <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 1.75} />
              </div>
              <span
                className={`text-[10px] font-semibold leading-none transition-colors duration-150 truncate ${
                  isActive ? 'text-hc-blue' : 'text-hc-text-light'
                }`}
              >
                {label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
