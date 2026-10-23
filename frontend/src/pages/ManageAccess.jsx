// frontend/src/pages/ManageAccess.jsx
// MediChain — Premium access management page (light theme)
import React from 'react';
import DashboardLayout from '../components/DashboardLayout';
import AccessManager from '../components/AccessManager';
import AccountConsentManager from '../components/AccountConsentManager';
import { Lock, AlertTriangle, Home, FileText, Brain, BarChart3, User } from 'lucide-react';

const NAV = [
  { label: 'Dashboard', path: '/patient-dashboard', icon: Home     },
  { label: 'Records',   path: '/records',            icon: FileText },
  { label: 'Access',    path: '/access',             icon: Lock     },
  { label: 'AI Health', path: '/ai-dashboard',       icon: Brain    },
  { label: 'Analytics', path: '/analytics',          icon: BarChart3},
  { label: 'Profile',   path: '/profile',            icon: User     },
];

export default function ManageAccess() {
  // wallet gating is handled inside AccessManager itself

  return (
    <DashboardLayout navItems={NAV}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <p className="text-xs text-hc-text-muted font-medium mb-0.5">Access Control</p>
          <h1 className="text-2xl font-bold text-hc-text">Who can access your health data?</h1>
          <p className="text-sm text-hc-text-muted mt-1">
            You control who can view your medical records. Grant or revoke access at any time.
          </p>
        </div>

        <AccountConsentManager />

        {/* Blockchain grants remain available for patients who use a wallet. */}
        <AccessManager />

        {/* Security note */}
        <div className="mt-6 p-4 rounded-xl bg-hc-warning-soft border border-hc-warning/20 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-hc-warning flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-hc-text">Important</p>
            <p className="text-xs text-hc-text-muted mt-0.5 leading-relaxed">
              Account-based approvals allow a verified clinician to view and add records for 30 days,
              and can be revoked here without a wallet. Blockchain grants remain available below for
              patients who use a wallet.
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
