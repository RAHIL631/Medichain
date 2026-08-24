// frontend/src/pages/PatientDashboard.jsx
// MediChain — Patient dashboard
// MetaMask is OPTIONAL. Dashboard loads fully without wallet.
// Blockchain identity card is shown once, dismissible with "Maybe Later".
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth }           from '../context/AuthContext';
import { useWalletContext }  from '../context/WalletContext';
import api                   from '../utils/api';
import { formatAddress }     from '../utils/web3';
import DashboardLayout       from '../components/DashboardLayout';
import WalletConnectionModal from '../components/WalletConnectionModal';
import {
  FileText, Lock, Brain, Activity, QrCode,
  ChevronRight, Home, User, BarChart3,
  Wallet, RefreshCw, Shield, X
} from 'lucide-react';

const DISMISS_KEY = 'medichain_wallet_card_dismissed';

const TYPE_LABEL = {
  prescription: 'Prescription', 'lab-report': 'Lab Report',
  diagnosis: 'Diagnosis', imaging: 'Imaging',
  vaccination: 'Vaccination', other: 'Document',
};

const TYPE_COLOR = {
  prescription: 'hc-badge-primary', 'lab-report': 'hc-badge-info',
  diagnosis: 'hc-badge-warning', imaging: 'hc-badge-violet',
  vaccination: 'hc-badge-teal',
};

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function Stat({ icon: Icon, label, value, sub, loading, variant = 'blue', to }) {
  const bg = {
    blue:   'bg-hc-blue-soft    text-hc-blue',
    teal:   'bg-hc-teal-soft    text-hc-teal',
    violet: 'bg-hc-violet-soft  text-hc-violet',
    success:'bg-hc-success-soft text-hc-success',
    warning:'bg-hc-warning-soft text-hc-warning',
  }[variant] || 'bg-hc-blue-soft text-hc-blue';

  const inner = (
    <div className="hc-card p-5 flex items-start gap-4 h-full">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${bg}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-hc-text-muted uppercase tracking-wide mb-0.5">{label}</p>
        {loading
          ? <div className="hc-skeleton h-7 w-16 mt-1" />
          : <p className="text-2xl font-bold text-hc-text leading-none">{value ?? '—'}</p>
        }
        {sub && <p className="text-xs text-hc-text-muted mt-1">{sub}</p>}
      </div>
    </div>
  );
  return to ? <Link to={to} className="block hover:opacity-90 transition-opacity">{inner}</Link> : inner;
}

