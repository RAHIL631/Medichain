// frontend/src/pages/HospitalDashboard.jsx
import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import GlassCard from '../components/GlassCard';
import FuturisticButton from '../components/FuturisticButton';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const HospitalDashboard = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({ diagnosticReports: 0, pendingSync: 0 });
    const [loading, setLoading] = useState(true);

    const navItems = [
        { label: 'Dashboard', path: '/hospital-dashboard', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg> },
        { label: 'Upload Report', path: '/upload-report', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg> },
        { label: 'Profile', path: '/profile', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg> },
    ];

    useEffect(() => {
        // Fetch hospital specific stats
        setLoading(false);
    }, []);

    return (
        <DashboardLayout role="Hospital" navItems={navItems}>
            <div className="space-y-8 py-6">
                <div>
                    <h2 className="text-3xl font-display font-bold text-white">Institutional Portal</h2>
                    <p className="text-text-secondary mt-1">Facility: {user?.name} | Authority: MC-H-NODE-7</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <GlassCard glowBorder={true} className="border-accent-cyan/20">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-4xl font-display font-bold text-white">0</h3>
                                <p className="text-[10px] uppercase font-bold tracking-widest text-text-secondary mt-1">Reports Issued (Total)</p>
                            </div>
                            <div className="w-16 h-16 bg-accent-cyan/10 rounded-2xl flex items-center justify-center text-accent-cyan">
                                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                            </div>
                        </div>
                        <FuturisticButton fullWidth onClick={() => window.location.href='/upload-report'}>Upload New Diagnosis</FuturisticButton>
                     </GlassCard>

                     <GlassCard className="bg-accent-blue/5 border-accent-blue/20">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-accent-blue mb-4">Network Compliance</h3>
                        <p className="text-xs text-text-secondary leading-relaxed mb-6">Your facility node is currently performing at peak synchronization with the Ethereum testnet.</p>
                        <div className="space-y-3">
                           <div className="flex items-center justify-between p-3 bg-medichain-bg-dark rounded-lg border border-medichain-border">
                                <span className="text-[10px] uppercase text-text-secondary">Uptime</span>
                                <span className="text-[10px] font-mono text-status-success">99.98%</span>
                           </div>
                           <div className="flex items-center justify-between p-3 bg-medichain-bg-dark rounded-lg border border-medichain-border">
                                <span className="text-[10px] uppercase text-text-secondary">Data Shards</span>
                                <span className="text-[10px] font-mono text-white">MC-8, MC-12, MC-90</span>
                           </div>
                        </div>
                     </GlassCard>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default HospitalDashboard;
