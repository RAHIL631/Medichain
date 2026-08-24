// frontend/src/pages/Profile.jsx
// MediChain — Premium profile page (Mobile-First Responsive)
import React, { useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { useWalletContext } from '../context/WalletContext';
import { formatAddress } from '../utils/web3';
import {
  User, Mail, Calendar, Shield, Wallet, CheckCircle,
  Link2, Home, FileText, Lock, Activity
} from 'lucide-react';

const NAV_PATIENT = [
  { label: 'Dashboard', path: '/patient-dashboard', icon: Home     },
  { label: 'Records',   path: '/records',            icon: FileText },
  { label: 'Access',    path: '/access',             icon: Lock     },
  { label: 'Profile',   path: '/profile',            icon: User     },
];
const NAV_DOCTOR = [
  { label: 'Dashboard', path: '/doctor-dashboard', icon: Home },
  { label: 'Profile',   path: '/profile',           icon: User },
];

function InfoRow({ label, value, icon: Icon }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-hc-border-light last:border-0 min-w-0">
      <div className="w-8 h-8 rounded-xl bg-hc-bg-alt flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-hc-text-muted" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] sm:text-xs text-hc-text-muted font-bold uppercase tracking-wide truncate">{label}</p>
        <p className="text-xs sm:text-sm font-semibold text-hc-text mt-0.5 truncate">{value || '—'}</p>
      </div>
    </div>
  );
}

export default function Profile() {
  const { user, updateWallet } = useAuth();
  const { address: account, isConnected: connected, connectWallet: connect } = useWalletContext();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const handleLinkWallet = async () => {
    if (!connected || !account) return;
    setLoading(true);
    try {
      await updateWallet(account);
      setMsg('Wallet successfully linked to your profile.');
    } catch (err) {
      setMsg('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const navItems = user?.role === 'patient' ? NAV_PATIENT : NAV_DOCTOR;
  const initials = user?.name ? user.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase() : 'U';
  const roleLabel = { patient: 'Patient', doctor: 'Doctor', hospital: 'Hospital', admin: 'Administrator' }[user?.role] || user?.role;

  return (
    <DashboardLayout navItems={navItems}>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <p className="text-xs text-hc-text-muted font-medium mb-0.5">Account</p>
          <h1 className="text-xl sm:text-2xl font-bold text-hc-text">Your Profile</h1>
          <p className="text-xs sm:text-sm text-hc-text-muted mt-0.5 sm:mt-1">Manage your health identity and blockchain connection.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
          {/* Left — avatar + role */}
          <div className="space-y-4">
            <div className="hc-card p-5 sm:p-6 text-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-hc-blue flex items-center justify-center text-xl sm:text-2xl font-bold text-white mx-auto mb-3 sm:mb-4 shadow-hc-card">
                {initials}
              </div>
              <p className="font-bold text-sm sm:text-base text-hc-text truncate">{user?.name}</p>
              <span className="hc-badge hc-badge-primary mt-2">{roleLabel}</span>
              {user?.isWalletLinked && (
                <div className="flex items-center justify-center gap-1.5 mt-3 text-xs text-hc-success font-medium">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Blockchain verified</span>
                </div>
              )}
            </div>

            {/* Sepolia info */}
            <div className="hc-card p-4 space-y-2">
              <p className="text-[10px] sm:text-xs font-bold text-hc-text-muted uppercase tracking-wide mb-2.5">Blockchain Identity</p>
              <div className="flex items-center gap-2 text-xs">
                <Activity className="w-3.5 h-3.5 text-hc-violet flex-shrink-0" />
                <span className="text-hc-text-muted">Network: <span className="font-bold text-hc-text">Sepolia</span></span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Shield className="w-3.5 h-3.5 text-hc-violet flex-shrink-0" />
                <span className="text-hc-text-muted">Chain ID: <span className="font-bold text-hc-text">11155111</span></span>
              </div>
            </div>
          </div>

          {/* Right — details + wallet */}
          <div className="md:col-span-2 space-y-4 sm:space-y-5">
            {/* User info */}
            <div className="hc-card p-4 sm:p-6">
              <h3 className="text-xs sm:text-sm font-bold text-hc-text mb-2 uppercase tracking-wide">Account Details</h3>
              <InfoRow label="Full Name"    value={user?.name}  icon={User}     />
              <InfoRow label="Email"        value={user?.email} icon={Mail}     />
              <InfoRow label="Role"         value={roleLabel}   icon={Shield}   />
              <InfoRow label="Member Since" value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'} icon={Calendar} />
            </div>

            {/* Wallet */}
            <div className="hc-card p-4 sm:p-6">
              <h3 className="text-xs sm:text-sm font-bold text-hc-text mb-3 sm:mb-4 uppercase tracking-wide">Blockchain Wallet</h3>

              <div className="p-3.5 sm:p-4 rounded-xl bg-hc-bg-alt border border-hc-border-light flex items-center justify-between mb-3 gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] sm:text-xs text-hc-text-muted font-medium">Linked Healthcare Wallet</p>
                  <p className="text-xs sm:text-sm font-mono font-bold text-hc-text mt-0.5 truncate">
                    {user?.walletAddress ? formatAddress(user.walletAddress) : 'Not linked'}
                  </p>
                </div>
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${user?.walletAddress ? 'bg-hc-success' : 'bg-hc-danger'}`} />
              </div>

              <div className="p-3.5 sm:p-4 rounded-xl bg-hc-bg-alt border border-hc-border-light flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] sm:text-xs text-hc-text-muted font-medium">Active MetaMask</p>
                  <p className="text-xs sm:text-sm font-mono font-bold text-hc-text mt-0.5 truncate">
                    {connected ? formatAddress(account) : 'Not connected'}
                  </p>
                </div>
                {!connected && (
                  <button onClick={connect} className="hc-btn hc-btn-secondary hc-btn-sm min-h-[36px] flex-shrink-0">
                    <Wallet className="w-3.5 h-3.5" /> Connect
                  </button>
                )}
              </div>

              {connected && account !== user?.walletAddress && (
                <div className="mt-3 p-3.5 sm:p-4 rounded-xl bg-hc-blue-soft border border-hc-blue-mid space-y-3">
                  <p className="text-xs text-hc-text-muted leading-relaxed">
                    A new wallet session detected. Link it to your profile to enable on-chain interactions.
                  </p>
                  <button onClick={handleLinkWallet} disabled={loading} className="hc-btn hc-btn-primary hc-btn-sm w-full min-h-[44px]">
                    <Link2 className="w-3.5 h-3.5" />
                    {loading ? 'Linking…' : 'Link Active Wallet'}
                  </button>
                </div>
              )}

              {msg && (
                <p className={`mt-3 text-xs font-bold text-center ${msg.startsWith('Error') ? 'text-hc-danger' : 'text-hc-success'}`}>
                  {msg}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
