// frontend/src/pages/UploadPrescription.jsx
import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import GlassCard from '../components/GlassCard';
import FuturisticButton from '../components/FuturisticButton';
import CDSSAlertBanner from '../components/cdss/CDSSAlertBanner';
import api from '../utils/api';
import useBlockchain from '../hooks/useBlockchain';
import { useWalletContext } from '../context/WalletContext';
import { useAuth } from '../context/AuthContext';
import { cidToGatewayUrl } from '../utils/web3';
import { MEDICINE_IMAGES, MEDICAL_IMAGES } from '../utils/images';

const UploadPrescription = () => {
    const [searchParams] = useSearchParams();
    const patientAddressUrl = searchParams.get('patient') || '';
    const { user } = useAuth();
    const isDoctorOrHospital = user?.role === 'doctor' || user?.role === 'hospital';

    const [patientAddress, setPatientAddress] = useState(patientAddressUrl);
    const [recordType, setRecordType]         = useState('prescription');
    const [description, setDescription]       = useState('');
    const [drugs, setDrugs]                   = useState(''); // comma-separated for AI check
    const [file, setFile]                     = useState(null);
    
    const [loading, setLoading]               = useState(false);
    const [error, setError]                   = useState('');
    const [success, setSuccess]               = useState('');
    const [cdssAnalysis, setCdssAnalysis]     = useState(null);
    
    const { addRecord, loading: chainLoading } = useBlockchain();
    const { isConnected, connectWallet, address } = useWalletContext();

    const navItems = isDoctorOrHospital ? [
        { label: 'Dashboard', path: '/doctor-dashboard', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg> },
        { label: 'QR Scanner', path: '/scan', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 17h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/></svg> },
        { label: 'Upload Prescription', path: '/upload-prescription', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/></svg> },
    ] : [
        { label: 'Dashboard', path: '/patient-dashboard', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg> },
        { label: 'Records', path: '/records', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg> },
        { label: 'Access', path: '/access', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg> },
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setCdssAnalysis(null);

        if (isDoctorOrHospital && !patientAddress) {
            return setError('Patient ID or wallet address is required for doctor uploads');
        }
        if (!file) {
            return setError('Please choose a prescription file (PDF, JPG, or PNG)');
        }

        setLoading(true);
        try {
            // 1. Prepare Multipart Form (do not manually set Content-Type header so boundary generates automatically)
            const formData = new FormData();
            formData.append('file', file);
            formData.append('recordType', recordType);
            formData.append('notes', description);
            
            if (recordType === 'prescription' && drugs) {
                formData.append('medications', drugs);
            }

            let endpoint = '/doctor/upload-record';
            if (isDoctorOrHospital) {
                formData.append('patientWalletAddress', patientAddress.trim());
                formData.append('patientId', patientAddress.trim());
            } else {
                endpoint = '/patient/upload-record';
            }

            // 2. Upload to IPFS & Save to Database via Backend
            const { data } = await api.post(endpoint, formData);

            // Set CDSS analysis results if returned
            if (data.record?.aiAnalysis) {
                setCdssAnalysis(data.record.aiAnalysis);
            }

            const cid = data.record?.ipfsCID;
            const recordId = data.record?._id;
            const targetAddress = patientAddress.trim() || user?.walletAddress || address;

            // 3. Optional On-Chain Anchoring (if wallet connected)
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
                    setSuccess('Prescription securely uploaded to IPFS and anchored on Ethereum Sepolia.');
                } catch (chainErr) {
                    console.warn('[UploadPrescription] Blockchain anchoring warning:', chainErr);
                    setSuccess('Prescription securely uploaded to IPFS and saved to database. (Blockchain anchoring skipped)');
                }
            } else {
                setSuccess('Prescription securely stored on IPFS & database. Connect MetaMask anytime to anchor on-chain.');
            }

            setDescription('');
            setDrugs('');
            setFile(null);
        } catch (err) {
            console.error('[UploadPrescription] Error:', err);
            
            if (err.message && err.message.includes('422')) {
                setError('Upload Blocked: A high-severity drug interaction or dosage safety warning was detected by the CDSS.');
            } else if (err.message && err.message.includes('File type not allowed')) {
                setError('Please upload a valid PDF, JPG, or PNG prescription.');
            } else if (err.message && err.message.includes('File too large')) {
                setError('Prescription file is too large (Maximum 10MB).');
            } else {
                setError(err.message || 'Prescription storage service is temporarily unavailable. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <DashboardLayout role={isDoctorOrHospital ? 'Doctor' : 'Patient'} navItems={navItems}>
            <div className="max-w-5xl mx-auto space-y-6 py-4 sm:py-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3">
                    <div>
                        <h2 className="text-2xl sm:text-3xl font-display font-bold text-white">Upload Medical Record & Prescription</h2>
                        <p className="text-text-secondary text-xs sm:text-sm mt-1">
                            {isDoctorOrHospital 
                                ? 'Issue AI-validated, IPFS-backed diagnostic prescriptions for patients.'
                                : 'Upload and store your personal prescription safely on IPFS.'}
                        </p>
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

                {cdssAnalysis && (
                    <div className="animate-fade-in">
                        <CDSSAlertBanner analysis={cdssAnalysis} onDismiss={() => setCdssAnalysis(null)} />
                    </div>
                )}

                <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <GlassCard>
                            <h3 className="text-base sm:text-lg font-bold mb-4 sm:mb-6 text-white">Record Metadata</h3>
                            <div className="space-y-4 sm:space-y-6">
                                {isDoctorOrHospital && (
                                    <div>
                                        <label className="block text-[10px] uppercase text-text-secondary tracking-widest mb-2 font-bold">Patient Wallet Address</label>
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
                                    <label className="block text-[10px] uppercase text-text-secondary tracking-widest mb-2 font-bold">Record Category</label>
                                    <select 
                                        value={recordType}
                                        onChange={e => setRecordType(e.target.value)}
                                        className="w-full bg-medichain-bg-dark border border-medichain-border rounded-lg px-4 py-3 text-sm outline-none focus:border-accent-cyan min-h-[44px]"
                                    >
                                        <option value="prescription">Prescription</option>
                                        <option value="lab_report">Lab Report</option>
                                        <option value="diagnosis">Clinical Diagnosis</option>
                                        <option value="xray">Medical Imaging / Scan</option>
                                        <option value="other">Other Document</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[10px] uppercase text-text-secondary tracking-widest mb-2 font-bold">Clinical Description / Notes</label>
                                    <textarea 
                                        rows="3" 
                                        value={description}
                                        onChange={e => setDescription(e.target.value)}
                                        placeholder="Enter medical notes, diagnosis summary, or dosage instructions..." 
                                        className="w-full bg-medichain-bg-dark border border-medichain-border rounded-lg px-4 py-3 text-sm outline-none focus:border-accent-cyan"
                                    ></textarea>
                                </div>

                                {recordType === 'prescription' && (
                                    <div>
                                        <label className="block text-[10px] uppercase text-accent-indigo tracking-widest mb-2 font-bold">
                                            💊 Drug Names (For AI Safety Check)
                                        </label>
                                        <input 
                                            type="text" 
                                            value={drugs}
                                            onChange={e => setDrugs(e.target.value)}
                                            placeholder="e.g. Metformin, Aspirin, Lisinopril" 
                                            className="w-full bg-accent-indigo/5 border border-accent-indigo/30 rounded-lg px-4 py-3 text-sm outline-none focus:border-accent-indigo min-h-[44px]" 
                                        />
                                        <p className="text-[10px] text-text-secondary mt-1.5">Enter active ingredients separated by commas for automated CDSS interaction auditing.</p>
                                    </div>
                                )}
                            </div>
                        </GlassCard>
                    </div>

                    <div className="space-y-6">
                        {/* Real medicine / record type image */}
                        <GlassCard className="p-0 overflow-hidden">
                          <div className="relative w-full h-36">
                            <img
                              src={
                                recordType === 'prescription' ? MEDICINE_IMAGES.prescription :
                                recordType === 'lab_report'   ? MEDICAL_IMAGES.lab :
                                recordType === 'xray'         ? MEDICAL_IMAGES.xray :
                                recordType === 'diagnosis'    ? MEDICAL_IMAGES.stethoscope :
                                MEDICINE_IMAGES.pharmacy
                              }
                              alt={`${recordType} illustration`}
                              className="w-full h-full object-cover"
                              onError={(e) => { e.target.src = MEDICINE_IMAGES.pills; }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/95 via-slate-900/30 to-transparent" />
                            <div className="absolute bottom-3 left-4">
                              <p className="text-xs font-bold text-white capitalize">{recordType.replace(/_/g, ' ')}</p>
                              <p className="text-[10px] text-cyan-300">AI-validated · IPFS-stored · Encrypted</p>
                            </div>
                          </div>
                        </GlassCard>

                        <GlassCard glowBorder={true} className="border-accent-blue/30">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-accent-blue mb-4">File Attachment</h3>
                            <div className="relative group">
                                <input 
                                    type="file" 
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    onChange={e => setFile(e.target.files[0])}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                                />
                                <div className={`p-6 sm:p-8 rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center text-center ${
                                    file ? 'bg-accent-blue/10 border-accent-blue/50' : 'bg-medichain-bg-dark/50 border-medichain-border group-hover:border-accent-blue/40'
                                }`}>
                                    <svg className={`w-8 h-8 sm:w-10 sm:h-10 mb-2 ${file ? 'text-accent-blue' : 'text-text-secondary'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                    <p className="text-xs font-bold truncate max-w-[200px]">{file ? file.name : 'Choose File'}</p>
                                    <p className="text-[10px] text-text-secondary mt-1">PDF, JPG, PNG (Max 10MB)</p>
                                </div>
                            </div>
                        </GlassCard>

                        <div className="space-y-4">
                            {error && <p className="text-[11px] text-status-danger bg-status-danger/10 p-3 rounded-lg border border-status-danger/30 font-semibold">{error}</p>}
                            
                            <FuturisticButton 
                                type="submit" 
                                fullWidth 
                                disabled={loading || chainLoading || !file}
                                className="min-h-[48px]"
                            >
                                {loading ? 'Uploading securely to IPFS...' : chainLoading ? 'Anchoring to Blockchain...' : 'Secure & Upload Prescription'}
                            </FuturisticButton>
                            
                            <div className="p-3 rounded-lg bg-medichain-surface border border-medichain-border text-xs">
                                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-text-secondary">
                                    <span>Target Network</span>
                                    <span className="text-hc-blue font-bold">Ethereum Sepolia (11155111)</span>
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