function RecordRow({ record }) {
  const type = record.recordType || 'other';
  return (
    <div className="flex items-center gap-4 py-3 border-b border-hc-border-light last:border-0">
      <div className="w-9 h-9 rounded-xl bg-hc-bg-alt flex items-center justify-center flex-shrink-0">
        <FileText className="w-4 h-4 text-hc-text-muted" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-hc-text truncate">
          {record.description || TYPE_LABEL[type] || 'Medical Record'}
        </p>
        <p className="text-xs text-hc-text-muted mt-0.5">
          {record.createdAt ? new Date(record.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
        </p>
      </div>
      <span className={`hc-badge ${TYPE_COLOR[type] || 'hc-badge-neutral'}`}>
        {TYPE_LABEL[type] || type}
      </span>
      {record.ipfsHash && (
        <a
          href={`https://gateway.pinata.cloud/ipfs/${record.ipfsHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-hc-blue hover:underline font-medium"
        >
          View
        </a>
      )}
    </div>
  );
}

// ── Sidebar nav ──────────────────────────────────────────────────────────────
const NAV = [
  { label: 'Dashboard',   path: '/patient-dashboard', icon: Home     },
  { label: 'Records',     path: '/records',            icon: FileText },
  { label: 'Access',      path: '/access',             icon: Lock     },
  { label: 'AI Health',   path: '/ai-dashboard',       icon: Brain    },
  { label: 'Health Risk', path: '/health-risk',        icon: Activity },
  { label: 'Analytics',   path: '/analytics',          icon: BarChart3},
  { label: 'Profile',     path: '/profile',            icon: User     },
];

// ── Optional blockchain identity card ────────────────────────────────────────
function BlockchainIdentityCard({ onDismiss, onConnect }) {
  return (
    <div className="mb-6 hc-card p-5 border border-hc-blue/20 bg-gradient-to-r from-hc-blue-soft to-hc-violet-soft relative">
      <button
        onClick={onDismiss}
        className="absolute top-3 right-3 p-1 rounded-md text-hc-text-light hover:text-hc-text-muted hover:bg-hc-bg-alt transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-hc-blue flex items-center justify-center flex-shrink-0 shadow-sm">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0 pr-6">
          <h3 className="text-sm font-bold text-hc-text">Secure your healthcare identity</h3>
          <p className="text-xs text-hc-text-muted mt-1 leading-relaxed">
            Connect your wallet to enable blockchain-backed ownership, decentralized access control,
            and on-chain healthcare actions.
          </p>
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={onConnect}
              className="hc-btn hc-btn-primary hc-btn-sm"
              id="patient-dashboard-connect-wallet-btn"
            >
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg"
                alt="MetaMask"
                className="w-4 h-4"
              />
              Connect MetaMask
            </button>
            <button
              onClick={onDismiss}
              className="hc-btn hc-btn-ghost hc-btn-sm text-hc-text-muted"
              id="patient-dashboard-maybe-later-btn"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function PatientDashboard() {
  const { user } = useAuth();
  const { isConnected, address } = useWalletContext();

  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [cardDismissed, setCardDismissed]     = useState(
    () => localStorage.getItem(DISMISS_KEY) === 'true'
  );
  const [toast, setToast]                     = useState(null);

  const [records, setRecords]               = useState([]);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [statsLoading, setStatsLoading]     = useState(true);
  const [doctorCount, setDoctorCount]       = useState(0);

  const fetchRecords = useCallback(async () => {
    setRecordsLoading(true);
    try {
      const { data } = await api.get('/patient/records');
      setRecords(data.records || []);
    } catch { /* silent */ }
    finally { setRecordsLoading(false); setStatsLoading(false); }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await api.get('/patient/stats');
      setDoctorCount(data.authorizedDoctors ?? 0);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchRecords(); fetchStats(); }, [fetchRecords, fetchStats]);

  const handleDismiss = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, 'true');
    setCardDismissed(true);
  }, []);

  const handleConnectClick = useCallback(() => {
    setWalletModalOpen(true);
  }, []);

  const firstName   = user?.name?.split(' ')[0] || 'there';
  const walletLinked = !!user?.walletAddress;

  // Show card if: wallet not yet linked AND user hasn't dismissed it
  const showBlockchainCard = !walletLinked && !cardDismissed && !isConnected;

  return (
    <DashboardLayout navItems={NAV}>
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 hc-badge hc-badge-info px-4 py-3 text-sm shadow-hc-card-md animate-slide-up" role="alert">
          {toast}
          <button onClick={() => setToast(null)} className="ml-3 text-hc-blue hover:opacity-70" aria-label="Dismiss">×</button>
        </div>
      )}

      {/* WalletConnectionModal — appears only when user explicitly requests blockchain action */}
      <WalletConnectionModal
        isOpen={walletModalOpen}
        onClose={() => setWalletModalOpen(false)}
        operationLabel="set up your blockchain identity"
        onConnected={() => {
          setWalletModalOpen(false);
          setCardDismissed(true);
        }}
      />

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <p className="text-xs text-hc-text-muted font-medium mb-0.5">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <h1 className="text-2xl font-bold text-hc-text">{greeting()}, {firstName} 👋</h1>
          <p className="text-sm text-hc-text-muted mt-1">Here's an overview of your health records and access.</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Optional wallet connect — secondary action, not primary */}
          {isConnected ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-hc-success-soft border border-hc-success/20 text-xs font-semibold text-hc-success">
              <div className="w-1.5 h-1.5 rounded-full bg-hc-success" />
              {formatAddress(address)}
            </div>
          ) : (
            <button
              onClick={handleConnectClick}
              className="hc-btn hc-btn-ghost hc-btn-sm border border-hc-border text-hc-text-muted hover:text-hc-text"
              id="patient-dashboard-header-connect-btn"
            >
              <Wallet className="w-3.5 h-3.5" />
              Connect Wallet
            </button>
          )}
          <button
            onClick={() => { fetchRecords(); fetchStats(); }}
            className="p-2 rounded-lg text-hc-text-muted hover:bg-hc-bg-alt transition-colors"
            aria-label="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Optional blockchain identity card ──────────────────────── */}
      {showBlockchainCard && (
        <BlockchainIdentityCard
          onDismiss={handleDismiss}
          onConnect={handleConnectClick}
        />
      )}

      {/* ── Stats row ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Stat icon={FileText}   label="Health Records"    value={statsLoading ? null : records.length} sub="Total verified records"      loading={statsLoading} variant="blue"    to="/records" />
        <Stat icon={Lock}       label="Authorized Doctors" value={statsLoading ? null : doctorCount}   sub="Active access grants"         loading={statsLoading} variant="teal"    to="/access"  />
        <Stat icon={Brain}      label="AI Insights"       value="Available"                            sub="Health risk analysis ready"   loading={false}        variant="violet"  to="/ai-dashboard" />
        <Stat icon={Activity}   label="Blockchain"        value={walletLinked ? 'Verified' : isConnected ? 'Connected' : 'Optional'} sub={walletLinked ? 'Identity confirmed' : isConnected ? 'Wallet connected' : 'Connect wallet to enhance security'} loading={false} variant={walletLinked || isConnected ? 'success' : 'blue'} />
      </div>

      {/* ── Quick actions + Recent records ─────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-6">

        {/* Quick actions */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-hc-text uppercase tracking-wide">Quick Actions</h2>
          {[
            { Icon: FileText, label: 'View all records',   sub: `${records.length} records`, path: '/records',       color: 'text-hc-blue' },
            { Icon: Lock,     label: 'Manage access',      sub: `${doctorCount} authorized`, path: '/access',        color: 'text-hc-teal' },
            { Icon: Brain,    label: 'AI Health Insights', sub: 'CDSS analysis',             path: '/ai-dashboard',  color: 'text-hc-violet' },
            { Icon: QrCode,   label: 'My Health QR',       sub: 'Emergency access',          path: '/qr-id',         color: 'text-hc-success' },
          ].map(({ Icon, label, sub, path, color }) => (
            <Link key={path} to={path} className="hc-card p-4 flex items-center gap-3 hover:shadow-hc-card-md hover:-translate-y-0.5 transition-all duration-200">
              <div className={`w-9 h-9 rounded-xl bg-hc-bg-alt flex items-center justify-center flex-shrink-0 ${color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-hc-text">{label}</p>
                <p className="text-xs text-hc-text-muted">{sub}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-hc-text-light flex-shrink-0" />
            </Link>
          ))}
        </div>

        {/* Recent records */}
        <div className="lg:col-span-2">
          <div className="hc-card p-0 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-hc-border-light">
              <h2 className="text-sm font-bold text-hc-text">Recent Records</h2>
              <Link to="/records" className="text-xs text-hc-blue hover:underline font-medium">View all</Link>
            </div>
            <div className="px-6">
              {recordsLoading ? (
                <div className="space-y-3 py-4">
                  {[1,2,3].map(i => (
                    <div key={i} className="flex items-center gap-4 py-2">
                      <div className="hc-skeleton w-9 h-9 rounded-xl" />
                      <div className="flex-1 space-y-1.5">
                        <div className="hc-skeleton h-3.5 w-3/4" />
                        <div className="hc-skeleton h-3 w-1/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : records.length > 0 ? (
                <div>
                  {records.slice(0, 6).map(r => <RecordRow key={r._id} record={r} />)}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-hc-bg-alt flex items-center justify-center mx-auto mb-3">
                    <FileText className="w-6 h-6 text-hc-text-light" />
                  </div>
                  <p className="text-sm font-semibold text-hc-text mb-1">No records yet</p>
                  <p className="text-xs text-hc-text-muted mb-4">Your verified records will appear here.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── AI insights note ────────────────────────────────────────── */}
      <div className="mt-6 p-4 rounded-xl bg-hc-violet-soft border border-hc-violet/20 flex items-start gap-3">
        <Brain className="w-5 h-5 text-hc-violet flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-hc-text">AI Health Insights available</p>
          <p className="text-xs text-hc-text-muted mt-0.5">
            AI-assisted analysis of your records is ready.{' '}
            <span className="italic">AI-assisted insight — not a medical diagnosis. Always consult your healthcare provider.</span>
          </p>
        </div>
        <Link to="/ai-dashboard" className="hc-btn hc-btn-secondary hc-btn-sm flex-shrink-0 ml-auto">
          View
        </Link>
      </div>
    </DashboardLayout>
  );
}
