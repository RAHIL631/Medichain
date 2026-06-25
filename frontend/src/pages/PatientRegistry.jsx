// frontend/src/pages/PatientRegistry.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import GlassCard from '../components/GlassCard';
import FuturisticButton from '../components/FuturisticButton';
import api from '../utils/api';
import { formatAddress } from '../utils/web3';

const PatientRegistry = () => {
    const [patients, setPatients] = useState([]);
    const [loading, setLoading]   = useState(true);
    const [error, setError]       = useState('');
    const navigate = useNavigate();

    const navItems = [
        { label: 'Dashboard', path: '/doctor-dashboard', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg> },
        { label: 'QR Scanner', path: '/scan', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 17h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/></svg> },
        { label: 'Patients', path: '/patients', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg> },
    ];

    useEffect(() => {
        const fetchPatients = async () => {
            try {
                const { data } = await api.get('/doctor/patients');
                setPatients(data.patients || []);
            } catch (err) {
                setError(err.message || 'Could not load registry');
            } finally {
                setLoading(false);
            }
        };
        fetchPatients();
    }, []);

    return (
        <DashboardLayout role="Doctor" navItems={navItems}>
            <div className="space-y-8 py-6">
                <div>
                    <h2 className="text-3xl font-display font-bold text-white">Verified Patient Registry</h2>
                    <p className="text-text-secondary mt-1">Found {patients.length} identities established on the protocol.</p>
                </div>

                <GlassCard className="overflow-hidden p-0 border-medichain-border">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-medichain-bg-dark/50 border-b border-medichain-border">
                                <tr className="text-[10px] text-text-secondary uppercase tracking-[0.2em]">
                                    <th className="px-6 py-4 font-bold">Identity</th>
                                    <th className="px-6 py-4 font-bold">Wallet Address</th>
                                    <th className="px-6 py-4 font-bold text-center">Blood</th>
                                    <th className="px-6 py-4 font-bold">Provisioned</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-medichain-border">
                                {loading ? (
                                    [1, 2, 3].map(i => (
                                        <tr key={i} className="animate-pulse">
                                            <td className="px-6 py-6"><div className="h-4 bg-medichain-surface rounded w-32" /></td>
                                            <td className="px-6 py-6"><div className="h-4 bg-medichain-surface rounded w-48" /></td>
                                            <td className="px-6 py-6"><div className="h-4 bg-medichain-surface rounded w-8 mx-auto" /></td>
                                            <td className="px-6 py-6"><div className="h-4 bg-medichain-surface rounded w-24" /></td>
                                            <td className="px-6 py-6"><div className="h-8 bg-medichain-surface rounded w-20 ml-auto" /></td>
                                        </tr>
                                    ))
                                ) : patients.length > 0 ? (
                                    patients.map((p) => (
                                        <tr key={p._id} className="group hover:bg-medichain-surface/20 transition-all">
                                            <td className="px-6 py-6 flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-accent-cyan/10 flex items-center justify-center text-accent-cyan text-xs">
                                                    {p.name[0]}
                                                </div>
                                                <span className="font-bold text-white">{p.name}</span>
                                            </td>
                                            <td className="px-6 py-6 font-mono text-xs text-text-secondary">
                                                {p.walletAddress ? formatAddress(p.walletAddress) : 'NOT_LINKED'}
                                            </td>
                                            <td className="px-6 py-6 text-center">
                                                <span className="px-2 py-0.5 rounded bg-medichain-bg-dark border border-medichain-border text-accent-cyan font-bold text-[10px]">
                                                    {p.bloodGroup || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-6 text-xs text-text-secondary">
                                                {new Date(p.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-6 text-right">
                                                <FuturisticButton 
                                                    variant="secondary" 
                                                    className="scale-75 origin-right"
                                                    onClick={() => navigate(`/prescribe?patient=${p.walletAddress}`)}
                                                    disabled={!p.walletAddress}
                                                >
                                                    Deploy Rx
                                                </FuturisticButton>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-20 text-center text-text-secondary italic">
                                            No patients found in the registry.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </GlassCard>

                {error && <p className="text-center text-status-danger text-sm">{error}</p>}
            </div>
        </DashboardLayout>
    );
};

export default PatientRegistry;
