// frontend/src/pages/Profile.jsx
// MediChain — Premium profile page (light theme)
import React, { useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import useWallet from '../hooks/useWallet';
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
    <div className="flex items-start gap-3 py-3 border-b border-hc-border-light last:border-0">
      <div className="w-8 h-8 rounded-lg bg-hc-bg-alt flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-hc-text-muted" />
      </div>
      <div>
        <p className="text-xs text-hc-text-muted font-medium uppercase tracking-wide">{label}</p>
        <p className="text-sm font-semibold text-hc-text mt-0.5">{value || '—'}</p>
      </div>
    </div>
  );
}

export default function Profile() {
  const { user, updateWallet } = useAuth();
  const { account, connected, connect } = useWallet();
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
        <div className="mb-8">
          <p className="text-xs text-hc-text-muted font-medium mb-0.5">Account</p>
          <h1 className="text-2xl font-bold text-hc-text">Your Profile</h1>
          <p className="text-sm text-hc-text-muted mt-1">Manage your health identity and blockchain connection.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Left — avatar + role */}
          <div>
            <div className="hc-card p-6 text-center">
              <div className="w-20 h-20 rounded-full bg-hc-blue flex items-center justify-center text-2xl font-bold text-white mx-auto mb-4 shadow-hc-card">
                {initials}
              </div>
              <p className="font-bold text-hc-text">{user?.name}</p>
              <span className="hc-badge hc-badge-primary mt-2">{roleLabel}</span>
              {user?.isWalletLinked && (
                <div className="flex items-center justify-center gap-1.5 mt-3 text-xs text-hc-success font-medium">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Blockchain verified
                </div>
              )}
            </div>

            {/* Sepolia info */}
            <div className="hc-card p-4 mt-4 space-y-2">
              <p className="text-xs font-bold text-hc-text-muted uppercase tracking-wide mb-3">Blockchain Identity</p>
              <div className="flex items-center gap-2 text-xs">
                <Activity className="w-3.5 h-3.5 text-hc-violet" />
                <span className="text-hc-text-muted">Network: <span className="font-semibold text-hc-text">Sepolia</span></span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Shield className="w-3.5 h-3.5 text-hc-violet" />
                <span className="text-hc-text-muted">Chain ID: <span className="font-semibold text-hc-text">11155111</span></span>
              </div>
            </div>
          </div>

          {/* Right — details + wallet */}
          <div className="md:col-span-2 space-y-5">
            {/* User info */}
            <div className="hc-card p-6">
              <h3 className="text-sm font-bold text-hc-text mb-2">Account Details</h3>
              <InfoRow label="Full Name"    value={user?.name}  icon={User}     />
              <InfoRow label="Email"        value={user?.email} icon={Mail}     />
              <InfoRow label="Role"         value={roleLabel}   icon={Shield}   />
              <InfoRow label="Member Since" value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'} icon={Calendar} />
            </div>

            {/* Wallet */}
            <div className="hc-card p-6">
              <h3 className="text-sm font-bold text-hc-text mb-4">Blockchain Wallet</h3>

              <div className="p-4 rounded-xl bg-hc-bg-alt border border-hc-border-light flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs text-hc-text-muted font-medium">Linked Wallet</p>
                  <p className="text-sm font-mono font-semibold text-hc-text mt-0.5">
                    {user?.walletAddress ? formatAddress(user.walletAddress) : 'Not linked'}
                  </p>
                </div>
                <div className={`w-2.5 h-2.5 rounded-full ${user?.walletAddress ? 'bg-hc-success' : 'bg-hc-danger'}`} />
              </div>

              <div className="p-4 rounded-xl bg-hc-bg-alt border border-hc-border-light flex items-center justify-between">
                <div>
                  <p className="text-xs text-hc-text-muted font-medium">Active MetaMask</p>
                  <p className="text-sm font-mono font-semibold text-hc-text mt-0.5">
                    {connected ? formatAddress(account) : 'Not connected'}
                  </p>
                </div>
                {!connected && (
                  <button onClick={connect} className="hc-btn hc-btn-secondary hc-btn-sm">
                    <Wallet className="w-3 h-3" /> Connect
                  </button>
                )}
              </div>

              {connected && account !== user?.walletAddress && (
                <div className="mt-3 p-4 rounded-xl bg-hc-blue-soft border border-hc-blue-mid space-y-3">
                  <p className="text-xs text-hc-text-muted leading-relaxed">
                    A new wallet session detected. Link it to your profile to enable on-chain interactions.
                  </p>
                  <button onClick={handleLinkWallet} disabled={loading} className="hc-btn hc-btn-primary hc-btn-sm w-full">
                    <Link2 className="w-3.5 h-3.5" />
                    {loading ? 'Linking…' : 'Link Active Wallet'}
                  </button>
                </div>
              )}

              {msg && (
                <p className={`mt-3 text-xs font-semibold text-center ${msg.startsWith('Error') ? 'text-hc-danger' : 'text-hc-success'}`}>
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
