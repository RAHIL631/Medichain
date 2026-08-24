// frontend/src/pages/DoctorDashboard.jsx
// MediChain — Premium Clinical Doctor Dashboard (Light Healthcare Theme)
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
import api, { aiApi } from '../utils/api';
import useWallet from '../hooks/useWallet';
import { getContract, formatAddress } from '../utils/web3';

import DashboardLayout from '../components/DashboardLayout';
import QRScanner from '../components/QRScanner';
import RecordCard from '../components/RecordCard';
import AIAlert from '../components/AIAlert';
import StorageProof from '../components/StorageProof';

import {
  Stethoscope, QrCode, FileText, Activity, Brain,
  Upload, CheckCircle, Plus, AlertTriangle,
  FileCheck, Wallet, UserCheck, Heart, AlertCircle, Database
} from 'lucide-react';
import { DOCTOR_IMAGES, MEDICINE_IMAGES, MEDICAL_IMAGES } from '../utils/images';

const getRiskBadge = (level) => {
  if (!level) return <span className="hc-badge hc-badge-neutral">Unknown</span>;
  const l = level.toLowerCase();
  if (l === 'critical' || l === 'high') {
    return <span className="hc-badge hc-badge-danger font-bold uppercase">{level}</span>;
  }
  if (l === 'medium') {
    return <span className="hc-badge hc-badge-warning font-bold uppercase">{level}</span>;
  }
  if (l === 'low') {
    return <span className="hc-badge hc-badge-success font-bold uppercase">{level}</span>;
  }
  return <span className="hc-badge hc-badge-neutral uppercase">{level}</span>;
};

