// frontend/src/pages/UploadPrescription.jsx
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import GlassCard from '../components/GlassCard';
import FuturisticButton from '../components/FuturisticButton';
import CDSSAlertBanner from '../components/cdss/CDSSAlertBanner';
import api from '../utils/api';
import useBlockchain from '../hooks/useBlockchain';
import useWallet from '../hooks/useWallet';
import { cidToGatewayUrl } from '../utils/web3';

const UploadPrescription = () => {
    const [searchParams] = useSearchParams();
    const patientAddressUrl = searchParams.get('patient') || '';

    const [patientAddress, setPatientAddress] = useState(patientAddressUrl);
    const [recordType, setRecordType]         = useState('prescription');
    const [description, setDescription]       = useState('');
    const [drugs, setDrugs]                   = useState(''); // comma-separated for AI check
    const [file, setFile]                     = useState(null);
    
    const [loading, setLoading]     = useState(false);
    const [error, setError]         = useState('');
    const [success, setSuccess]     = useState('');
    const [cdssAnalysis, setCdssAnalysis] = useState(null);
    
    const { addRecord, loading: chainLoading } = useBlockchain();
    const { connected, connect }               = useWallet();

    const navItems = [
        { label: 'Dashboard', path: '/doctor-dashboard', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg> },
        { label: 'QR Scanner', path: '/scan', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 17h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/></svg> },
        { label: 'Upload Prescription', path: '/upload-prescription', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/></svg> },
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setCdssAnalysis(null);

        if (!patientAddress) return setError('Patient wallet address is required');
        if (!file) return setError('Please upload a file (PDF or Image)');
        if (!connected) return setError('Connect your wallet to sign the blockchain transaction');

        setLoading(true);
        try {
            // 1. Prepare Multipart Form
            const formData = new FormData();
            formData.append('file', file);
            formData.append('patientWalletAddress', patientAddress);
            formData.append('recordType', recordType);
            formData.append('notes', description);
            
            if (recordType === 'prescription' && drugs) {
                formData.append('medications', drugs);
            }

            // 2. Upload to IPFS & Run AI Analysis via Backend
            const { data } = await api.post('/doctor/upload-record', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            // Set CDSS analysis results
            if (data.record?.aiAnalysis) {
                setCdssAnalysis(data.record.aiAnalysis);
            }

            // 3. Anchor CID on Blockchain
            const cid = data.record.ipfsCID;
            const url = data.record.ipfsURL || cidToGatewayUrl(cid);
            await addRecord(patientAddress, cid, url, recordType, description);

            setSuccess('Record successfully uploaded to IPFS and anchored on blockchain.');
            setDescription('');
            setDrugs('');
            setFile(null);
        } catch (err) {
            console.error('[UploadPrescription] Error:', err);
            
            // Check for 422 CDSS Blocking validation error
            if (err.message && err.message.includes('422')) {
                // Try to extract CDSS error data from the error response
                setError('Upload Blocked: A high-severity drug interaction or dosage safety warning was detected by the CDSS.');
            } else {
                setError(err.message || 'Deployment failed');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <DashboardLayout role="Doctor" navItems={navItems}>
            <div className="max-w-5xl mx-auto space-y-8 py-6">
                <div className="flex justify-between items-end">
                    <div>
                        <h2 className="text-3xl font-display font-bold text-white">Clinical Deployment</h2>
                        <p className="text-text-secondary mt-1">Issue blockchain-anchored, AI-validated prescriptions.</p>
                    </div>
                    {!connected && <FuturisticButton variant="wallet" onClick={connect}>Connect Signer</FuturisticButton>}
                </div>

                {success && (
                    <div className="p-4 rounded-xl bg-status-success/10 border border-status-success/30 text-status-success text-sm flex items-center gap-3">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                        {success}
                    </div>
                )}

                {cdssAnalysis && (
                    <div className="animate-fade-in">
                        <CDSSAlertBanner analysis={cdssAnalysis} onDismiss={() => setCdssAnalysis(null)} />
                    </div>
                )}

                <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        <GlassCard>
                            <h3 className="text-lg font-bold mb-6 text-white">Record Metadata</h3>
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] uppercase text-text-secondary tracking-widest mb-2 font-bold">Patient Wallet</label>
                                        <input 
                                            type="text" 
                                            value={patientAddress}
                                            onChange={e => setPatientAddress(e.target.value)}
                                            placeholder="0x..." 
                                            className="w-full bg-medichain-bg-dark border border-medichain-border rounded-lg px-4 py-3 text-sm font-mono text-accent-cyan outline-none focus:border-accent-cyan" 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] uppercase text-text-secondary tracking-widest mb-2 font-bold">Record Category</label>
                                        <select 
                                            value={recordType}
                                            onChange={e => setRecordType(e.target.value)}
                                            className="w-full bg-medichain-bg-dark border border-medichain-border rounded-lg px-4 py-3 text-sm outline-none focus:border-accent-cyan"
                                        >
                                            <option value="prescription">Prescription</option>
                                            <option value="lab_report">Lab Report</option>
                                            <option value="diagnosis">Clinical Diagnosis</option>
                                            <option value="xray">Medical Imaging</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] uppercase text-text-secondary tracking-widest mb-2 font-bold">Clinical Description</label>
                                    <textarea 
                                        rows="3" 
                                        value={description}
                                        onChange={e => setDescription(e.target.value)}
                                        placeholder="Enter medical notes or summary of the document..." 
                                        className="w-full bg-medichain-bg-dark border border-medichain-border rounded-lg px-4 py-3 text-sm outline-none focus:border-accent-cyan"
                                    ></textarea>
                                </div>

                                {recordType === 'prescription' && (
                                    <div>
                                        <label className="block text-[10px] uppercase text-accent-indigo tracking-widest mb-2 font-bold">
                                            💊 Drug Ingredients (AI Check)
                                        </label>
                                        <input 
                                            type="text" 
                                            value={drugs}
                                            onChange={e => setDrugs(e.target.value)}
                                            placeholder="e.g. Amoxicillin, Warfarin, Aspirin" 
                                            className="w-full bg-accent-indigo/5 border border-accent-indigo/30 rounded-lg px-4 py-3 text-sm outline-none focus:border-accent-indigo" 
                                        />
                                        <p className="text-[10px] text-text-secondary mt-2">Enter drug names separated by commas. Our AI will check RxNorm for interactions.</p>
                                    </div>
                                )}
                            </div>
                        </GlassCard>
                    </div>

                    <div className="space-y-6">
                        <GlassCard glowBorder={true} className="border-accent-blue/30">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-accent-blue mb-4">File Attachment</h3>
                            <div className="relative group">
                                <input 
                                    type="file" 
                                    onChange={e => setFile(e.target.files[0])}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                                />
                                <div className={`p-8 rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center text-center ${
                                    file ? 'bg-accent-blue/10 border-accent-blue/50' : 'bg-medichain-bg-dark/50 border-medichain-border group-hover:border-accent-blue/40'
                                }`}>
                                    <svg className={`w-10 h-10 mb-2 ${file ? 'text-accent-blue' : 'text-text-secondary'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                    <p className="text-xs font-bold">{file ? file.name : 'Choose File'}</p>
                                    <p className="text-[10px] text-text-secondary mt-1">PDF, JPG, PNG (Max 10MB)</p>
                                </div>
                            </div>
                        </GlassCard>

                        <div className="space-y-4">
                            {error && <p className="text-[10px] text-status-danger bg-status-danger/5 p-3 rounded-lg border border-status-danger/20 font-bold">{error}</p>}
                            
                            <FuturisticButton 
                                type="submit" 
                                fullWidth 
                                disabled={loading || chainLoading}
                            >
                                {loading ? 'Uploading to IPFS...' : chainLoading ? 'Signing Transaction...' : 'Sign & Deploy to Chain'}
                            </FuturisticButton>
                            
                            <div className="p-3 rounded-lg bg-medichain-surface border border-medichain-border">
                                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-text-secondary">
                                    <span>Blockchain Target</span>
                                    <span className="text-status-success">Hardhat Node</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </DashboardLayout>
    );
};

export default UploadPrescription;
