// frontend/src/pages/MedicalRecords.jsx
// MediChain — Premium medical records page (Mobile-First Responsive)
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import RecordCard from '../components/RecordCard';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import {
  FileText, Search, Upload, Home, Lock,
  Brain, BarChart3, User, AlertCircle,
  FolderOpen
} from 'lucide-react';

const TYPES = ['All', 'prescription', 'lab-report', 'diagnosis', 'imaging', 'vaccination'];
const TYPE_LABELS = {
  All: 'All', prescription: 'Prescriptions', 'lab-report': 'Lab Reports',
  diagnosis: 'Diagnoses', imaging: 'Imaging', vaccination: 'Vaccinations',
};

const NAV = [
  { label: 'Dashboard',   path: '/patient-dashboard', icon: Home     },
  { label: 'Records',     path: '/records',            icon: FileText },
  { label: 'Access',      path: '/access',             icon: Lock     },
  { label: 'AI Health',   path: '/ai-dashboard',       icon: Brain    },
  { label: 'Analytics',   path: '/analytics',          icon: BarChart3},
  { label: 'Profile',     path: '/profile',            icon: User     },
];

export default function MedicalRecords() {
  const [records, setRecords]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [search, setSearch]     = useState('');
  const [activeType, setActiveType] = useState('All');
  useAuth();

  useEffect(() => {
    setLoading(true);
    api.get('/patient/records')
      .then(({ data }) => setRecords(data.records || []))
      .catch(err => setError(err.message || 'Could not load records'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = records.filter(r => {
    const matchSearch = !search ||
      r.description?.toLowerCase().includes(search.toLowerCase()) ||
      r.recordType?.toLowerCase().includes(search.toLowerCase());
    const matchType = activeType === 'All' || r.recordType === activeType;
    return matchSearch && matchType;
  });

  return (
    <DashboardLayout navItems={NAV}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <p className="text-xs text-hc-text-muted font-medium mb-0.5">Medical Records</p>
          <h1 className="text-xl sm:text-2xl font-bold text-hc-text">Your Health Records</h1>
          <p className="text-xs sm:text-sm text-hc-text-muted mt-0.5 sm:mt-1">
            {records.length} verified {records.length === 1 ? 'record' : 'records'} anchored on the blockchain.
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Link to="/upload-report" className="hc-btn hc-btn-primary hc-btn-sm w-full sm:w-auto justify-center min-h-[40px]">
            <Upload className="w-4 h-4" /> Upload Record
          </Link>
        </div>
      </div>

      {/* Search + filter tabs */}
      <div className="hc-card p-3.5 sm:p-4 mb-6 space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-hc-text-light" />
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search records by name, type..."
            className="hc-input pl-10"
            aria-label="Search records"
          />
        </div>
        
        {/* Horizontal scroll strip for filters */}
        <div className="hc-scroll-x flex items-center gap-1.5 py-1 -mx-1 px-1">
          {TYPES.map(type => (
            <button
              key={type}
              onClick={() => setActiveType(type)}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-150 flex-shrink-0 min-h-[36px] ${
                activeType === type
                  ? 'bg-hc-blue-soft text-hc-blue border border-hc-blue-mid shadow-xs'
                  : 'text-hc-text-muted hover:bg-hc-bg-alt hover:text-hc-text border border-transparent'
              }`}
            >
              {TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div role="alert" className="flex items-center gap-2.5 p-3.5 sm:p-4 mb-5 rounded-xl bg-hc-danger-soft border border-hc-danger/20 text-xs sm:text-sm text-hc-danger">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>We couldn't load your health records. </span>
          <button onClick={() => window.location.reload()} className="font-bold underline ml-1">Try again</button>
        </div>
      )}

      {/* Records grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {[1,2,3,4].map(i => (
            <div key={i} className="hc-card p-5 sm:p-6 space-y-3">
              <div className="flex gap-3">
                <div className="hc-skeleton w-10 h-10 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-2 min-w-0">
                  <div className="hc-skeleton h-4 w-3/4" />
                  <div className="hc-skeleton h-3 w-1/2" />
                </div>
              </div>
              <div className="hc-skeleton h-3 w-full" />
              <div className="hc-skeleton h-3 w-4/5" />
            </div>
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {filtered.map(record => (
            <RecordCard
              key={record._id}
              record={record}
              onViewFile={url => window.open(url, '_blank')}
            />
          ))}
        </div>
      ) : (
        <div className="hc-card p-8 sm:p-14 text-center flex flex-col items-center border-dashed">
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-hc-bg-alt flex items-center justify-center mb-3 sm:mb-4">
            <FolderOpen className="w-6 h-6 sm:w-8 sm:h-8 text-hc-text-light" />
          </div>
          <h3 className="text-sm sm:text-base font-bold text-hc-text mb-1 sm:mb-2">
            {search || activeType !== 'All' ? 'No matching records' : 'No medical records yet'}
          </h3>
          <p className="text-xs sm:text-sm text-hc-text-muted max-w-xs leading-relaxed mb-5 sm:mb-6">
            {search || activeType !== 'All'
              ? 'Try adjusting your search or filter.'
              : 'Your verified records will appear here once they are added by your healthcare provider.'}
          </p>
          {!search && activeType === 'All' && (
            <Link to="/upload-report" className="hc-btn hc-btn-primary hc-btn-sm min-h-[40px]">
              <Upload className="w-4 h-4" /> Upload your first record
            </Link>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
