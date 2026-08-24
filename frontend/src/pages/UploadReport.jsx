// frontend/src/pages/UploadReport.jsx
import React, { useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import GlassCard from '../components/GlassCard';
import FuturisticButton from '../components/FuturisticButton';
import api from '../utils/api';
import useBlockchain from '../hooks/useBlockchain';
import { useWalletContext } from '../context/WalletContext';
import { useAuth } from '../context/AuthContext';
import { cidToGatewayUrl } from '../utils/web3';

const UploadReport = () => {
    const { user } = useAuth();
    const isDoctorOrHospital = user?.role === 'doctor' || user?.role === 'hospital';

    const [patientAddress, setPatientAddress] = useState('');
    const [recordType, setRecordType]         = useState('lab_report');
    const [description, setDescription]       = useState('');
    const [file, setFile]                     = useState(null);
    const [loading, setLoading]               = useState(false);
    const [error, setError]                   = useState('');
    const [success, setSuccess]               = useState('');

    const { addRecord, loading: chainLoading } = useBlockchain();
    const { isConnected, connectWallet, address } = useWalletContext();

    const navItems = isDoctorOrHospital ? [
        { label: 'Dashboard', path: '/hospital-dashboard', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg> },
        { label: 'Upload Report', path: '/upload-report', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg> },
    ] : [
        { label: 'Dashboard', path: '/patient-dashboard', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg> },
        { label: 'Records', path: '/records', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg> },
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (isDoctorOrHospital && !patientAddress) {
            return setError('Patient protocol/wallet address required');
        }
        if (!file) {
            return setError('Please attach a diagnostic file (PDF, JPG, PNG)');
        }

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('recordType', recordType);
            formData.append('notes', description);

            let endpoint = '/doctor/upload-record';
            if (isDoctorOrHospital) {
                formData.append('patientWalletAddress', patientAddress.trim());
            } else {
                endpoint = '/patient/upload-record';
            }

            const { data } = await api.post(endpoint, formData);

            const cid = data.record?.ipfsCID;
            const recordId = data.record?._id;
            const targetAddress = patientAddress.trim() || user?.walletAddress || address;

            if (isConnected && targetAddress && cid) {
                try {
                    const url = data.record.ipfsURL || cidToGatewayUrl(cid);
                    const tx = await addRecord(targetAddress, cid, url, recordType, description);
                    if (tx?.hash && recordId) {
                        const patchEndpoint = isDoctorOrHospital
                            ? `/doctor/record/${recordId}/txhash`
                            : `/patient/record/${recordId}/txhash`;
                        await api.patch(patchEndpoint, { txHash: tx.hash }).catch(() => {});
                    }
                    setSuccess('Laboratory report successfully uploaded to IPFS and anchored to Ethereum Sepolia.');
                } catch (chainErr) {
                    console.warn('[UploadReport] Blockchain anchoring warning:', chainErr);
                    setSuccess('Laboratory report successfully uploaded to IPFS & saved to database.');
                }
            } else {
                setSuccess('Laboratory report securely stored on IPFS & saved to database.');
            }

            setPatientAddress('');
            setDescription('');
            setFile(null);
        } catch (err) {
            setError(err.message || 'Prescription and report storage service encountered an error.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <DashboardLayout role={isDoctorOrHospital ? 'Hospital' : 'Patient'} navItems={navItems}>
            <div className="max-w-4xl mx-auto py-6 sm:py-10 space-y-6 sm:space-y-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3">
                   <div>
                       <h2 className="text-2xl sm:text-3xl font-display font-bold text-white">Diagnostic Disbursement</h2>
                       <p className="text-text-secondary text-xs sm:text-sm mt-1">Upload verified diagnostic and laboratory findings to decentralized storage.</p>
                   </div>
                   {!isConnected && (
                       <FuturisticButton variant="wallet" onClick={connectWallet} className="min-h-[40px] text-xs">
                           Connect Wallet (Optional)
                       </FuturisticButton>
                   )}
                </div>

                {success && (
                    <div className="p-4 rounded-xl bg-status-success/15 border border-status-success/40 text-status-success text-sm flex items-center gap-3 animate-slide-up">
                        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                        <span>✓ {success}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                    <GlassCard className="space-y-4 sm:space-y-6">
                        {isDoctorOrHospital && (
                            <div>
                                <label className="block text-[10px] uppercase text-text-secondary tracking-widest mb-2 font-bold">Patient Protocol Address</label>
                                <input 
                                    type="text" 
                                    value={patientAddress}
                                    onChange={e => setPatientAddress(e.target.value)}
                                    placeholder="0x..." 
                                    className="w-full bg-medichain-bg-dark border border-medichain-border rounded-lg px-4 py-3 text-sm font-mono text-accent-cyan outline-none focus:border-accent-cyan min-h-[44px]" 
                                    required={isDoctorOrHospital}
                                />
                            </div>
                        )}
                        <div>
                            <label className="block text-[10px] uppercase text-text-secondary tracking-widest mb-2 font-bold">Report Type</label>
                            <select 
                                value={recordType}
                                onChange={e => setRecordType(e.target.value)}
                                className="w-full bg-medichain-bg-dark border border-medichain-border rounded-lg px-4 py-3 text-sm outline-none focus:border-accent-cyan min-h-[44px]"
                            >
                                <option value="lab_report">Lab Report</option>
                                <option value="prescription">Prescription</option>
                                <option value="diagnosis">Clinical Diagnosis</option>
                                <option value="xray">Medical Imaging</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] uppercase text-text-secondary tracking-widest mb-2 font-bold">Clinical Findings Summary</label>
                            <textarea 
                                rows="4" 
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="Summary of results, lab tests, and doctor notes..." 
                                className="w-full bg-medichain-bg-dark border border-medichain-border rounded-lg px-4 py-3 text-sm outline-none focus:border-accent-cyan"
                            />
                        </div>
                    </GlassCard>

                    <div className="space-y-6">
                        <GlassCard glowBorder={true}>
                            <h3 className="text-sm font-bold mb-4">Diagnostic File</h3>
                            <input 
                                type="file" 
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={e => setFile(e.target.files[0])}
                                className="w-full text-xs text-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-accent-cyan/10 file:text-accent-cyan hover:file:bg-accent-cyan/20 cursor-pointer min-h-[44px]" 
                            />
                            <p className="text-[10px] text-text-secondary mt-2">Accepted formats: PDF, JPG, PNG (Max 10MB)</p>
                        </GlassCard>

                        {error && (
                            <div className="p-3 bg-status-danger/10 border border-status-danger/30 rounded-lg text-xs text-status-danger font-semibold">
                                {error}
                            </div>
                        )}

                        <FuturisticButton 
                            type="submit" 
                            fullWidth 
                            disabled={loading || chainLoading || !file}
                            className="min-h-[48px]"
                        >
                            {loading ? 'Uploading securely to IPFS...' : chainLoading ? 'Anchoring to Blockchain...' : 'Commit Report to Decentralized Storage'}
                        </FuturisticButton>
                    </div>
                </form>
            </div>
        </DashboardLayout>
    );
};

export default UploadReport;
