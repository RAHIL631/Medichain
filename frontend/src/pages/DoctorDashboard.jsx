// frontend/src/pages/DoctorDashboard.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import useWallet from '../hooks/useWallet';
import { getContract, formatAddress } from '../utils/web3';

import DashboardLayout from '../components/DashboardLayout';
import GlassCard from '../components/GlassCard';
import FuturisticButton from '../components/FuturisticButton';
import QRScanner from '../components/QRScanner';
import RecordCard from '../components/RecordCard';
import AIAlert from '../components/AIAlert';
import StorageProof from '../components/StorageProof';

const getRiskColor = (level) => {
  if (!level) return 'bg-medichain-surface text-text-secondary';
  const l = level.toLowerCase();
  if (l === 'critical' || l === 'high') return 'bg-status-danger text-white border-status-danger';
  if (l === 'medium') return 'bg-status-warning text-black border-status-warning';
  if (l === 'low') return 'bg-status-success text-white border-status-success';
  return 'bg-medichain-surface text-white border-medichain-border';
};

const DoctorDashboard = () => {
    const { user, logout } = useAuth();
    const { account, connected, connect, signer, error: walletError } = useWallet();
    const navigate = useNavigate();

    // UI Navigation
    const navItems = [
        { label: 'Dashboard', path: '/doctor-dashboard', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg> },
        { label: 'Upload Prescription', path: '/upload-prescription', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/></svg> },
        { label: 'AI CDSS', path: '/ai-dashboard', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364.364l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg> },
        { label: '🔬 Rx Validator', path: '/prescription-validator', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg> },
        { label: '🩺 Health Scorer', path: '/health-risk', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg> },
        { label: '🧬 Ensemble Predictor', path: '/ensemble-predict', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 17h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/></svg> },
        { label: '🗓️ Adherence Predictor', path: '/adherence-prediction', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg> },
        { label: '👥 Patient Digital Twin', path: '/digital-twin', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg> },
        { label: '📊 Live Analytics', path: '/analytics', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg> }
    ];

    // SECTION 2: QR Scanner State
    const [scanning, setScanning] = useState(false);
    const [scannedAddress, setScannedAddress] = useState('');
    
    // SECTION 3: Patient State
    const [patientData, setPatientData] = useState(null);
    const [riskProfile, setRiskProfile] = useState(null);
    const [riskLoading, setRiskLoading] = useState(false);

    // SECTION 4: Patient Records
    const [patientRecords, setPatientRecords] = useState([]);
    const [recordsLoading, setRecordsLoading] = useState(false);

    // SECTION 5: Upload Form State
    const [file, setFile] = useState(null);
    const [recordType, setRecordType] = useState('Prescription');
    const [notes, setNotes] = useState('');
    const [medications, setMedications] = useState([]);
    const [medInput, setMedInput] = useState('');
    const fileInputRef = useRef(null);

    // Drug Interaction State
    const [drugCheckLoading, setDrugCheckLoading] = useState(false);
    const [interactions, setInteractions] = useState([]);
    const [safeToUpload, setSafeToUpload] = useState(null); // null, true, false
    const [uploading, setUploadLoading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState('');

    // Blockchain TX + StorageProof state
    const [txStatus, setTxStatus]       = useState('idle'); // idle|pending|confirmed|failed
    const [txHash, setTxHash]           = useState(null);
    const [blockNumber, setBlockNumber] = useState(null);
    const [storageProof, setStorageProof] = useState(null); // { ipfsCID, ipfsURL, fileName, fileSize }

    // --- ACTIONS --- //

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleScanSuccess = async (data) => {
        if (data) {
            setScanning(false);
            setScannedAddress(data);
            fetchPatientProfile(data);
        }
    };

    const fetchPatientProfile = async (address) => {
        try {
            const { data } = await api.get(`/doctor/patient/${address}`);
            setPatientData(data.patient);
            fetchRiskScore(data.patient);
            fetchPatientRecords(address);
        } catch (err) {
            console.error('Failed to fetch patient data', err);
            alert('Failed to fetch patient data or patient not found.');
            setPatientData(null);
        }
    };

    const fetchRiskScore = async (patient) => {
        setRiskLoading(true);
        try {
            const payload = {
                name: patient.name,
                bloodGroup: patient.bloodGroup || 'O+',
                dob: patient.dateOfBirth,
                recordCount: patientRecords.length || 0
            };
            const { data } = await axios.post('http://localhost:5001/predict', payload, { timeout: 10000 });
            setRiskProfile({
                heart: data.heart_disease_risk || data.heart_disease || 'LOW',
                diabetes: data.diabetes_risk || data.diabetes || 'LOW',
                stroke: data.stroke_risk || data.stroke || 'LOW',
                overall: data.risk_level || 'LOW'
            });
        } catch (err) {
            console.error('AI Risk service error:', err);
            setRiskProfile({ heart: 'UNKNOWN', diabetes: 'UNKNOWN', stroke: 'UNKNOWN', overall: 'UNKNOWN' });
        } finally {
            setRiskLoading(false);
        }
    };

    const fetchPatientRecords = async (address) => {
        if (!signer) return;
        setRecordsLoading(true);
        try {
            const contract = getContract(signer);
            const records = await contract.getMedicalRecords(address);
            
            const formatted = records.map((r, i) => ({
                _id: i.toString(),
                recordType: r.recordType,
                description: r.notes,
                ipfsCID: r.ipfsCID,
                ipfsURL: r.ipfsURL,
                timestamp: Number(r.timestamp),
                doctor: r.doctor,
                verified: true
            }));
            
            // Reverse to show newest first
            setPatientRecords(formatted.reverse());
        } catch (err) {
            console.error("Blockchain fetch error:", err);
        } finally {
            setRecordsLoading(false);
        }
    };

    const handleAddMedication = (e) => {
        e.preventDefault();
        if (medInput.trim() && !medications.includes(medInput.trim())) {
            setMedications([...medications, medInput.trim()]);
            setMedInput('');
            setSafeToUpload(null);
        }
    };

    const removeMedication = (med) => {
        setMedications(medications.filter(m => m !== med));
        setSafeToUpload(null);
    };

    const handleCheckDrugs = async () => {
        if (medications.length === 0) return alert('Add medications to check interactions.');
        setDrugCheckLoading(true);
        setInteractions([]);
        setSafeToUpload(null);

        try {
            // Fetch current meds from backend
            let currentMeds = [];
            try {
                const { data } = await api.get(`/patient/medications?address=${scannedAddress}`);
                currentMeds = data.medications || [];
            } catch (err) {
                console.warn('Could not fetch existing patient meds, checking new ones only.');
            }

            const { data } = await axios.post('http://localhost:5001/check-drugs', {
                newDrugs: medications,
                currentMedications: currentMeds
            });

            if (data.conflicts && data.conflicts.length > 0) {
                setInteractions(data.conflicts);
                setSafeToUpload(false);
            } else {
                setSafeToUpload(true);
            }
        } catch (err) {
            console.error('Drug check failed:', err);
            // Fallback: allow upload if AI service is down
            setSafeToUpload(true); 
            alert('AI Drug Service offline. Proceed with caution.');
        } finally {
            setDrugCheckLoading(false);
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // PHASE 2 — storeOnBlockchain
    // Called after the backend confirms IPFS upload + MongoDB save.
    // Sends the IPFS CID to the MediChain smart contract via MetaMask.
    // ─────────────────────────────────────────────────────────────────────────
    const storeOnBlockchain = async ({ recordId, ipfsCID, ipfsURL, patientAddress, recordType, notes }) => {
        setUploadStatus('2/3 Awaiting MetaMask signature…');
        setTxStatus('pending');

        const contract = getContract(signer);

        // Normalise recordType to contract-accepted values
        const contractRecordType = (recordType || 'other').toLowerCase().replace('-', '_');

        // This triggers the MetaMask popup
        const tx = await contract.addMedicalRecord(
            patientAddress,
            ipfsCID,
            ipfsURL,
            contractRecordType,
            notes || ''
        );

        // Store the pending TX hash immediately so the UI can show it
        setTxHash(tx.hash);
        setUploadStatus(`3/3 Mining… TX: ${tx.hash.slice(0, 10)}…`);

        // Wait for 1 confirmation
        const receipt = await tx.wait(1);

        // Persist TX hash + block number to MongoDB
        await api.patch(`/doctor/record/${recordId}/txhash`, {
            txHash:      receipt.hash,
            blockNumber: receipt.blockNumber,
        });

        setBlockNumber(receipt.blockNumber);
        setTxStatus('confirmed');

        console.log(`[BLOCKCHAIN] ✅ TX confirmed: ${receipt.hash} in block #${receipt.blockNumber}`);
        return receipt;
    };

    // ─────────────────────────────────────────────────────────────────────────
    // handleUploadRecord — orchestrates all 3 phases
    // ─────────────────────────────────────────────────────────────────────────
    const handleUploadRecord = async () => {
        if (!file)             return alert('Please attach a file.');
        if (safeToUpload === false) return alert('Cannot upload — drug conflicts detected.');
        if (!signer)           return alert('Connect your wallet first.');
        if (!scannedAddress)   return alert('Scan a patient QR code first.');

        setUploadLoading(true);
        setUploadStatus('1/3 Uploading to IPFS…');
        setStorageProof(null);
        setTxStatus('idle');
        setTxHash(null);
        setBlockNumber(null);

        try {
            // ── PHASE 1: Backend → IPFS (Pinata) + MongoDB save ───────────────
            const formData = new FormData();
            formData.append('file',                 file);
            formData.append('patientWalletAddress', scannedAddress);  // field name matches doctor.js
            formData.append('recordType',           recordType.toLowerCase().replace('-', '_'));
            formData.append('notes',                notes || '');
            // medications as comma-separated string — doctor.js splits on ','
            formData.append('medications',          medications.join(','));

            const { data } = await api.post('/doctor/upload-record', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            // Destructure everything the backend now returns
            const {
                _id:                  recordId,
                ipfsCID,
                ipfsURL,
                fileName,
                fileSize,
                patientWalletAddress: patientAddr,
            } = data.record;

            console.log(`[IPFS] ✅ CID: ${ipfsCID}`);

            // ── PHASE 2: Frontend → MetaMask → Ethereum smart contract ────────
            await storeOnBlockchain({
                recordId,
                ipfsCID,
                ipfsURL,
                patientAddress: patientAddr || scannedAddress,
                recordType,
                notes,
            });

            // ── PHASE 3: Show StorageProof + reset form ───────────────────────
            setStorageProof({ ipfsCID, ipfsURL, fileName, fileSize });
            setUploadStatus('✅ Record stored on IPFS + Ethereum');

            // Reset upload form
            setFile(null);
            setNotes('');
            setMedications([]);
            setRecordType('prescription');
            setSafeToUpload(null);
            if (fileInputRef.current) fileInputRef.current.value = '';

            // Refresh patient records list
            fetchPatientRecords(scannedAddress);

        } catch (err) {
            console.error('[UPLOAD] Error:', err);
            setTxStatus('failed');

            // Drug conflict blocked by backend
            if (err.response?.status === 422) {
                const { conflicts = [] } = err.response.data;
                const names = conflicts.map(c => c.drug || c.name || 'Unknown').join(', ');
                setUploadStatus(`❌ Blocked: HIGH severity drug conflict — ${names}`);
                return;
            }

            // User rejected MetaMask
            if (err.code === 4001 || err.message?.includes('user rejected')) {
                setUploadStatus('❌ MetaMask: Transaction rejected by user.');
                return;
            }

            // Smart contract revert
            if (err.message?.includes('revert')) {
                setUploadStatus(`❌ Contract revert: ${err.reason || err.message}`);
                return;
            }

            setUploadStatus(`❌ Upload failed: ${err.message}`);
        } finally {
            setUploadLoading(false);
        }
    };

    // Derived flags
    const hasCriticalRisk = riskProfile && Object.values(riskProfile).some(r => typeof r === 'string' && ['high', 'critical'].includes(r.toLowerCase()));
    const isNonOBlood = patientData?.bloodGroup && !patientData.bloodGroup.toUpperCase().includes('O');

    return (
        <DashboardLayout role="Doctor" navItems={navItems}>
            {/* SECTION 1: Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between py-6 border-b border-medichain-border mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-display font-bold text-white">Dr. {user?.name || 'Doctor'}</h1>
                    <p className="text-text-secondary">{user?.specialization || 'General Practitioner'} | {user?.hospital || 'MediChain General Hospital'}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-4">
                        {connected ? (
                            <div className="flex items-center gap-2 px-4 py-2 bg-status-success/10 border border-status-success/30 rounded-full">
                                <div className="w-2 h-2 rounded-full bg-status-success animate-pulse" />
                                <span className="text-sm font-mono text-status-success">{formatAddress(account)}</span>
                            </div>
                        ) : (
                            <FuturisticButton onClick={connect} variant="primary">Connect Wallet</FuturisticButton>
                        )}
                        <button 
                            onClick={handleLogout}
                            className="px-4 py-2 rounded-full border border-medichain-border text-text-secondary hover:text-white hover:bg-status-danger/20 hover:border-status-danger/40 transition-all text-sm font-bold"
                        >
                            Logout
                        </button>
                    </div>
                    {walletError && (
                        <p className="text-[10px] text-status-danger font-bold uppercase tracking-tighter mr-2">
                            {walletError}
                        </p>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* LEFT COLUMN */}
                <div className="lg:col-span-1 space-y-8">
                    
                    {/* SECTION 2: QR Scanner Panel */}
                    <GlassCard>
                        <h2 className="text-xl font-bold text-white mb-4">Patient Scanning</h2>
                        {!scannedAddress && !scanning && (
                            <div className="text-center py-10">
                                <FuturisticButton onClick={() => setScanning(true)} fullWidth>Scan Patient QR</FuturisticButton>
                                <p className="text-xs text-text-secondary mt-4">Scan QR to authenticate and retrieve patient records securely.</p>
                            </div>
                        )}
                        {scanning && (
                            <div className="relative rounded-2xl overflow-hidden border-2 border-accent-cyan">
                                <QRScanner 
                                    onScan={handleScanSuccess} 
                                    onError={(err) => console.error(err)} 
                                />
                                <button onClick={() => setScanning(false)} className="absolute top-2 right-2 px-3 py-1 bg-black/50 text-white rounded-full text-xs hover:bg-black/80">Cancel</button>
                            </div>
                        )}
                        {scannedAddress && patientData && (
                            <div className="p-4 bg-medichain-bg-dark rounded-xl border border-medichain-border mt-4">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <p className="text-[10px] text-text-secondary uppercase tracking-widest">Authenticated Patient</p>
                                        <h3 className="text-xl font-bold text-white">{patientData.name}</h3>
                                        <p className="text-xs font-mono text-accent-cyan break-all">{scannedAddress}</p>
                                    </div>
                                    <button onClick={() => { setScannedAddress(''); setPatientData(null); setPatientRecords([]); }} className="text-xs text-text-secondary hover:text-white">Clear</button>
                                </div>
                                <div className="space-y-2 mt-4">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-text-secondary">Blood Group:</span>
                                        <span className={`font-bold px-2 py-0.5 rounded text-xs ${isNonOBlood ? 'bg-status-danger/20 text-status-danger' : 'text-white'}`}>
                                            {patientData.bloodGroup || 'Unknown'}
                                        </span>
                                    </div>
                                    <div className="flex items-start justify-between text-sm">
                                        <span className="text-text-secondary">Allergies:</span>
                                        <div className="flex flex-wrap gap-1 justify-end">
                                            {patientData.allergies?.length > 0 ? patientData.allergies.map((a, i) => (
                                                <span key={i} className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-status-warning/20 text-status-warning border border-status-warning/30">
                                                    {a}
                                                </span>
                                            )) : <span className="text-white">None reported</span>}
                                        </div>
                                    </div>
                                    <div className="flex items-start justify-between text-sm">
                                        <span className="text-text-secondary">Chronic Cond.:</span>
                                        <span className="text-white text-right max-w-[60%] text-xs">
                                            {patientData.chronicConditions?.join(', ') || 'None'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </GlassCard>

                    {/* SECTION 3: Patient Health Snapshot */}
                    {scannedAddress && patientData && (
                        <GlassCard>
                            <h2 className="text-xl font-bold text-white mb-4">AI Risk Analysis</h2>
                            {riskLoading ? (
                                <div className="flex justify-center py-6">
                                    <div className="w-8 h-8 border-4 border-accent-cyan border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : riskProfile ? (
                                <div className="space-y-4">
                                    {hasCriticalRisk && (
                                        <div className="p-3 bg-status-danger border border-status-danger/50 rounded-lg text-white text-center font-bold text-sm tracking-widest uppercase animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]">
                                            ⚠️ Critical Risk Detected
                                        </div>
                                    )}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className={`p-3 rounded-xl border ${getRiskColor(riskProfile.heart)} bg-opacity-10 text-center`}>
                                            <p className="text-[10px] text-white/70 uppercase">Heart Disease</p>
                                            <p className="font-bold text-sm uppercase">{riskProfile.heart}</p>
                                        </div>
                                        <div className={`p-3 rounded-xl border ${getRiskColor(riskProfile.diabetes)} bg-opacity-10 text-center`}>
                                            <p className="text-[10px] text-white/70 uppercase">Diabetes</p>
                                            <p className="font-bold text-sm uppercase">{riskProfile.diabetes}</p>
                                        </div>
                                        <div className={`p-3 rounded-xl border ${getRiskColor(riskProfile.stroke)} bg-opacity-10 text-center col-span-2`}>
                                            <p className="text-[10px] text-white/70 uppercase">Stroke</p>
                                            <p className="font-bold text-sm uppercase">{riskProfile.stroke}</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-text-secondary text-center py-4">Analysis unavailable.</p>
                            )}
                        </GlassCard>
                    )}
                </div>

                {/* RIGHT COLUMN */}
                {scannedAddress && patientData && (
                    <div className="lg:col-span-2 space-y-8">
                        
                        {/* SECTION 5: Upload New Medical Record */}
                        <GlassCard>
                            <h2 className="text-xl font-bold text-white mb-6">Upload Medical Data</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                
                                {/* Left Form Col */}
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs uppercase text-text-secondary tracking-widest mb-2">Record Type</label>
                                        <select 
                                            value={recordType}
                                            onChange={(e) => setRecordType(e.target.value)}
                                            className="w-full bg-medichain-bg-dark border border-medichain-border rounded-lg p-3 text-sm text-white focus:outline-none focus:border-accent-cyan"
                                        >
                                            <option>Prescription</option>
                                            <option>Lab Report</option>
                                            <option>Diagnosis</option>
                                            <option>X-Ray</option>
                                            <option>Other</option>
                                        </select>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-xs uppercase text-text-secondary tracking-widest mb-2">Upload File</label>
                                        <div 
                                            className="border-2 border-dashed border-medichain-border hover:border-accent-cyan transition-colors rounded-xl p-6 text-center cursor-pointer bg-medichain-bg-dark"
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            <input 
                                                type="file" 
                                                className="hidden" 
                                                ref={fileInputRef} 
                                                onChange={(e) => setFile(e.target.files[0])}
                                                accept=".pdf,.png,.jpg,.jpeg"
                                            />
                                            {file ? (
                                                <div className="text-accent-cyan text-sm font-bold break-all">
                                                    📄 {file.name}
                                                </div>
                                            ) : (
                                                <div className="text-text-secondary text-sm">
                                                    <span className="text-accent-cyan font-bold">Click to browse</span> or drag file here<br/>
                                                    <span className="text-[10px] mt-1 block">(PDF, JPG, PNG up to 10MB)</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs uppercase text-text-secondary tracking-widest mb-2">Clinical Notes</label>
                                        <textarea 
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            rows={3}
                                            className="w-full bg-medichain-bg-dark border border-medichain-border rounded-lg p-3 text-sm text-white focus:outline-none focus:border-accent-cyan resize-none"
                                            placeholder="Enter observations, dosage instructions, or diagnosis details..."
                                        />
                                    </div>
                                </div>

                                {/* Right Form Col: Meds & Interactions */}
                                <div className="space-y-4 flex flex-col">
                                    <div>
                                        <label className="block text-xs uppercase text-text-secondary tracking-widest mb-2">Prescribed Medications</label>
                                        <form onSubmit={handleAddMedication} className="flex gap-2 mb-3">
                                            <input 
                                                type="text"
                                                value={medInput}
                                                onChange={(e) => setMedInput(e.target.value)}
                                                placeholder="e.g., Aspirin"
                                                className="flex-grow bg-medichain-bg-dark border border-medichain-border rounded-lg p-2 text-sm text-white focus:outline-none focus:border-accent-cyan"
                                            />
                                            <button type="submit" className="px-4 py-2 bg-medichain-surface border border-medichain-border rounded-lg text-white font-bold hover:bg-medichain-border transition-colors">+</button>
                                        </form>
                                        <div className="flex flex-wrap gap-2 min-h-[40px] p-2 bg-medichain-bg-dark/50 border border-medichain-border rounded-lg">
                                            {medications.length === 0 ? (
                                                <span className="text-xs text-text-secondary my-auto ml-2">No medications added.</span>
                                            ) : (
                                                medications.map((m, i) => (
                                                    <span key={i} className="flex items-center gap-2 px-2 py-1 bg-accent-indigo/20 border border-accent-indigo/30 rounded-md text-xs text-white">
                                                        {m}
                                                        <button onClick={() => removeMedication(m)} className="text-text-secondary hover:text-white">×</button>
                                                    </span>
                                                ))
                                            )}
                                        </div>
                                    </div>

                                    {/* Interaction Check Area */}
                                    <div className="mt-auto space-y-4">
                                        <FuturisticButton 
                                            onClick={handleCheckDrugs} 
                                            disabled={medications.length === 0 || drugCheckLoading}
                                            variant="secondary"
                                            fullWidth
                                        >
                                            {drugCheckLoading ? 'Analyzing Interactions...' : 'Check Drug Interactions'}
                                        </FuturisticButton>

                                        {safeToUpload === false && (
                                            <div className="space-y-3">
                                                <AIAlert interactions={interactions} onDismiss={() => setSafeToUpload(null)} />
                                                <div className="p-2 bg-status-danger/20 border border-status-danger/40 rounded-lg text-center text-status-danger text-xs font-bold uppercase">
                                                    Cannot Upload — Drug Conflict Detected
                                                </div>
                                            </div>
                                        )}

                                        {safeToUpload === true && (
                                            <div className="p-3 bg-status-success/10 border border-status-success/30 rounded-lg text-center text-status-success text-sm font-bold flex items-center justify-center gap-2">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                                                No Conflicts Detected
                                            </div>
                                        )}

                                        <div className="pt-4 border-t border-medichain-border">
                                            <FuturisticButton 
                                                onClick={handleUploadRecord}
                                                disabled={uploading || safeToUpload === false || !file}
                                                fullWidth
                                            >
                                                {uploading ? 'Processing…' : 'Upload & Sign Record'}
                                            </FuturisticButton>
                                            
                                            {/* ── Upload status bar ── */}
                                            {uploadStatus && (
                                                <div className={`mt-3 px-3 py-2 rounded-lg text-[11px] font-mono text-center ${
                                                    uploadStatus.startsWith('✅')
                                                        ? 'bg-status-success/10 text-status-success border border-status-success/30'
                                                        : uploadStatus.startsWith('❌')
                                                        ? 'bg-status-danger/10 text-status-danger border border-status-danger/30'
                                                        : 'bg-accent-cyan/5 text-accent-cyan border border-accent-cyan/20 animate-pulse'
                                                }`}>
                                                    {uploadStatus}
                                                </div>
                                            )}

                                            {/* ── StorageProof — shown after successful upload ── */}
                                            {storageProof && txStatus === 'confirmed' && (
                                                <div className="mt-4">
                                                    <StorageProof
                                                        ipfsCID={storageProof.ipfsCID}
                                                        ipfsURL={storageProof.ipfsURL}
                                                        fileName={storageProof.fileName}
                                                        fileSize={storageProof.fileSize}
                                                        txHash={txHash}
                                                        blockNumber={blockNumber}
                                                        txStatus={txStatus}
                                                        networkName="localhost"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </GlassCard>


                        {/* SECTION 4: Patient's Medical Records */}
                        <GlassCard>
                            <h2 className="text-xl font-bold text-white mb-6">Patient Medical History</h2>
                            {recordsLoading ? (
                                <div className="text-center py-10">
                                    <div className="w-8 h-8 border-4 border-accent-cyan border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                                    <p className="text-sm text-text-secondary">Syncing with blockchain...</p>
                                </div>
                            ) : patientRecords.length > 0 ? (
                                <div className="space-y-4">
                                    {patientRecords.map((record) => (
                                        <div key={record._id} className="relative">
                                            <RecordCard 
                                                record={record} 
                                                onViewFile={() => window.open(record.ipfsURL, '_blank')}
                                            />
                                            {record.verified && (
                                                <div className="absolute top-4 right-4 flex items-center gap-1 bg-status-success/10 border border-status-success/30 text-status-success text-[10px] font-bold uppercase px-2 py-1 rounded-full">
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                                                    On-Chain
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-10 bg-medichain-bg-dark rounded-xl border border-medichain-border border-dashed">
                                    <p className="text-text-secondary text-sm">No medical records found on-chain.</p>
                                </div>
                            )}
                        </GlassCard>

                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default DoctorDashboard;
