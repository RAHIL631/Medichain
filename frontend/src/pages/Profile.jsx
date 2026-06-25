// frontend/src/pages/Profile.jsx
import React, { useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import GlassCard from '../components/GlassCard';
import FuturisticButton from '../components/FuturisticButton';
import { useAuth } from '../context/AuthContext';
import useWallet from '../hooks/useWallet';
import { formatAddress } from '../utils/web3';

const Profile = () => {
    const { user, updateWallet } = useAuth();
    const { account, connected, connect } = useWallet();
    const [loading, setLoading] = useState(false);
    const [msg, setMsg]         = useState('');

    const handleLinkWallet = async () => {
        if (!connected || !account) return;
        setLoading(true);
        try {
            await updateWallet(account);
            setMsg('Wallet successfully linked to your profile.');
        } catch (err) {
            setMsg('Error linking wallet: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const patientNav = [
        { label: 'Dashboard', path: '/patient-dashboard', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg> },
        { label: 'Medical Records', path: '/records', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg> },
        { label: 'Profile', path: '/profile', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg> },
    ];

    const doctorNav = [
        { label: 'Dashboard', path: '/doctor-dashboard', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg> },
        { label: 'Profile', path: '/profile', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg> },
    ];

    const navItems = user?.role === 'patient' ? patientNav : doctorNav;

    return (
        <DashboardLayout role={user?.role} navItems={navItems}>
            <div className="max-w-4xl mx-auto py-10 space-y-8">
                <div>
                    <h2 className="text-3xl font-display font-bold text-white">Identity Configuration</h2>
                    <p className="text-text-secondary mt-1">Manage your health profile and cryptographic links.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-2 space-y-6">
                        <GlassCard>
                            <h3 className="text-sm font-bold uppercase tracking-widest text-text-secondary mb-6">User Details</h3>
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <p className="text-[10px] text-text-secondary uppercase mb-1">Full Name</p>
                                    <p className="text-white font-bold">{user?.name}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-text-secondary uppercase mb-1">Access Email</p>
                                    <p className="text-white font-bold">{user?.email}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-text-secondary uppercase mb-1">Role Type</p>
                                    <span className="px-2 py-0.5 rounded bg-medichain-bg-dark border border-medichain-border text-accent-cyan font-bold text-[10px] uppercase">
                                        {user?.role}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-[10px] text-text-secondary uppercase mb-1">Member Since</p>
                                    <p className="text-white font-bold">{new Date(user?.createdAt).toLocaleDateString()}</p>
                                </div>
                            </div>
                        </GlassCard>

                        <GlassCard glowBorder={user?.walletAddress ? false : true}>
                            <h3 className="text-sm font-bold uppercase tracking-widest text-text-secondary mb-6">Wallet Integration</h3>
                            <div className="space-y-4">
                               <div className="p-4 rounded-xl bg-medichain-bg-dark/50 border border-medichain-border flex items-center justify-between">
                                  <div>
                                     <p className="text-[10px] text-text-secondary uppercase mb-1">Linked Backend Wallet</p>
                                     <p className="text-sm font-mono text-accent-cyan">{user?.walletAddress ? formatAddress(user.walletAddress) : 'NOT_SYNCED'}</p>
                                  </div>
                                  <div className={`w-2 h-2 rounded-full ${user?.walletAddress ? 'bg-status-success' : 'bg-status-danger'} shadow-[0_0_8px] shadow-current`} />
                               </div>

                               <div className="p-4 rounded-xl bg-medichain-bg-dark/50 border border-medichain-border flex items-center justify-between">
                                  <div>
                                     <p className="text-[10px] text-text-secondary uppercase mb-1">Active MetaMask Session</p>
                                     <p className="text-sm font-mono text-white">{connected ? formatAddress(account) : 'DISCONNECTED'}</p>
                                  </div>
                                  {!connected && <FuturisticButton variant="wallet" onClick={connect}>Connect</FuturisticButton>}
                               </div>

                               {connected && account !== user?.walletAddress && (
                                  <div className="p-4 rounded-xl bg-accent-blue/10 border border-accent-blue/30 space-y-3">
                                     <p className="text-xs text-text-secondary">Detected a new wallet session. Synchronize with your profile to enable on-chain interactions?</p>
                                     <FuturisticButton fullWidth variant="primary" onClick={handleLinkWallet} disabled={loading}>
                                        {loading ? 'Synchronizing...' : 'Link Active Wallet'}
                                     </FuturisticButton>
                                  </div>
                               )}

                               {msg && <p className={`text-xs text-center font-bold ${msg.includes('Error') ? 'text-status-danger' : 'text-status-success'}`}>{msg}</p>}
                            </div>
                        </GlassCard>
                    </div>

                    <div className="space-y-6">
                        <GlassCard className="text-center">
                            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-accent-cyan to-accent-blue rounded-full flex items-center justify-center text-4xl mb-4 shadow-2xl">
                                🛡️
                            </div>
                            <h4 className="font-bold text-white uppercase tracking-widest text-xs">Security Status</h4>
                            <p className="text-[10px] text-text-secondary mt-2 mb-6 leading-relaxed">Your account is secured by decentralized identity (DID) standards.</p>
                            <FuturisticButton variant="secondary" fullWidth>Change Secret</FuturisticButton>
                        </GlassCard>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default Profile;
