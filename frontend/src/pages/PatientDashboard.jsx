// frontend/src/pages/PatientDashboard.jsx
// MediChain — Patient dashboard (Mobile-First Responsive with Real Healthcare Imagery)
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth }           from '../context/AuthContext';
import { useWalletContext }  from '../context/WalletContext';
import api                   from '../utils/api';
import { formatAddress }     from '../utils/web3';
import { getRecordTypeImage, DOCTOR_IMAGES, MEDICINE_IMAGES } from '../utils/images';
import DashboardLayout       from '../components/DashboardLayout';
import WalletConnectionModal from '../components/WalletConnectionModal';
import QRHealthID            from '../components/QRHealthID';
import {
  FileText, Lock, Brain, Activity, QrCode,
  ChevronRight, Home, User, BarChart3,
  Wallet, RefreshCw, Shield, X, CheckCircle,
  Stethoscope, Pill
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
    <div className="hc-card p-3.5 sm:p-5 flex items-start gap-3 sm:gap-4 h-full">
      <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${bg}`}>
        <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] sm:text-xs font-bold text-hc-text-muted uppercase tracking-wide truncate">{label}</p>
        {loading
          ? <div className="hc-skeleton h-6 sm:h-7 w-12 sm:w-16 mt-1" />
          : <p className="text-xl sm:text-2xl font-bold text-hc-text leading-none mt-1 truncate">{value ?? '—'}</p>
        }
        {sub && <p className="text-[10px] sm:text-xs text-hc-text-muted mt-1 truncate">{sub}</p>}
      </div>
    </div>
  );
  return to ? <Link to={to} className="block hover:opacity-90 transition-opacity">{inner}</Link> : inner;
}

function RecordRow({ record }) {
  const type = record.recordType || 'other';
  const thumb = getRecordTypeImage(type);

  return (
    <div className="flex items-center gap-3 py-3 border-b border-hc-border-light last:border-0 min-w-0">
      {/* Real High Quality Medical Image Thumbnail */}
      <img
        src={thumb}
        alt={type}
        className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl object-cover flex-shrink-0 border border-hc-border-light shadow-xs"
        loading="lazy"
      />
      <div className="flex-1 min-w-0">
        <p className="text-xs sm:text-sm font-semibold text-hc-text truncate">
          {record.description || TYPE_LABEL[type] || 'Medical Record'}
        </p>
        <p className="text-[10px] sm:text-xs text-hc-text-muted mt-0.5 truncate">
          {record.createdAt ? new Date(record.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
        </p>
      </div>
      <span className={`hc-badge text-[10px] sm:text-xs flex-shrink-0 ${TYPE_COLOR[type] || 'hc-badge-neutral'}`}>
        {TYPE_LABEL[type] || type}
      </span>
      {record.ipfsHash && (
        <a
          href={`https://gateway.pinata.cloud/ipfs/${record.ipfsHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-hc-blue hover:underline font-bold flex-shrink-0 px-1 py-1"
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
    <div className="mb-6 hc-card p-4 sm:p-5 border border-hc-blue/20 bg-gradient-to-r from-hc-blue-soft to-hc-violet-soft relative">
      <button
        onClick={onDismiss}
        className="absolute top-3 right-3 p-1 rounded-md text-hc-text-light hover:text-hc-text-muted hover:bg-hc-bg-alt transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-start gap-3 sm:gap-4">
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-hc-blue flex items-center justify-center flex-shrink-0 shadow-sm">
          <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0 pr-5">
          <h3 className="text-xs sm:text-sm font-bold text-hc-text">Secure your healthcare identity</h3>
          <p className="text-[11px] sm:text-xs text-hc-text-muted mt-1 leading-relaxed">
            Connect your wallet to enable blockchain-backed ownership, decentralized access control,
            and on-chain healthcare actions.
          </p>
          <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2 mt-3">
            <button
              onClick={onConnect}
              className="hc-btn hc-btn-primary hc-btn-sm text-xs justify-center"
              id="patient-dashboard-connect-wallet-btn"
            >
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg"
                alt="MetaMask"
                className="w-4 h-4 flex-shrink-0"
              />
              <span>Connect MetaMask</span>
            </button>
            <button
              onClick={onDismiss}
              className="hc-btn hc-btn-ghost hc-btn-sm text-xs text-hc-text-muted justify-center"
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
  const [showQRModal, setShowQRModal]         = useState(false);
  const [copiedId, setCopiedId]               = useState(false);
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

      {/* WalletConnectionModal */}
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <p className="text-xs text-hc-text-muted font-medium mb-0.5">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <h1 className="text-xl sm:text-2xl font-bold text-hc-text">{greeting()}, {firstName} 👋</h1>
          <p className="text-xs sm:text-sm text-hc-text-muted mt-0.5 sm:mt-1">Here's an overview of your health records and access.</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Optional wallet connect */}
          {isConnected ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-hc-success-soft border border-hc-success/20 text-xs font-semibold text-hc-success">
              <div className="w-1.5 h-1.5 rounded-full bg-hc-success" />
              <span className="font-mono">{formatAddress(address)}</span>
            </div>
          ) : (
            <button
              onClick={handleConnectClick}
              className="hc-btn hc-btn-ghost hc-btn-sm border border-hc-border text-hc-text-muted hover:text-hc-text min-h-[36px]"
              id="patient-dashboard-header-connect-btn"
            >
              <Wallet className="w-3.5 h-3.5" />
              Connect Wallet
            </button>
          )}
          <button
            onClick={() => { fetchRecords(); fetchStats(); }}
            className="p-2 rounded-xl text-hc-text-muted hover:bg-hc-bg-alt transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <Stat icon={FileText}   label="Health Records"    value={statsLoading ? null : records.length} sub="Total verified"              loading={statsLoading} variant="blue"    to="/records" />
        <Stat icon={Lock}       label="Doctor Access"     value={statsLoading ? null : doctorCount}   sub="Active grants"                loading={statsLoading} variant="teal"    to="/access"  />
        <Stat icon={Brain}      label="AI Insights"       value="Available"                            sub="CDSS ready"                   loading={false}        variant="violet"  to="/ai-dashboard" />
        <Stat icon={Activity}   label="Blockchain"        value={walletLinked ? 'Verified' : isConnected ? 'Connected' : 'Optional'} sub={walletLinked ? 'Confirmed' : isConnected ? 'Active' : 'Enhanced security'} loading={false} variant={walletLinked || isConnected ? 'success' : 'blue'} />
      </div>

      {/* ── Quick actions + Recent records ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Quick actions */}
        <div className="space-y-3 sm:space-y-4">
          <h2 className="text-xs sm:text-sm font-bold text-hc-text uppercase tracking-wide">Quick Actions</h2>
          {[
            { Icon: FileText, label: 'View all records',   sub: `${records.length} records`, path: '/records',       color: 'text-hc-blue' },
            { Icon: Lock,     label: 'Manage access',      sub: `${doctorCount} authorized`, path: '/access',        color: 'text-hc-teal' },
            { Icon: Brain,    label: 'AI Health Insights', sub: 'CDSS analysis',             path: '/ai-dashboard',  color: 'text-hc-violet' },
            { Icon: QrCode,   label: 'My Health QR',       sub: 'Emergency access',          path: '/qr-id',         color: 'text-hc-success' },
          ].map(({ Icon, label, sub, path, color }) => (
            <Link key={path} to={path} className="hc-card p-3.5 sm:p-4 flex items-center gap-3 hover:shadow-hc-card-md hover:-translate-y-0.5 transition-all duration-200 min-h-[52px]">
              <div className={`w-9 h-9 rounded-xl bg-hc-bg-alt flex items-center justify-center flex-shrink-0 ${color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-bold text-hc-text truncate">{label}</p>
                <p className="text-[11px] sm:text-xs text-hc-text-muted truncate">{sub}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-hc-text-light flex-shrink-0" />
            </Link>
          ))}

          {/* 🪪 PATIENT HEALTH ID WIDGET */}
          <div className="hc-card p-4 bg-gradient-to-br from-hc-surface to-hc-bg-alt border border-hc-border space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <QrCode className="w-4 h-4 text-hc-teal" />
                <span className="text-xs font-bold text-hc-text uppercase tracking-wider">MediChain Health ID</span>
              </div>
              <span className="text-[10px] font-mono font-bold text-hc-teal bg-hc-teal-soft px-2 py-0.5 rounded-full">
                Universal ID
              </span>
            </div>

            <div className="bg-hc-bg-dark/50 border border-hc-border rounded-xl p-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="text-[9px] uppercase font-bold text-hc-text-muted block">Patient ID</span>
                <span className="text-xs sm:text-sm font-mono font-bold text-hc-text truncate block">
                  {user?.patientId || 'MC-PAT-2026-000001'}
                </span>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(user?.patientId || 'MC-PAT-2026-000001');
                  setCopiedId(true);
                  setTimeout(() => setCopiedId(false), 2500);
                }}
                className="px-2.5 py-1 rounded-lg bg-hc-surface border border-hc-border text-[11px] font-bold text-hc-text hover:text-hc-teal transition-colors flex-shrink-0"
              >
                {copiedId ? 'Copied!' : 'Copy'}
              </button>
            </div>

            <p className="text-[11px] text-hc-text-muted leading-relaxed">
              Your secure identity for authorized healthcare access.
            </p>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setShowQRModal(true)}
                className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-hc-blue to-hc-teal text-white font-bold text-xs shadow-xs hover:opacity-95 text-center"
              >
                Generate Patient QR
              </button>
              <Link
                to="/qr-id"
                className="py-2 px-3 rounded-xl bg-hc-surface border border-hc-border text-hc-text text-xs font-bold hover:bg-hc-bg-alt text-center"
              >
                View Card
              </Link>
            </div>
          </div>

          {/* Real Clinical Care Preview Card */}
          <div className="hc-card p-4 bg-gradient-to-br from-hc-surface to-hc-bg-alt border border-hc-border space-y-3">
            <div className="flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-hc-teal" />
              <span className="text-xs font-bold text-hc-text uppercase tracking-wider">Clinical Care Network</span>
            </div>
            <div className="flex items-center gap-3">
              <img
                src={DOCTOR_IMAGES.female_1}
                alt="Doctor"
                className="w-11 h-11 rounded-xl object-cover border border-hc-teal/30 shadow-xs"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-hc-text truncate">Dr. Sarah Jenkins, MD</p>
                <p className="text-[10px] text-hc-text-muted truncate">Cardiology &bull; Verified Specialist</p>
                <span className="inline-flex items-center gap-1 text-[9px] text-hc-success font-bold mt-0.5">
                  <CheckCircle className="w-2.5 h-2.5" /> On-Chain Licensed
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent records with real thumbnails */}
        <div className="lg:col-span-2 space-y-6">
          <div className="hc-card p-0 overflow-hidden">
            <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-hc-border-light">
              <div className="flex items-center gap-2">
                <h2 className="text-xs sm:text-sm font-bold text-hc-text">Verified Diagnostic & Health Records</h2>
                <span className="hc-badge hc-badge-primary text-[10px]">Real-Time IPFS</span>
              </div>
              <Link to="/records" className="text-xs text-hc-blue hover:underline font-bold">View all</Link>
            </div>
            <div className="px-4 sm:px-6">
              {recordsLoading ? (
                <div className="space-y-3 py-4">
                  {[1,2,3].map(i => (
                    <div key={i} className="flex items-center gap-3 py-2">
                      <div className="hc-skeleton w-10 h-10 rounded-xl flex-shrink-0" />
                      <div className="flex-1 space-y-1.5 min-w-0">
                        <div className="hc-skeleton h-3.5 w-3/4" />
                        <div className="hc-skeleton h-3 w-1/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : records.length > 0 ? (
                <div className="divide-y divide-hc-border-light">
                  {records.slice(0, 5).map(r => <RecordRow key={r._id} record={r} />)}
                </div>
              ) : (
                <div className="py-10 sm:py-12 text-center">
                  <img
                    src={MEDICINE_IMAGES.prescription}
                    alt="Prescription"
                    className="w-14 h-14 rounded-2xl object-cover mx-auto mb-3 opacity-70 border border-hc-border"
                  />
                  <p className="text-xs sm:text-sm font-bold text-hc-text mb-1">No records yet</p>
                  <p className="text-xs text-hc-text-muted">Your verified records anchored on IPFS and Sepolia will appear here.</p>
                </div>
              )}
            </div>
          </div>

          {/* Active Medication Safety Pill */}
          <div className="hc-card p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-gradient-to-r from-hc-teal-soft/40 to-hc-surface border border-hc-teal/20">
            <img
              src={MEDICINE_IMAGES.pills}
              alt="Medication Safety"
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover flex-shrink-0 border border-hc-border shadow-xs"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-hc-teal mb-0.5">
                <Pill className="w-3.5 h-3.5" />
                <span>Drug Interaction & Dosage Protection</span>
              </div>
              <h3 className="text-sm font-bold text-hc-text">AI Clinical Decision Support Active</h3>
              <p className="text-xs text-hc-text-muted mt-0.5 leading-relaxed">
                All newly prescribed medications are cross-referenced with your active prescriptions for severe drug-drug interactions.
              </p>
            </div>
            <Link to="/ai-dashboard" className="hc-btn hc-btn-teal hc-btn-sm flex-shrink-0 w-full sm:w-auto justify-center">
              Check Safety
            </Link>
          </div>
        </div>
      </div>

      {/* ── AI insights note ────────────────────────────────────────── */}
      <div className="mt-6 p-4 rounded-xl bg-hc-violet-soft border border-hc-violet/20 flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2.5">
          <Brain className="w-5 h-5 text-hc-violet flex-shrink-0" />
          <div>
            <p className="text-xs sm:text-sm font-bold text-hc-text">AI Health Insights available</p>
            <p className="text-[11px] sm:text-xs text-hc-text-muted mt-0.5">
              AI-assisted analysis of your records is ready.{' '}
              <span className="italic hidden sm:inline">AI-assisted insight — not a medical diagnosis. Always consult your healthcare provider.</span>
            </p>
          </div>
        </div>
        <Link to="/ai-dashboard" className="hc-btn hc-btn-secondary hc-btn-sm flex-shrink-0 w-full sm:w-auto justify-center sm:ml-auto">
          View
        </Link>
      </div>

      {/* ── Wallet Connection Modal ─────────────────────────────────── */}
      <WalletConnectionModal
        isOpen={walletModalOpen}
        onClose={() => setWalletModalOpen(false)}
      />

      {/* ── Patient Health QR Modal ─────────────────────────────────── */}
      {showQRModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in print:p-0 print:bg-white">
          <div className="relative w-full max-w-md bg-medichain-bg-dark border border-medichain-border rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto print:max-w-none print:border-none print:p-0 print:bg-transparent">
            <button
              onClick={() => setShowQRModal(false)}
              className="absolute top-4 right-4 text-text-secondary hover:text-white p-2 rounded-xl bg-medichain-surface border border-medichain-border transition-colors print:hidden"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
            <QRHealthID user={user} onClose={() => setShowQRModal(false)} />
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
