// frontend/src/pages/MedicalRecords.jsx
import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import GlassCard from '../components/GlassCard';
import FuturisticButton from '../components/FuturisticButton';
import RecordCard from '../components/RecordCard';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const MedicalRecords = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  const { user } = useAuth();

  const navItems = [
    { label: 'Dashboard', path: '/patient-dashboard', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg> },
    { label: 'Medical Records', path: '/records', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg> },
    { label: 'QR Health ID', path: '/qr-id', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 17h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/></svg> },
    { label: 'Manage Access', path: '/access', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg> },
    { label: 'AI CDSS', path: '/ai-dashboard', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364.364l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg> }
  ];

  useEffect(() => {
    const fetchRecords = async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/patient/records');
        setRecords(data.records || []);
      } catch (err) {
        setError(err.message || 'Could not load records');
      } finally {
        setLoading(false);
      }
    };
    fetchRecords();
  }, []);

  const filteredRecords = records.filter(r => 
    r.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.recordType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.uploaderWallet?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout role="Patient" navItems={navItems}>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-display font-bold text-white">Your Health Ledger</h2>
            <p className="text-text-secondary mt-1">
              Found {records.length} immutable records anchored on the blockchain.
            </p>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
             <input 
                type="text" 
                placeholder="Search description or hash..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="bg-medichain-bg-dark/50 border border-medichain-border rounded-lg px-4 py-2 flex-grow text-sm focus:border-accent-cyan outline-none transition-all" 
              />
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-status-danger/10 border border-status-danger/30 text-status-danger text-sm flex items-center gap-3">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="glass-card p-6 border-medichain-border animate-pulse h-40">
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-medichain-surface rounded-xl" />
                  <div className="space-y-2 flex-grow">
                    <div className="h-4 bg-medichain-surface rounded w-3/4" />
                    <div className="h-4 bg-medichain-surface rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredRecords.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredRecords.map((record) => (
              <RecordCard 
                key={record._id} 
                record={record} 
                onViewFile={(url) => window.open(url, '_blank')}
              />
            ))}
          </div>
        ) : (
          <div className="glass-card text-center py-20 border-dashed border-medichain-border">
            <div className="w-20 h-20 bg-medichain-surface rounded-full flex items-center justify-center mx-auto mb-6">
               <svg className="w-10 h-10 text-text-secondary opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            </div>
            <h3 className="text-xl font-bold text-text-secondary">No records found</h3>
            <p className="text-sm text-text-secondary/60 mt-2">Any records uploaded by doctors will appear here.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default MedicalRecords;
