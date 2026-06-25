// frontend/src/pages/ManageAccess.jsx
import React from 'react';
import DashboardLayout from '../components/DashboardLayout';
import AccessManager from '../components/AccessManager';
import { useAuth } from '../context/AuthContext';

const ManageAccess = () => {
    const { user } = useAuth();

    const navItems = [
        { label: 'Dashboard', path: '/patient-dashboard', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg> },
        { label: 'Medical Records', path: '/records', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg> },
        { label: 'QR Health ID', path: '/qr-id', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 17h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/></svg> },
        { label: 'Manage Access', path: '/access', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg> },
        { label: 'AI CDSS', path: '/ai-dashboard', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364.364l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg> }
    ];

    return (
        <DashboardLayout role="Patient" navItems={navItems}>
            <div className="max-w-2xl mx-auto py-10 space-y-8">
                <div>
                   <h2 className="text-3xl font-display font-bold text-white">Permissions Gateway</h2>
                   <p className="text-text-secondary mt-1">Exercise sovereign control over your medical data on the Ethereum mainnet.</p>
                </div>

                <AccessManager patientAddress={user?.walletAddress} />

                <div className="p-6 rounded-2xl bg-medichain-surface border border-medichain-border">
                   <h4 className="text-sm font-bold uppercase tracking-widest text-text-primary mb-2 flex items-center gap-2">
                       <svg className="w-4 h-4 text-status-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                       Security Briefing
                   </h4>
                   <p className="text-xs text-text-secondary leading-relaxed">
                       Granting access allows a doctor to view your decrypted IPFS records. You can revoke this permission at any time. All access changes incur a gas fee on the blockchain.
                   </p>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default ManageAccess;
