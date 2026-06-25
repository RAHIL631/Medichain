// frontend/src/pages/QRScannerPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import QRScanner from '../components/QRScanner';
import GlassCard from '../components/GlassCard';
import FuturisticButton from '../components/FuturisticButton';
import api from '../utils/api';
import useBlockchain from '../hooks/useBlockchain';

const QRScannerPage = () => {
    const [scannedAddress, setScannedAddress] = useState(null);
    const [patientData, setPatientData]     = useState(null);
    const [loading, setLoading]             = useState(false);
    const [error, setError]                 = useState('');
    
    const { checkAccess } = useBlockchain();
    const navigate = useNavigate();

    const navItems = [
        { label: 'Dashboard', path: '/doctor-dashboard', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg> },
        { label: 'QR Scanner', path: '/scan', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 17h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/></svg> },
        { label: 'Prescriptions', path: '/prescribe', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/></svg> },
    ];

    const handleScanSuccess = async (address) => {
        setScannedAddress(address);
        setLoading(true);
        setError('');
        try {
            // Fetch patient info from backend
            const { data } = await api.get(`/doctor/patient/${address}`);
            setPatientData(data.patient);
            
            // Check if doctor has access on-chain
            // (Wait, we can do this in the next step when they try to view records)
        } catch (err) {
            setError(err.message || 'Could not fetch patient data');
        } finally {
            setLoading(false);
        }
    };

    return (
        <DashboardLayout role="Doctor" navItems={navItems}>
            <div className="max-w-4xl mx-auto py-10">
                <div className="mb-10 text-center">
                    <h2 className="text-3xl font-display font-bold text-white">Identity Verification</h2>
                    <p className="text-text-secondary mt-2">Scan the patient's Health ID to access their medical trail.</p>
                </div>

                {!scannedAddress ? (
                    <QRScanner onScanSuccess={handleScanSuccess} onScanError={(err) => setError('Camera error: ' + err.message)} />
                ) : (
                    <div className="space-y-6 animate-fadeIn">
                        <GlassCard glowBorder={true} className="border-accent-cyan/30">
                            {loading ? (
                                <div className="py-10 text-center">
                                    <div className="w-10 h-10 border-2 border-accent-cyan border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                                    <p className="text-sm text-text-secondary uppercase tracking-[0.2em]">Polling Blockchain...</p>
                                </div>
                            ) : error ? (
                                <div className="text-center py-6">
                                    <p className="text-status-danger text-sm mb-4">{error}</p>
                                    <FuturisticButton onClick={() => setScannedAddress(null)}>Try Again</FuturisticButton>
                                </div>
                            ) : (
                                <div className="flex flex-col md:flex-row items-center gap-8">
                                    <div className="w-24 h-24 bg-accent-cyan/10 rounded-full flex items-center justify-center border border-accent-cyan/20">
                                        <span className="text-4xl">👤</span>
                                    </div>
                                    <div className="flex-grow text-center md:text-left">
                                        <h3 className="text-2xl font-bold">{patientData?.name}</h3>
                                        <p className="text-text-secondary font-mono text-sm mt-1">{scannedAddress}</p>
                                        <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-4">
                                            <div className="px-3 py-1 bg-medichain-surface rounded-lg border border-medichain-border text-xs">
                                                <span className="text-text-secondary uppercase mr-2">Blood:</span>
                                                <span className="text-accent-cyan font-bold">{patientData?.bloodGroup}</span>
                                            </div>
                                            <div className="px-3 py-1 bg-medichain-surface rounded-lg border border-medichain-border text-xs">
                                                <span className="text-text-secondary uppercase mr-2">DOB:</span>
                                                <span className="text-white font-bold">{new Date(patientData?.dateOfBirth).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-3 w-full md:w-auto">
                                        <FuturisticButton onClick={() => navigate(`/prescribe?patient=${scannedAddress}`)}>
                                                Create Rx
                                        </FuturisticButton>
                                        <FuturisticButton variant="secondary" onClick={() => setScannedAddress(null)}>
                                                Rescan
                                        </FuturisticButton>
                                    </div>
                                </div>
                            )}
                        </GlassCard>

                        {/* Recent Access info or history could go here */}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default QRScannerPage;
