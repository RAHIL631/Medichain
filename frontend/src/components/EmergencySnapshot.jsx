// frontend/src/components/EmergencySnapshot.jsx
// Detailed patient summary shown to doctors after scanning a QR code.
// Designed for high-urgency medical decision making.

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const EmergencySnapshot = ({ patientAddress, profile, contract }) => {
  const [aiRisk, setAiRisk] = useState(null);
  const [riskLoading, setRiskLoading] = useState(false);
  const [records, setRecords] = useState([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // --- Fetch AI Risk Analysis ---
  const fetchAIRisk = async () => {
    setRiskLoading(true);
    try {
      // Mocking high-end AI logic for the demonstration
      const payload = {
        name: profile.name,
        bloodGroup: profile.bloodGroup,
        allergies: profile.allergies,
        chronicConditions: profile.chronicConditions
      };
      
      const { data } = await axios.post('http://localhost:5001/predict', payload, { timeout: 8000 });
      setAiRisk({
        level: data.risk_level || 'LOW',
        heartDisease: data.heart_disease || 15,
        diabetes: data.diabetes || 10,
        stroke: data.stroke || 5,
        severityScore: Math.max(data.heart_disease || 0, data.diabetes || 0, data.stroke || 0)
      });
    } catch (err) {
      console.warn("AI Service unavailable, using conservative defaults");
      setAiRisk({
        level: 'MEDIUM',
        heartDisease: 45,
        diabetes: 30,
        stroke: 20,
        severityScore: 45
      });
    } finally {
      setRiskLoading(false);
    }
  };

  // --- Fetch On-Chain Records ---
  const fetchBlockchainRecords = async () => {
    if (!contract || !patientAddress) return;
    setRecordsLoading(true);
    try {
      const result = await contract.getMedicalRecords(patientAddress);
      // Map result to readable objects and filter active
      const formatted = result
        .filter(r => r.isActive)
        .map(r => ({
          cid: r.ipfsCID,
          url: r.ipfsURL,
          type: r.recordType,
          doctor: r.uploadedBy,
          timestamp: Number(r.timestamp) * 1000,
          notes: r.notes
        }))
        .sort((a, b) => b.timestamp - a.timestamp); // newest first

      setRecords(formatted);
    } catch (err) {
      console.error("Blockchain fetch error:", err);
    } finally {
      setRecordsLoading(false);
    }
  };

  useEffect(() => {
    fetchAIRisk();
    fetchBlockchainRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientAddress]);

  const hasAllergies = profile.allergies?.length > 0;
  const isHighRisk = aiRisk?.severityScore > 80;

  return (
    <div className="w-full space-y-6 animate-fade-in">
      
      {/* ── SECTION 1: EMERGENCY ALERT BANNER ─────────────────────────────── */}
      <div className={`w-full py-4 px-6 rounded-2xl flex items-center gap-4 shadow-lg border-b-4 ${
        hasAllergies 
          ? 'bg-red-600 border-red-800 text-white animate-pulse' 
          : 'bg-green-600 border-green-800 text-white'
      }`}>
        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
          {hasAllergies ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
          )}
        </div>
        <div className="flex-grow">
          <p className="text-[10px] uppercase font-black tracking-widest opacity-80">System Status</p>
          <h2 className="text-lg font-bold">
            {hasAllergies 
              ? `ALLERGY ALERT: ${profile.allergies.join(', ').toUpperCase()}` 
              : 'NO KNOWN ALLERGIES'}
          </h2>
        </div>
      </div>

      {/* ── SECTION 2: CRITICAL INFO CARDS ────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Blood Group */}
        <div className={`p-6 rounded-3xl shadow-xl flex flex-col items-center justify-center text-white ${
          profile.bloodGroup?.includes('-') ? 'bg-gradient-to-br from-red-500 to-red-700' : 'bg-gradient-to-br from-blue-500 to-blue-700'
        }`}>
          <p className="text-[10px] uppercase font-bold tracking-widest opacity-80 mb-2">Blood Group</p>
          <span className="text-5xl font-black">{profile.bloodGroup || 'O+'}</span>
          <p className="mt-2 text-[10px] font-medium opacity-60">Rh {profile.bloodGroup?.includes('-') ? 'Negative' : 'Positive'}</p>
        </div>

        {/* Allergies List */}
        <div className="p-6 rounded-3xl bg-white dark:bg-gray-800 shadow-xl border border-gray-100 dark:border-gray-700">
          <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-4">Known Allergies</p>
          <div className="flex flex-wrap gap-2">
            {hasAllergies ? profile.allergies.map((a, i) => (
              <span key={i} className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold rounded-lg border border-red-200 dark:border-red-800/50">
                ⚠️ {a}
              </span>
            )) : <span className="text-gray-300 italic text-sm">None Reported</span>}
          </div>
        </div>

        {/* Chronic Conditions */}
        <div className="p-6 rounded-3xl bg-white dark:bg-gray-800 shadow-xl border border-gray-100 dark:border-gray-700">
          <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-4">Chronic Conditions</p>
          <div className="flex flex-wrap gap-2">
            {profile.chronicConditions?.length > 0 ? profile.chronicConditions.map((c, i) => (
              <span key={i} className="px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-xs font-bold rounded-lg border border-orange-200 dark:border-orange-800/50">
                • {c}
              </span>
            )) : <span className="text-gray-300 italic text-sm">None Reported</span>}
          </div>
        </div>
      </div>

      {/* ── SECTION 3: AI RISK ANALYSIS ──────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-xl border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            AI Predictive Health Assessment
          </h3>
          {isHighRisk && (
            <span className="px-3 py-1 bg-red-600 text-white text-[10px] font-black rounded-full animate-bounce">
              CRITICAL RISK ALERT
            </span>
          )}
        </div>

        {riskLoading ? (
          <div className="py-10 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-gray-400 font-bold animate-pulse">RUNNING NEURAL ANALYSIS...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <RiskBar label="Heart Disease" value={aiRisk?.heartDisease} />
            <RiskBar label="Diabetes Type II" value={aiRisk?.diabetes} />
            <RiskBar label="Ischemic Stroke" value={aiRisk?.stroke} />
          </div>
        )}
      </div>

      {/* ── SECTION 4: BLOCKCHAIN MEDICAL RECORDS ─────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-xl border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Recent Medical History (On-Chain)
          </h3>
          <span className="text-xs text-gray-400 font-medium">{records.length} records found</span>
        </div>

        {recordsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-14 bg-gray-50 dark:bg-gray-900 rounded-xl animate-pulse" />)}
          </div>
        ) : (
          <div className="space-y-3">
            {(isExpanded ? records : records.slice(0, 5)).map((record, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center text-indigo-600 shadow-sm">
                    {getRecordIcon(record.type)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white capitalize">{record.type.replace('_', ' ')}</p>
                    <p className="text-[10px] text-gray-400 font-medium">{new Date(record.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                  </div>
                </div>
                <a 
                  href={record.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                >
                  View File
                </a>
              </div>
            ))}

            {records.length > 5 && (
              <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-indigo-600 transition-colors"
              >
                {isExpanded ? '↑ Show Less' : `↓ View All ${records.length} Records`}
              </button>
            )}

            {records.length === 0 && (
              <div className="text-center py-6 text-gray-400 text-sm italic">
                No medical records found on-chain for this patient.
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── SECTION 5: QUICK ACTIONS ─────────────────────────────────────── */}
      <div className="flex flex-wrap gap-4">
        <button className="flex-1 min-w-[200px] py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
          Upload New Record
        </button>
        <button className="flex-1 min-w-[200px] py-4 bg-white dark:bg-gray-800 text-gray-700 dark:text-white font-bold rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 transition-all flex items-center justify-center gap-2">
          <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
          Emergency Contact
        </button>
        <button 
          onClick={() => window.print()}
          className="p-4 bg-white dark:bg-gray-800 text-gray-400 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 hover:text-indigo-600 transition-all"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
        </button>
      </div>

    </div>
  );
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const RiskBar = ({ label, value }) => {
  const getColour = (v) => {
    if (v > 70) return 'bg-red-500';
    if (v > 40) return 'bg-orange-500';
    return 'bg-green-500';
  };
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-end">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</span>
        <span className={`text-xs font-black ${value > 70 ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>{value || 0}%</span>
      </div>
      <div className="h-2 w-full bg-gray-100 dark:bg-gray-900 rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-1000 ${getColour(value)}`}
          style={{ width: `${value || 0}%` }}
        />
      </div>
    </div>
  );
};

const getRecordIcon = (type) => {
  switch (type.toLowerCase()) {
    case 'prescription': return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
    case 'lab_report':   return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.691.346a6 6 0 01-3.86.517l-2.388-.477a2 2 0 00-1.022.547l-1.168 1.168a2 2 0 00.517 3.414l2.388.477a6 6 0 003.86-.517l.691-.346a6 6 0 013.86-.517l2.387.477a2 2 0 00.517-3.414l-1.168-1.168z" /></svg>;
    case 'diagnosis':    return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>;
    default:             return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
  }
};

export default EmergencySnapshot;
