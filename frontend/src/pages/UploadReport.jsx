// frontend/src/pages/UploadReport.jsx
import React, { useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import GlassCard from '../components/GlassCard';
import FuturisticButton from '../components/FuturisticButton';
import api from '../utils/api';
import useBlockchain from '../hooks/useBlockchain';
import useWallet from '../hooks/useWallet';
import { cidToGatewayUrl } from '../utils/web3';

const UploadReport = () => {
    const [patientAddress, setPatientAddress] = useState('');
    const [description, setDescription]       = useState('');
    const [file, setFile]                     = useState(null);
    const [loading, setLoading]               = useState(false);
    const [error, setError]                   = useState('');
    const [success, setSuccess]               = useState('');

    const { addRecord, loading: chainLoading } = useBlockchain();
    const { connected, connect }               = useWallet();

    const navItems = [
        { label: 'Dashboard', path: '/hospital-dashboard', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg> },
        { label: 'Upload Report', path: '/upload-report', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg> },
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!patientAddress) return setError('Patient wallet address required');
        if (!file) return setError('Please attach diagnostic file');
        if (!connected) return setError('Please connect facility wallet');

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('recordType', 'lab-report');
            formData.append('description', description);

            const { data } = await api.post(`/doctor/patient/${patientAddress}/records`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const cid = data.record.ipfsCID;
            const url = data.record.ipfsURL || cidToGatewayUrl(cid);
            await addRecord(patientAddress, cid, url, 'lab-report', description);

            setSuccess('Laboratory report successfully anchored to blockchain.');
            setPatientAddress('');
            setDescription('');
            setFile(null);
        } catch (err) {
            setError(err.message || 'Deployment failure');
        } finally {
            setLoading(false);
        }
    };

    return (
        <DashboardLayout role="Hospital" navItems={navItems}>
            <div className="max-w-4xl mx-auto py-10 space-y-8">
                <div>
                   <h2 className="text-3xl font-display font-bold text-white">Diagnostic Disbursement</h2>
                   <p className="text-text-secondary mt-1">Upload verified laboratory findings to the patient's ledger.</p>
                </div>

                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <GlassCard className="space-y-6">
                        <div>
                            <label className="block text-[10px] uppercase text-text-secondary tracking-widest mb-2 font-bold">Patient Protocol Address</label>
                            <input 
                                type="text" 
                                value={patientAddress}
                                onChange={e => setPatientAddress(e.target.value)}
                                placeholder="0x..." 
                                className="w-full bg-medichain-bg-dark border border-medichain-border rounded-lg px-4 py-3 text-sm font-mono text-accent-cyan outline-none" 
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] uppercase text-text-secondary tracking-widest mb-2 font-bold">Clinical Findings Summary</label>
                            <textarea 
                                rows="5" 
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="Summary of results..." 
                                className="w-full bg-medichain-bg-dark border border-medichain-border rounded-lg px-4 py-3 text-sm outline-none focus:border-accent-cyan"
                            />
                        </div>
                    </GlassCard>

                    <div className="space-y-6">
                        <GlassCard glowBorder={true}>
                            <h3 className="text-sm font-bold mb-4">Diagnostic File</h3>
                            <input 
                                type="file" 
                                onChange={e => setFile(e.target.files[0])}
                                className="w-full text-xs text-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-accent-cyan/10 file:text-accent-cyan hover:file:bg-accent-cyan/20 cursor-pointer" 
                            />
                        </GlassCard>

                        <div className="space-y-4">
                            {error && <p className="text-xs text-status-danger font-bold text-center">{error}</p>}
                            {success && <p className="text-xs text-status-success font-bold text-center">{success}</p>}
                            
                            <FuturisticButton 
                                type="submit" 
                                fullWidth 
                                disabled={loading || chainLoading}
                            >
                                {loading ? 'Uploading Data...' : chainLoading ? 'Anchoring Transaction...' : 'Verify & Sign Deployment'}
                            </FuturisticButton>
                        </div>
                    </div>
                </form>
            </div>
        </DashboardLayout>
    );
};

export default UploadReport;