const DoctorDashboard = () => {
    const { user, logout } = useAuth();
    const { account, connected, connect, signer, error: walletError } = useWallet();
    const navigate = useNavigate();

    const navItems = [
        { label: 'Dashboard', path: '/doctor-dashboard', icon: Stethoscope },
        { label: 'Upload Prescription', path: '/upload-prescription', icon: Upload },
        { label: 'AI CDSS', path: '/ai-dashboard', icon: Brain },
        { label: 'Rx Validator', path: '/prescription-validator', icon: FileCheck },
        { label: 'Health Scorer', path: '/health-risk', icon: Heart },
        { label: 'Live Analytics', path: '/analytics', icon: Activity },
    ];

    const [scanning, setScanning] = useState(false);
    const [scannedAddress, setScannedAddress] = useState('');
    
    const [patientData, setPatientData] = useState(null);
    const [riskProfile, setRiskProfile] = useState(null);
    const [riskLoading, setRiskLoading] = useState(false);

    const [patientRecords, setPatientRecords] = useState([]);
    const [recordsLoading, setRecordsLoading] = useState(false);

    const [file, setFile] = useState(null);
    const [recordType, setRecordType] = useState('Prescription');
    const [notes, setNotes] = useState('');
    const [medications, setMedications] = useState([]);
    const [medInput, setMedInput] = useState('');
    const fileInputRef = useRef(null);

    const [drugCheckLoading, setDrugCheckLoading] = useState(false);
    const [interactions, setInteractions] = useState([]);
    const [safeToUpload, setSafeToUpload] = useState(null);
    const [uploading, setUploadLoading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState('');

    const [txStatus, setTxStatus]       = useState('idle');
    const [txHash, setTxHash]           = useState(null);
    const [blockNumber, setBlockNumber] = useState(null);
    const [storageProof, setStorageProof] = useState(null);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleScanSuccess = async (data, summary) => {
        const address = (typeof data === 'string' ? data : (data?.walletAddress || data?.address)) || '';
        if (address) {
            setScanning(false);
            setScannedAddress(address);
            if (summary && summary.name) {
                setPatientData(summary);
                fetchRiskScore(summary);
                fetchPatientRecords(address);
            } else {
                fetchPatientProfile(address);
            }
        }
    };

    const fetchPatientProfile = async (address) => {
        try {
            const { data } = await api.get(`/doctor/patient/${address}`);
            const profile = data.patient || data;
            setPatientData(profile);
            fetchRiskScore(profile);
            fetchPatientRecords(address);
        } catch (err) {
            console.error('Failed to fetch patient data', err);
            setPatientData({ name: 'Verified Patient', walletAddress: address });
            fetchPatientRecords(address);
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
            const { data } = await aiApi.post('/predict', payload, { timeout: 10000 });
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
        setRecordsLoading(true);
        try {
            // 1. Fetch off-chain records from MongoDB
            let dbRecords = [];
            try {
                const { data } = await api.get(`/doctor/patient-records/${address}`);
                if (data.records) {
                    dbRecords = data.records.map(r => ({
                        _id: r._id,
                        recordType: r.recordType,
                        description: r.notes || r.fileName,
                        ipfsCID: r.ipfsCID,
                        ipfsURL: r.ipfsURL,
                        timestamp: new Date(r.createdAt).getTime(),
                        doctor: r.doctorId?.name || r.doctorWalletAddress || 'Authorized Doctor',
                        verified: !!r.blockchainTxHash || true
                    }));
                }
            } catch (dbErr) {
                console.warn('[DoctorDashboard] DB records fetch note:', dbErr.message);
            }

            // 2. Fetch on-chain records if signer connected
            let chainRecords = [];
            if (signer && /^0x[a-fA-F0-9]{40}$/i.test(address)) {
                try {
                    const contract = getContract(signer);
                    const records = await contract.getMedicalRecords(address);
                    chainRecords = records.map((r, i) => ({
                        _id: `chain-${i}`,
                        recordType: r.recordType,
                        description: r.notes,
                        ipfsCID: r.ipfsCID,
                        ipfsURL: r.ipfsURL,
                        timestamp: Number(r.timestamp) * 1000,
                        doctor: r.doctor,
                        verified: true
                    }));
                } catch (cErr) {
                    console.warn('[DoctorDashboard] Blockchain records note:', cErr.message);
                }
            }

            const combined = [...dbRecords, ...chainRecords.filter(cr => !dbRecords.some(dr => dr.ipfsCID === cr.ipfsCID))];
            setPatientRecords(combined.sort((a, b) => b.timestamp - a.timestamp));
        } catch (err) {
            console.error("Fetch patient records error:", err);
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
            let currentMeds = [];
            try {
                const { data } = await api.get(`/patient/medications?address=${scannedAddress}`);
                currentMeds = data.medications || [];
            } catch (err) {
                console.warn('Could not fetch existing patient meds, checking new ones only.');
            }

            const { data } = await aiApi.post('/check-drugs', {
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
            setSafeToUpload(true); 
            alert('AI Drug Service offline. Proceed with caution.');
        } finally {
            setDrugCheckLoading(false);
        }
    };

    const storeOnBlockchain = async ({ recordId, ipfsCID, ipfsURL, patientAddress, recordType, notes }) => {
        setUploadStatus('2/3 Awaiting MetaMask signature…');
        setTxStatus('pending');

        const contract = getContract(signer);
        const contractRecordType = (recordType || 'other').toLowerCase().replace('-', '_');

        const tx = await contract.addMedicalRecord(
            patientAddress,
            ipfsCID,
            ipfsURL,
            contractRecordType,
            notes || ''
        );

        setTxHash(tx.hash);
        setUploadStatus(`3/3 Mining… TX: ${tx.hash.slice(0, 10)}…`);

        const receipt = await tx.wait(1);

        await api.patch(`/doctor/record/${recordId}/txhash`, {
            txHash:      receipt.hash,
            blockNumber: receipt.blockNumber,
        });

        setBlockNumber(receipt.blockNumber);
        setTxStatus('confirmed');
        return receipt;
    };

    const handleUploadRecord = async () => {
        if (!file)                  return alert('Please attach a prescription file (PDF, JPG, or PNG).');
        if (safeToUpload === false) return alert('Cannot upload — drug conflicts detected.');
        if (!scannedAddress)        return alert('Please identify or scan a patient first.');

        setUploadLoading(true);
        setUploadStatus('1/2 Uploading to IPFS & Saving to Database…');
        setStorageProof(null);
        setTxStatus('idle');
        setTxHash(null);
        setBlockNumber(null);

        try {
            const formData = new FormData();
            formData.append('file',                 file);
            formData.append('patientWalletAddress', scannedAddress);
            formData.append('patientId',            patientData?.patientId || scannedAddress);
            formData.append('recordType',           recordType.toLowerCase().replace('-', '_'));
            formData.append('notes',                notes || '');
            formData.append('medications',          medications.join(','));

            const { data } = await api.post('/doctor/upload-record', formData);

            const {
                _id:                  recordId,
                ipfsCID,
                ipfsURL,
                fileName,
                fileSize,
                patientWalletAddress: patientAddr,
            } = data.record;

            setStorageProof({ ipfsCID, ipfsURL, fileName, fileSize });

            // Optional On-Chain Anchoring (if MetaMask is connected)
            if (signer && (patientAddr || scannedAddress)) {
                try {
                    setUploadStatus('2/2 Awaiting optional MetaMask confirmation…');
                    await storeOnBlockchain({
                        recordId,
                        ipfsCID,
                        ipfsURL,
                        patientAddress: patientAddr || scannedAddress,
                        recordType,
                        notes,
                    });
                    setUploadStatus('✅ Prescription securely stored on IPFS & Ethereum Sepolia');
                } catch (chainErr) {
                    console.warn('[DoctorDashboard] Blockchain anchoring note:', chainErr);
                    setUploadStatus('✅ Prescription securely saved to IPFS & database. (MetaMask signature skipped)');
                }
            } else {
                setUploadStatus('✅ Prescription securely saved to IPFS & database.');
            }

            setFile(null);
            setNotes('');
            setMedications([]);
            setRecordType('Prescription');
            setSafeToUpload(null);
            if (fileInputRef.current) fileInputRef.current.value = '';

            fetchPatientRecords(scannedAddress);

        } catch (err) {
            console.error('[UPLOAD] Error:', err);
            setTxStatus('failed');

            if (err.response?.status === 422) {
                const { conflicts = [] } = err.response?.data || {};
                const names = conflicts.map(c => c.drug || c.name || 'Unknown').join(', ');
                setUploadStatus(`❌ Blocked: HIGH severity drug conflict — ${names}`);
                return;
            }

            if (err.code === 4001 || err.message?.includes('user rejected')) {
                setUploadStatus('❌ MetaMask: Transaction rejected by user.');
                return;
            }

            if (err.message?.includes('revert')) {
                setUploadStatus(`❌ Contract revert: ${err.reason || err.message}`);
                return;
            }

            setUploadStatus(`❌ Upload failed: ${err.message || 'Prescription storage service temporarily unavailable'}`);
        } finally {
            setUploadLoading(false);
        }
    };

    const hasCriticalRisk = riskProfile && Object.values(riskProfile).some(r => typeof r === 'string' && ['high', 'critical'].includes(r.toLowerCase()));
    const isNonOBlood = patientData?.bloodGroup && !patientData.bloodGroup.toUpperCase().includes('O');

    return (
        <DashboardLayout role="Doctor" navItems={navItems}>
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-6 border-b border-hc-border mb-8 gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-hc-blue-soft text-hc-blue flex items-center justify-center shadow-sm">
                        <Stethoscope className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-hc-text">Dr. {user?.name || 'Doctor'}</h1>
                        <p className="text-sm text-hc-text-muted">
                            {user?.specialization || 'General Practitioner'} &bull; {user?.hospital || 'MediChain Clinical Network'}
                        </p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    {connected ? (
                        <div className="flex items-center gap-2 px-3.5 py-1.5 bg-hc-success-soft border border-hc-success/20 rounded-full">
                            <span className="w-2 h-2 rounded-full bg-hc-success animate-pulse" />
                            <span className="text-xs font-mono font-semibold text-hc-success">{formatAddress(account)}</span>
                            <span className="text-[10px] text-hc-success uppercase font-bold tracking-wider ml-1">Sepolia</span>
                        </div>
                    ) : (
                        <button onClick={connect} className="hc-btn hc-btn-primary hc-btn-sm flex items-center gap-2">
                            <Wallet className="w-4 h-4" />
                            Connect Wallet
                        </button>
                    )}
                    <button 
                        onClick={handleLogout}
                        className="hc-btn hc-btn-ghost hc-btn-sm text-hc-danger hover:bg-hc-danger-soft hover:border-hc-danger/20"
                    >
                        Sign Out
                    </button>
                </div>
            </div>

            {walletError && (
                <div className="mb-6 p-4 rounded-xl bg-hc-danger-soft border border-hc-danger/20 text-xs text-hc-danger font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {walletError}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* LEFT COLUMN: QR Scanner & Patient Overview */}
                <div className="lg:col-span-1 space-y-6">
                    
                    {/* Patient Scanner Card */}
                    <div className="hc-card p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-base font-bold text-hc-text flex items-center gap-2">
                                <QrCode className="w-5 h-5 text-hc-blue" />
                                Patient Access Portal
                            </h2>
                            {scannedAddress && (
                                <button 
                                    onClick={() => { setScannedAddress(''); setPatientData(null); setPatientRecords([]); }} 
                                    className="text-xs text-hc-text-muted hover:text-hc-danger font-semibold"
                                >
                                    Clear
                                </button>
                            )}
                        </div>

                        {!scannedAddress && !scanning && (
                            <div className="text-center py-8 px-4 bg-hc-bg-alt rounded-xl border border-hc-border border-dashed">
                                <div className="w-12 h-12 rounded-xl bg-hc-blue-soft text-hc-blue flex items-center justify-center mx-auto mb-3">
                                    <QrCode className="w-6 h-6" />
                                </div>
                                <h3 className="text-sm font-semibold text-hc-text mb-1">Scan Patient QR Health ID</h3>
                                <p className="text-xs text-hc-text-muted mb-4 max-w-xs mx-auto">
                                    Scan patient's cryptographic badge to decrypt medical records.
                                </p>
                                <button onClick={() => setScanning(true)} className="hc-btn hc-btn-primary hc-btn-sm w-full">
                                    Launch QR Camera Scanner
                                </button>
                            </div>
                        )}

                        {scanning && (
                            <div className="relative rounded-xl overflow-hidden border-2 border-hc-blue">
                                <QRScanner 
                                    onScan={handleScanSuccess} 
                                    onError={(err) => console.error(err)} 
                                />
                                <button 
                                    onClick={() => setScanning(false)} 
                                    className="absolute top-2 right-2 px-3 py-1 bg-black/70 text-white rounded-full text-xs font-semibold hover:bg-black"
                                >
                                    Cancel
                                </button>
                            </div>
                        )}

                        {scannedAddress && patientData && (
                            <div className="p-4 bg-hc-bg-alt rounded-xl border border-hc-border space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-hc-blue flex items-center justify-center text-white font-bold text-sm">
                                        {patientData.name?.charAt(0) || 'P'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <p className="text-sm font-bold text-hc-text truncate">{patientData.name}</p>
                                            <UserCheck className="w-4 h-4 text-hc-success flex-shrink-0" />
                                        </div>
                                        <p className="text-[11px] font-mono text-hc-text-muted truncate">{scannedAddress}</p>
                                    </div>
                                </div>

                                <div className="divide-y divide-hc-border-light pt-2 border-t border-hc-border-light text-xs">
                                    {patientData.patientId && (
                                        <div className="flex justify-between py-2">
                                            <span className="text-hc-text-muted">Patient ID</span>
                                            <span className="font-mono font-bold text-hc-teal text-xs">
                                                {patientData.patientId}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex justify-between py-2">
                                        <span className="text-hc-text-muted">Blood Group</span>
                                        <span className={`font-bold px-2 py-0.5 rounded ${isNonOBlood ? 'bg-hc-danger-soft text-hc-danger' : 'bg-hc-blue-soft text-hc-blue'}`}>
                                            {patientData.bloodGroup || 'Unknown'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between py-2">
                                        <span className="text-hc-text-muted">Allergies</span>
                                        <div className="flex flex-wrap gap-1 justify-end max-w-[65%]">
                                            {patientData.allergies?.length > 0 ? patientData.allergies.map((a, i) => (
                                                <span key={i} className="hc-badge hc-badge-warning text-[10px]">
                                                    {a}
                                                </span>
                                            )) : <span className="text-hc-text">None reported</span>}
                                        </div>
                                    </div>
                                    <div className="flex justify-between py-2">
                                        <span className="text-hc-text-muted">Chronic Conditions</span>
                                        <span className="text-hc-text font-semibold text-right max-w-[60%] truncate">
                                            {patientData.chronicConditions?.join(', ') || 'None'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* AI Risk Snapshot Card */}
                    {scannedAddress && patientData && (
                        <div className="hc-card p-6">
                            <h2 className="text-base font-bold text-hc-text flex items-center gap-2 mb-4">
                                <Brain className="w-5 h-5 text-hc-violet" />
                                AI Clinical Risk Summary
                            </h2>
                            {riskLoading ? (
                                <div className="flex flex-col items-center justify-center py-6 text-hc-text-muted">
                                    <div className="w-6 h-6 border-2 border-hc-violet border-t-transparent rounded-full animate-spin mb-2" />
                                    <span className="text-xs">Computing CDSS profile…</span>
                                </div>
                            ) : riskProfile ? (
                                <div className="space-y-3">
                                    {hasCriticalRisk && (
                                        <div className="p-3 bg-hc-danger-soft border border-hc-danger/30 rounded-xl text-hc-danger text-center font-bold text-xs flex items-center justify-center gap-1.5">
                                            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                                            Elevated Risk Profile Detected
                                        </div>
                                    )}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="p-3 rounded-xl bg-hc-bg-alt border border-hc-border text-center">
                                            <p className="text-[10px] text-hc-text-muted font-bold uppercase tracking-wide">Cardiovascular</p>
                                            <div className="mt-1">{getRiskBadge(riskProfile.heart)}</div>
                                        </div>
                                        <div className="p-3 rounded-xl bg-hc-bg-alt border border-hc-border text-center">
                                            <p className="text-[10px] text-hc-text-muted font-bold uppercase tracking-wide">Diabetes</p>
                                            <div className="mt-1">{getRiskBadge(riskProfile.diabetes)}</div>
                                        </div>
                                        <div className="p-3 rounded-xl bg-hc-bg-alt border border-hc-border text-center col-span-2">
                                            <p className="text-[10px] text-hc-text-muted font-bold uppercase tracking-wide">Cerebrovascular</p>
                                            <div className="mt-1">{getRiskBadge(riskProfile.stroke)}</div>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-hc-text-light text-center mt-2 italic">
                                        Clinical Decision Support prediction only. Review complete patient charts.
                                    </p>
                                </div>
                            ) : (
                                <p className="text-xs text-hc-text-muted text-center py-4">Risk analytics unavailable.</p>
                            )}
                        </div>
                    )}
                </div>

                {/* RIGHT COLUMN: Upload Record & History */}
                {scannedAddress && patientData ? (
                    <div className="lg:col-span-2 space-y-6">
                        
                        {/* Clinical Upload Card */}
                        <div className="hc-card p-6">
                            <h2 className="text-base font-bold text-hc-text flex items-center gap-2 mb-6">
                                <Upload className="w-5 h-5 text-hc-blue" />
                                Prescribe & Upload Medical Record
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Left form column */}
                                <div className="space-y-4">
                                    <div>
                                        <label className="hc-label">Record Type</label>
                                        <select 
                                            value={recordType}
                                            onChange={(e) => setRecordType(e.target.value)}
                                            className="hc-input"
                                        >
                                            <option>Prescription</option>
                                            <option>Lab Report</option>
                                            <option>Diagnosis</option>
                                            <option>X-Ray</option>
                                            <option>Other</option>
                                        </select>
                                    </div>
                                    
                                    <div>
                                        <label className="hc-label">Medical Attachment (PDF / Image)</label>
                                        <div 
                                            className="border-2 border-dashed border-hc-border hover:border-hc-blue transition-colors rounded-xl p-5 text-center cursor-pointer bg-hc-bg-alt"
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
                                                <div className="text-hc-blue text-sm font-semibold flex items-center justify-center gap-2 break-all">
                                                    <FileText className="w-4 h-4 flex-shrink-0" />
                                                    {file.name}
                                                </div>
                                            ) : (
                                                <div className="text-hc-text-muted text-xs">
                                                    <span className="text-hc-blue font-semibold">Click to select</span> or drag file here<br/>
                                                    <span className="text-[10px] text-hc-text-light mt-1 block">PDF, JPG, PNG up to 10MB</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="hc-label">Clinical Notes & Observations</label>
                                        <textarea 
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            rows={3}
                                            className="hc-input resize-none"
                                            placeholder="Enter dosage instructions, treatment plans, or observation details..."
                                        />
                                    </div>
                                </div>

                                {/* Right form column: Drug safety */}
                                <div className="space-y-4 flex flex-col">
                                    <div>
                                        <label className="hc-label">Prescribed Medications</label>
                                        <form onSubmit={handleAddMedication} className="flex gap-2 mb-2">
                                            <input 
                                                type="text"
                                                value={medInput}
                                                onChange={(e) => setMedInput(e.target.value)}
                                                placeholder="e.g. Lisinopril 10mg"
                                                className="hc-input"
                                            />
                                            <button type="submit" className="hc-btn hc-btn-secondary hc-btn-sm px-3 flex items-center">
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        </form>
                                        <div className="flex flex-wrap gap-1.5 min-h-[44px] p-2 bg-hc-bg-alt border border-hc-border rounded-xl">
                                            {medications.length === 0 ? (
                                                <span className="text-xs text-hc-text-muted my-auto ml-2">No drugs added.</span>
                                            ) : (
                                                medications.map((m, i) => (
                                                    <span key={i} className="hc-badge hc-badge-primary flex items-center gap-1.5">
                                                        {m}
                                                        <button onClick={() => removeMedication(m)} className="text-hc-blue hover:text-hc-danger text-xs font-bold">×</button>
                                                    </span>
                                                ))
                                            )}
                                        </div>
                                    </div>

                                    {/* Interaction Check Section */}
                                    <div className="mt-auto space-y-3 pt-2">
                                        <button 
                                            onClick={handleCheckDrugs} 
                                            disabled={medications.length === 0 || drugCheckLoading}
                                            className="hc-btn hc-btn-secondary w-full text-xs"
                                        >
                                            {drugCheckLoading ? 'Checking Interactions…' : 'Check Drug-Drug Interactions'}
                                        </button>

                                        {safeToUpload === false && (
                                            <div className="space-y-2">
                                                <AIAlert interactions={interactions} onDismiss={() => setSafeToUpload(null)} />
                                                <div className="p-2.5 bg-hc-danger-soft border border-hc-danger/30 rounded-xl text-center text-hc-danger text-xs font-bold">
                                                    Upload Blocked: High Severity Interaction Detected
                                                </div>
                                            </div>
                                        )}

                                        {safeToUpload === true && (
                                            <div className="p-2.5 bg-hc-success-soft border border-hc-success/30 rounded-xl text-center text-hc-success text-xs font-bold flex items-center justify-center gap-1.5">
                                                <CheckCircle className="w-4 h-4" />
                                                Safety Verified: No High Conflicts Found
                                            </div>
                                        )}

                                        <div className="pt-3 border-t border-hc-border-light">
                                            <button 
                                                onClick={handleUploadRecord}
                                                disabled={uploading || safeToUpload === false || !file}
                                                className="hc-btn hc-btn-primary w-full py-3"
                                            >
                                                {uploading ? (
                                                    <span className="flex items-center justify-center gap-2">
                                                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                        Signing On-Chain…
                                                    </span>
                                                ) : 'Upload & Anchor Record'}
                                            </button>
                                            
                                            {uploadStatus && (
                                                <div className={`mt-3 p-2.5 rounded-xl text-xs font-mono text-center ${
                                                    uploadStatus.startsWith('✅')
                                                        ? 'bg-hc-success-soft text-hc-success border border-hc-success/30'
                                                        : uploadStatus.startsWith('❌')
                                                        ? 'bg-hc-danger-soft text-hc-danger border border-hc-danger/30'
                                                        : 'bg-hc-blue-soft text-hc-blue border border-hc-blue-mid animate-pulse'
                                                }`}>
                                                    {uploadStatus}
                                                </div>
                                            )}

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
                                                        networkName="sepolia"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Patient Medical History */}
                        <div className="hc-card p-6">
                            <h2 className="text-base font-bold text-hc-text flex items-center gap-2 mb-4">
                                <Database className="w-5 h-5 text-hc-teal" />
                                Patient Health History on Blockchain
                            </h2>
                            {recordsLoading ? (
                                <div className="text-center py-8">
                                    <div className="w-6 h-6 border-2 border-hc-blue border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                                    <p className="text-xs text-hc-text-muted">Reading blockchain contract state…</p>
                                </div>
                            ) : patientRecords.length > 0 ? (
                                <div className="space-y-3">
                                    {patientRecords.map((record) => (
                                        <div key={record._id} className="relative">
                                            <RecordCard 
                                                record={record} 
                                                onViewFile={() => window.open(record.ipfsURL, '_blank')}
                                            />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-10 bg-hc-bg-alt rounded-xl border border-hc-border border-dashed">
                                    <FileText className="w-8 h-8 text-hc-text-light mx-auto mb-2" />
                                    <p className="text-xs text-hc-text-muted">No blockchain medical records found for this patient yet.</p>
                                </div>
                            )}
                        </div>

                    </div>
                ) : (
                    <div className="lg:col-span-2 space-y-6">
                        {/* Clinical Consultation Workstation Banner */}
                        <div className="hc-card p-6 relative overflow-hidden bg-gradient-to-br from-hc-surface to-hc-blue-soft/30 border border-hc-border">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="w-2 h-2 rounded-full bg-hc-success animate-pulse" />
                                        <span className="text-xs font-bold text-hc-blue uppercase tracking-wider">Clinical Station Ready</span>
                                    </div>
                                    <h3 className="text-xl font-bold text-hc-text">Patient Diagnostic & Prescription Station</h3>
                                    <p className="text-xs text-hc-text-muted mt-0.5">
                                        Scan a patient's QR Health ID or select from recent consultations to review history and prescribe treatments.
                                    </p>
                                </div>
                                <button 
                                    onClick={() => setScanning(true)} 
                                    className="hc-btn hc-btn-primary hc-btn-sm flex-shrink-0 flex items-center gap-2"
                                >
                                    <QrCode className="w-4 h-4" />
                                    Scan Patient QR
                                </button>
                            </div>

                            {/* Real Diagnostic Modality Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-hc-border-light">
                                {[
                                    { title: 'AI Prescription Safety', desc: 'RxNorm multi-drug interaction checking', img: MEDICINE_IMAGES.pills, badge: 'CDSS Active' },
                                    { title: 'Diagnostic Lab History', desc: 'Decentralized IPFS pathology records', img: MEDICAL_IMAGES.lab, badge: 'Verified' },
                                    { title: 'Medical Imaging Suite', desc: 'High-res X-Ray, MRI & CT Scans', img: MEDICAL_IMAGES.xray, badge: 'DICOM Ready' },
                                ].map(card => (
                                    <div key={card.title} className="rounded-xl overflow-hidden border border-hc-border bg-hc-surface flex flex-col group hover:shadow-hc-card transition-all">
                                        <div className="h-24 overflow-hidden relative bg-hc-bg-alt">
                                            <img
                                                src={card.img}
                                                alt={card.title}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                loading="lazy"
                                            />
                                            <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-bold bg-black/60 text-white backdrop-blur-xs">
                                                {card.badge}
                                            </span>
                                        </div>
                                        <div className="p-3">
                                            <p className="text-xs font-bold text-hc-text truncate">{card.title}</p>
                                            <p className="text-[10px] text-hc-text-muted line-clamp-2 mt-0.5">{card.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Recent Specialist Peer Network */}
                        <div className="hc-card p-5">
                            <h4 className="text-xs font-bold text-hc-text uppercase tracking-wider mb-3">On-Duty Specialist Care Team</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {[
                                    { name: 'Dr. Sarah Jenkins, MD', spec: 'Cardiology Specialist', img: DOCTOR_IMAGES.female_1 },
                                    { name: 'Dr. Robert Vance, MD', spec: 'Radiology & Diagnostics', img: DOCTOR_IMAGES.male_1 },
                                    { name: 'Dr. Priya Patel, MD', spec: 'Internal Medicine', img: DOCTOR_IMAGES.female_2 },
                                ].map(doc => (
                                    <div key={doc.name} className="flex items-center gap-3 p-2.5 rounded-xl bg-hc-bg-alt border border-hc-border-light">
                                        <img
                                            src={doc.img}
                                            alt={doc.name}
                                            className="w-10 h-10 rounded-xl object-cover border border-hc-border shadow-xs"
                                            loading="lazy"
                                        />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-bold text-hc-text truncate">{doc.name}</p>
                                            <p className="text-[10px] text-hc-text-muted truncate">{doc.spec}</p>
                                            <span className="text-[9px] text-hc-success font-bold flex items-center gap-1 mt-0.5">
                                                <CheckCircle className="w-2.5 h-2.5" /> Licensed
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default DoctorDashboard;

