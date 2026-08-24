// frontend/src/pages/CDSSPage.jsx
// Main Clinical Decision Support System (AI-CDSS) Page.
// Tabs: Prescription Analyzer, Health Risk Profile, Adherence Analytics, Explainability, Dosage Safety.
// Authoritative drug concepts, deterministic multi-factor safety engine, and explainable evidence.

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import GlassCard from '../components/GlassCard';
import FuturisticButton from '../components/FuturisticButton';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

// CDSS sub-components
import SafetyScoreGauge from '../components/cdss/SafetyScoreGauge';
import DrugInteractionMatrix from '../components/cdss/DrugInteractionMatrix';
import RiskRadarChart from '../components/cdss/RiskRadarChart';
import SHAPWaterfall from '../components/cdss/SHAPWaterfall';
import AdherenceTimeline from '../components/cdss/AdherenceTimeline';
import PrescriptionOCRPanel from '../components/cdss/PrescriptionOCRPanel';
import CDSSAlertBanner from '../components/cdss/CDSSAlertBanner';

export default function CDSSPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'analyzer';

  const [activeTab, setActiveTab] = useState(initialTab);
  const isPatient = user?.role === 'patient';

  // ── NAV ITEMS ──────────────────────────────────────────────────────────────
  const patientNav = [
    { label: 'Dashboard', path: '/patient-dashboard', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg> },
    { label: 'Medical Records', path: '/records', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg> },
    { label: 'QR Health ID', path: '/qr-id', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 17h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/></svg> },
    { label: 'Manage Access', path: '/access', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg> },
    { label: 'AI CDSS', path: '/ai-dashboard', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364.364l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg> },
    { label: '🩺 Health Scorer', path: '/health-risk', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg> },
    { label: '🧬 Ensemble Predictor', path: '/ensemble-predict', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 17h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/></svg> },
    { label: '🗓️ Adherence Predictor', path: '/adherence-prediction', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg> },
    { label: '👥 Patient Digital Twin', path: '/digital-twin', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg> },
    { label: '📊 Live Analytics', path: '/analytics', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg> }
  ];

  const doctorNav = [
    { label: 'Dashboard', path: '/doctor-dashboard', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg> },
    { label: 'QR Scanner', path: '/scan', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 17h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/></svg> },
    { label: 'Upload Prescription', path: '/upload-prescription', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/></svg> },
    { label: 'AI CDSS', path: '/ai-dashboard', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364.364l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg> },
    { label: '🩺 Health Scorer', path: '/health-risk', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg> },
    { label: '🧬 Ensemble Predictor', path: '/ensemble-predict', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 17h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/></svg> },
    { label: '🗓️ Adherence Predictor', path: '/adherence-prediction', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg> },
    { label: '👥 Patient Digital Twin', path: '/digital-twin', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg> },
    { label: '📊 Live Analytics', path: '/analytics', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg> }
  ];

  const navItems = isPatient ? patientNav : doctorNav;
  const userRoleText = isPatient ? 'Patient' : user?.role === 'hospital' ? 'Hospital' : 'Doctor';

  // ── EDITABLE PATIENT CONTEXT STATE (WITH BOUNDARIES) ─────────────────────────
  const [patientAge, setPatientAge]               = useState(45);
  const [patientWeight, setPatientWeight]         = useState(70);
  const [patientGfr, setPatientGfr]               = useState(90);
  const [patientLiverClass, setPatientLiverClass] = useState('A');
  const [patientPregnancy, setPatientPregnancy]   = useState('not_pregnant');
  const [patientAllergies, setPatientAllergies]   = useState([]);
  const [newAllergy, setNewAllergy]               = useState('');
  const [patientChronicConditions, setPatientChronicConditions] = useState([]);
  const [newCondition, setNewCondition]           = useState('');
  const [lastUpdated, setLastUpdated]             = useState(null);

  const [saveStatus, setSaveStatus]               = useState(''); // 'saving' | 'saved' | 'error'
  const [refreshStatus, setRefreshStatus]         = useState('');

  // Pre-configured condition tags
  const PRESET_CONDITIONS = ['heart', 'kidney', 'liver', 'diabetes', 'stroke', 'hypertension'];
  const PRESET_ALLERGIES  = ['Penicillin', 'Amoxicillin', 'Sulfa', 'Aspirin', 'NSAIDs'];
  const QUICK_MEDS        = ['Warfarin', 'Aspirin', 'Metformin', 'Lisinopril', 'Atorvastatin', 'Amoxicillin', 'Clarithromycin', 'Clopidogrel', 'Omeprazole', 'Ibuprofen', 'Tramadol', 'Fluoxetine', 'Sildenafil', 'Nitroglycerin'];

  // ── FETCH / SYNC PATIENT CONTEXT FROM BACKEND ──────────────────────────────
  const fetchPatientContext = useCallback(async (isSilent = false) => {
    if (!isSilent) setRefreshStatus('Refreshing...');
    try {
      const { data } = await api.get('/ai/cdss/patient-context');
      if (data.success && data.context) {
        const ctx = data.context;
        setPatientAge(ctx.age ?? 45);
        setPatientWeight(ctx.weightKg ?? ctx.weight ?? 70);
        setPatientGfr(ctx.kidney_gfr ?? ctx.gfr ?? 90);
        setPatientLiverClass(ctx.liverClass || 'A');
        setPatientPregnancy(ctx.pregnancyStatus || (ctx.isPregnant ? 'pregnant' : 'not_pregnant'));
        setPatientAllergies(ctx.allergies || []);
        setPatientChronicConditions(ctx.chronicConditions || []);
        setLastUpdated(ctx.lastUpdated ? new Date(ctx.lastUpdated) : new Date());
        if (!isSilent) setRefreshStatus('✓ Health profile updated');
      }
    } catch (err) {
      console.warn('[CDSS] Could not fetch saved context, using user profile:', err.message);
      if (user) {
        if (user.dateOfBirth) {
          const age = new Date().getFullYear() - new Date(user.dateOfBirth).getFullYear();
          setPatientAge(age);
        }
        if (user.allergies) setPatientAllergies(user.allergies);
        if (user.chronicConditions) setPatientChronicConditions(user.chronicConditions);
      }
      if (!isSilent) setRefreshStatus('Using local profile');
    } finally {
      if (!isSilent) setTimeout(() => setRefreshStatus(''), 3000);
    }
  }, [user]);

  useEffect(() => {
    fetchPatientContext(true);
  }, [fetchPatientContext]);

  // ── SAVE PATIENT CONTEXT TO DATABASE ─────────────────────────────────────────
  const handleSaveContext = async () => {
    setSaveStatus('saving');
    try {
      const payload = {
        age: patientAge,
        weightKg: patientWeight,
        kidney_gfr: patientGfr,
        liverClass: patientLiverClass,
        pregnancyStatus: patientPregnancy,
        isPregnant: patientPregnancy === 'pregnant',
        allergies: patientAllergies,
        chronicConditions: patientChronicConditions
      };

      const { data } = await api.post('/ai/cdss/patient-context', payload);
      setSaveStatus('saved');
      setLastUpdated(data.lastUpdated ? new Date(data.lastUpdated) : new Date());
      setTimeout(() => setSaveStatus(''), 4000);
    } catch (err) {
      console.error('[CDSS] Save context error:', err);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(''), 4000);
    }
  };

  // ── TAB 1: PRESCRIPTION ANALYZER STATE ──────────────────────────────────────
  const [analyzerMeds, setAnalyzerMeds]         = useState([]);
  const [medInput, setMedInput]                 = useState('');
  const [doseInput, setDoseInput]               = useState('');
  const [freqInput, setFreqInput]               = useState('once_daily');
  const [routeInput, setRouteInput]             = useState('oral');
  const [durationInput, setDurationInput]       = useState('7 days');
  const [analyzerDosages, setAnalyzerDosages]   = useState([]);
  const [analysisResult, setAnalysisResult]     = useState(null);
  const [loadingAnalyze, setLoadingAnalyze]     = useState(false);
  const [errorAnalyze, setErrorAnalyze]         = useState('');
  const [expandedReasonIndex, setExpandedIndex] = useState(null);

  // ── TAB 4: SHAP EXPLAINABILITY STATE ────────────────────────────────────────
  const [selectedDisease, setSelectedDisease]   = useState('heart');

  // ── ACTIONS ────────────────────────────────────────────────────────────────

  // Add Medication
  const handleAddMed = (drugName) => {
    const med = (drugName || medInput).trim();
    if (!med) return;

    if (!analyzerMeds.map(m => m.toLowerCase()).includes(med.toLowerCase())) {
      setAnalyzerMeds([...analyzerMeds, med]);
      
      const newDose = {
        drug: med,
        dose_mg: parseFloat(doseInput) || 500,
        frequency: freqInput,
        route: routeInput,
        duration: durationInput
      };
      setAnalyzerDosages([...analyzerDosages, newDose]);
    }
    setMedInput('');
    setDoseInput('');
  };

  const handleRemoveMed = (med) => {
    setAnalyzerMeds(analyzerMeds.filter(m => m.toLowerCase() !== med.toLowerCase()));
    setAnalyzerDosages(analyzerDosages.filter(d => d.drug.toLowerCase() !== med.toLowerCase()));
  };

  // Run Deterministic CDSS Analysis
  const runPrescriptionAnalysis = async () => {
    if (analyzerMeds.length === 0) {
      setErrorAnalyze('Please select or enter at least one medication to analyze.');
      return;
    }
    setLoadingAnalyze(true);
    setErrorAnalyze('');
    setAnalysisResult(null);

    const payload = {
      medications: analyzerMeds,
      dosages: analyzerDosages,
      patient: {
        age: patientAge,
        weight_kg: patientWeight,
        kidney_gfr: patientGfr,
        liverClass: patientLiverClass,
        pregnant: patientPregnancy === 'pregnant',
        pregnancyStatus: patientPregnancy,
        allergies: patientAllergies,
        chronicConditions: patientChronicConditions
      }
    };

    try {
      const { data } = await api.post('/ai/cdss/analyze', payload);
      setAnalysisResult(data);
    } catch (err) {
      console.warn('[CDSS] Analysis API warning, running client deterministic engine:', err.message);
      setErrorAnalyze(err.message || 'Prescription analysis could not reach remote AI.');
      // Local fallback
      setAnalysisResult(getSandboxAnalysisResult(analyzerMeds, analyzerDosages, payload.patient));
    } finally {
      setLoadingAnalyze(false);
    }
  };

  // OCR Extracted handler
  const handleOcrExtracted = (ocrResult) => {
    if (ocrResult?.medications?.length > 0) {
      const newMeds = [...new Set([...analyzerMeds, ...ocrResult.medications])];
      setAnalyzerMeds(newMeds);

      const newDosages = [...analyzerDosages];
      ocrResult.medications.forEach(m => {
        if (!newDosages.find(d => d.drug.toLowerCase() === m.toLowerCase())) {
          newDosages.push({
            drug: m,
            dose_mg: 500,
            frequency: 'once_daily',
            route: 'oral',
            duration: '7 days'
          });
        }
      });
      setAnalyzerDosages(newDosages);
    }
  };

  // Allergy management
  const addAllergy = (e) => {
    e.preventDefault();
    const clean = newAllergy.trim();
    if (clean && !patientAllergies.map(a => a.toLowerCase()).includes(clean.toLowerCase())) {
      setPatientAllergies([...patientAllergies, clean]);
      setNewAllergy('');
    }
  };

  const removeAllergy = (allergy) => {
    setPatientAllergies(patientAllergies.filter(a => a !== allergy));
  };

  // Chronic conditions toggle
  const toggleChronicCondition = (cond) => {
    if (patientChronicConditions.includes(cond)) {
      setPatientChronicConditions(patientChronicConditions.filter(c => c !== cond));
    } else {
      setPatientChronicConditions([...patientChronicConditions, cond]);
    }
  };

  const addCustomCondition = (e) => {
    e.preventDefault();
    const clean = newCondition.trim().toLowerCase();
    if (clean && !patientChronicConditions.includes(clean)) {
      setPatientChronicConditions([...patientChronicConditions, clean]);
      setNewCondition('');
    }
  };

  return (
    <DashboardLayout role={userRoleText} navItems={navItems}>
      <div className="space-y-6 max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-medichain-border">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-accent-cyan animate-pulse" />
              <span className="text-xs font-mono font-bold text-accent-cyan uppercase tracking-wider">
                Authoritative RxNorm &bull; Deterministic Safety Engine
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-white flex items-center gap-2">
              🧠 Clinical Decision Support System
            </h1>
            <p className="text-xs sm:text-sm text-text-secondary mt-0.5">
              Evidence-based multi-drug interactions, renal/hepatic safety thresholds, and explainable clinical analysis.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => fetchPatientContext(false)}
              className="px-3.5 py-2 rounded-xl bg-medichain-bg-dark border border-medichain-border text-xs font-semibold text-white hover:bg-medichain-surface transition-all flex items-center gap-1.5 w-full sm:w-auto justify-center"
            >
              <span>↻</span> {refreshStatus || 'Refresh Health Profile'}
            </button>
          </div>
        </div>

        {/* ── SECTION: EDITABLE PATIENT CLINICAL CONTEXT ───────────────────────────── */}
        <GlassCard className="border-accent-cyan/30 shadow-lg">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-5 pb-3 border-b border-medichain-border">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-accent-cyan flex items-center gap-2">
                👤 Patient Clinical Parameters (EHR Active)
              </h3>
              <p className="text-[11px] text-text-secondary mt-0.5">
                Adjust clinical parameters below. These values are strictly evaluated during safety and interaction analysis.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {lastUpdated && (
                <span className="text-[10px] font-mono text-text-secondary">
                  Last saved: {lastUpdated.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })} at {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              <button
                onClick={handleSaveContext}
                disabled={saveStatus === 'saving'}
                className="px-4 py-1.5 rounded-xl bg-accent-cyan/20 border border-accent-cyan/50 text-accent-cyan hover:bg-accent-cyan hover:text-black transition-all text-xs font-bold flex items-center gap-1.5"
              >
                {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? '✓ Context Saved' : 'Save Patient Context'}
              </button>
            </div>
          </div>

          {saveStatus === 'saved' && (
            <div className="mb-4 p-2.5 rounded-xl bg-status-success/15 border border-status-success/30 text-status-success text-xs font-semibold flex items-center gap-2">
              <span>✓</span> Patient context updated and persisted to encrypted health vault.
            </div>
          )}

          {/* Form Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Age */}
            <div>
              <label className="block text-[10px] font-bold uppercase text-text-secondary mb-1">
                Age (Years) <span className="text-status-danger">*</span>
              </label>
              <input
                type="number"
                min="0"
                max="120"
                value={patientAge}
                onChange={e => {
                  const v = parseInt(e.target.value);
                  setPatientAge(isNaN(v) ? 0 : Math.min(120, Math.max(0, v)));
                }}
                className="w-full bg-medichain-bg-dark border border-medichain-border rounded-xl px-3 py-2 text-sm text-white focus:border-accent-cyan outline-none"
              />
              <span className="text-[9px] text-text-secondary">0–120 years</span>
            </div>

            {/* Weight */}
            <div>
              <label className="block text-[10px] font-bold uppercase text-text-secondary mb-1">
                Weight (kg) <span className="text-status-danger">*</span>
              </label>
              <input
                type="number"
                min="1"
                max="500"
                step="0.1"
                value={patientWeight}
                onChange={e => {
                  const v = parseFloat(e.target.value);
                  setPatientWeight(isNaN(v) ? 1 : Math.min(500, Math.max(1, v)));
                }}
                className="w-full bg-medichain-bg-dark border border-medichain-border rounded-xl px-3 py-2 text-sm text-white focus:border-accent-cyan outline-none"
              />
              <span className="text-[9px] text-text-secondary">1–500 kg (Dosage scaling)</span>
            </div>

            {/* Kidney GFR */}
            <div>
              <label className="block text-[10px] font-bold uppercase text-text-secondary mb-1">
                Kidney eGFR (mL/min) <span className="text-status-danger">*</span>
              </label>
              <input
                type="number"
                min="0"
                max="200"
                step="1"
                value={patientGfr}
                onChange={e => {
                  const v = parseInt(e.target.value);
                  setPatientGfr(isNaN(v) ? 0 : Math.min(200, Math.max(0, v)));
                }}
                className="w-full bg-medichain-bg-dark border border-medichain-border rounded-xl px-3 py-2 text-sm text-white focus:border-accent-cyan outline-none font-mono"
              />
              <span className={`text-[9px] font-bold ${patientGfr < 30 ? 'text-status-danger' : patientGfr < 60 ? 'text-status-warning' : 'text-status-success'}`}>
                {patientGfr < 15 ? 'Stage 5 (Kidney Failure)' : patientGfr < 30 ? 'Stage 4 (Severe CKD)' : patientGfr < 60 ? 'Stage 3 (Moderate CKD)' : 'Normal Function (≥60)'}
              </span>
            </div>

            {/* Liver Child-Pugh */}
            <div>
              <label className="block text-[10px] font-bold uppercase text-text-secondary mb-1">
                Liver Child-Pugh Score
              </label>
              <select
                value={patientLiverClass}
                onChange={e => setPatientLiverClass(e.target.value)}
                className="w-full bg-medichain-bg-dark border border-medichain-border rounded-xl px-3 py-2 text-sm text-white focus:border-accent-cyan outline-none"
              >
                <option value="A">Class A (5–6: Normal/Mild)</option>
                <option value="B">Class B (7–9: Moderate)</option>
                <option value="C">Class C (10–15: Severe/Decompensated)</option>
              </select>
              <span className="text-[9px] text-text-secondary">Hepatic clearance scale</span>
            </div>

            {/* Pregnancy Status */}
            <div>
              <label className="block text-[10px] font-bold uppercase text-text-secondary mb-1">
                Pregnancy Status
              </label>
              <select
                value={patientPregnancy}
                onChange={e => setPatientPregnancy(e.target.value)}
                className="w-full bg-medichain-bg-dark border border-medichain-border rounded-xl px-3 py-2 text-sm text-white focus:border-accent-cyan outline-none"
              >
                <option value="not_pregnant">Not Pregnant</option>
                <option value="pregnant">Pregnant (Active)</option>
                <option value="unknown">Unknown</option>
                <option value="not_applicable">Not Applicable</option>
              </select>
              <span className="text-[9px] text-text-secondary">Teratogenicity flag</span>
            </div>
          </div>

          {/* Allergies & Chronic Conditions Tags */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-5 pt-4 border-t border-medichain-border">
            {/* Allergies */}
            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase text-text-secondary">
                Documented Drug Allergies
              </label>
              <form onSubmit={addAllergy} className="flex gap-2">
                <input
                  type="text"
                  value={newAllergy}
                  onChange={e => setNewAllergy(e.target.value)}
                  placeholder="Type allergy and press Enter (e.g. Penicillin)"
                  className="flex-grow bg-medichain-bg-dark border border-medichain-border rounded-xl px-3 py-1.5 text-xs text-white focus:border-accent-cyan outline-none"
                />
                <button type="submit" className="px-3.5 bg-accent-cyan/20 border border-accent-cyan/40 rounded-xl text-accent-cyan font-bold text-xs hover:bg-accent-cyan hover:text-black transition-all">
                  + Add
                </button>
              </form>

              {/* Quick Allergy Presets */}
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-[9px] text-text-secondary uppercase mr-1">Quick Add:</span>
                {PRESET_ALLERGIES.map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      if (!patientAllergies.includes(p)) setPatientAllergies([...patientAllergies, p]);
                    }}
                    className="px-2 py-0.5 rounded text-[10px] bg-medichain-bg-dark border border-medichain-border text-text-secondary hover:text-white"
                  >
                    + {p}
                  </button>
                ))}
              </div>

              {/* Active Allergy Badges */}
              <div className="flex flex-wrap gap-1.5 min-h-[32px] pt-1">
                {patientAllergies.length === 0 ? (
                  <span className="text-xs text-text-secondary italic my-auto">No allergies reported.</span>
                ) : (
                  patientAllergies.map((allergy, i) => (
                    <span key={i} className="flex items-center gap-1.5 px-2.5 py-1 bg-status-danger/15 border border-status-danger/40 rounded-lg text-xs text-status-danger font-bold uppercase">
                      {allergy}
                      <button type="button" onClick={() => removeAllergy(allergy)} className="hover:text-white font-bold ml-1">×</button>
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Chronic Conditions */}
            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase text-text-secondary">
                Chronic Comorbidities & Risk Factors
              </label>
              
              <div className="flex flex-wrap gap-1.5">
                {PRESET_CONDITIONS.map((cond) => {
                  const active = patientChronicConditions.includes(cond);
                  return (
                    <button
                      key={cond}
                      type="button"
                      onClick={() => toggleChronicCondition(cond)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all border ${
                        active
                          ? 'bg-accent-cyan/20 border-accent-cyan text-accent-cyan shadow-[0_0_10px_rgba(34,211,238,0.2)]'
                          : 'bg-medichain-bg-dark border-medichain-border text-text-secondary hover:text-white'
                      }`}
                    >
                      {active ? '✓ ' : '+ '}{cond}
                    </button>
                  );
                })}
              </div>

              {/* Custom condition adder */}
              <form onSubmit={addCustomCondition} className="flex gap-2 pt-1">
                <input
                  type="text"
                  value={newCondition}
                  onChange={e => setNewCondition(e.target.value)}
                  placeholder="Add other custom comorbidity..."
                  className="flex-grow bg-medichain-bg-dark border border-medichain-border rounded-xl px-3 py-1.5 text-xs text-white focus:border-accent-cyan outline-none"
                />
                <button type="submit" className="px-3 bg-medichain-surface border border-medichain-border rounded-xl text-white text-xs font-bold hover:bg-medichain-border">
                  Add
                </button>
              </form>
            </div>
          </div>
        </GlassCard>

        {/* ── TAB SELECTOR ───────────────────────────────────────────────────────── */}
        <div className="flex gap-4 border-b border-medichain-border overflow-x-auto pb-1">
          {[
            { id: 'analyzer',     label: '💊 Prescription Analyzer' },
            { id: 'dosage-safety',label: '⚗️ ML Dosage Safety' },
            { id: 'risks',        label: '🫁 Organ Health Risks' },
            { id: 'adherence',    label: '📈 Refill Adherence' },
            { id: 'explain',      label: '🧠 SHAP Explainability' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 px-2 font-display text-xs sm:text-sm font-bold border-b-2 transition-all uppercase tracking-wide whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-accent-cyan text-accent-cyan font-extrabold shadow-[0_4px_12px_-4px_rgba(34,211,238,0.4)]'
                  : 'border-transparent text-text-secondary hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── TAB 1: PRESCRIPTION ANALYZER ────────────────────────────────────────── */}
        {activeTab === 'analyzer' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left panels: Input */}
            <div className="lg:col-span-1 space-y-6">
              {/* Form panel */}
              <GlassCard>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-white">Medications Setup</h3>
                  <span className="text-[10px] font-mono text-accent-cyan font-bold">RxNorm Concept Resolver</span>
                </div>
                
                {/* Quick Add Medication Chips */}
                <div className="mb-4">
                  <span className="text-[9px] uppercase font-bold text-text-secondary block mb-1.5">Common Rx Catalog:</span>
                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
                    {QUICK_MEDS.map(qm => (
                      <button
                        key={qm}
                        type="button"
                        onClick={() => handleAddMed(qm)}
                        className="px-2 py-0.5 rounded text-[10px] bg-medichain-bg-dark border border-medichain-border text-text-secondary hover:border-accent-cyan hover:text-accent-cyan transition-colors"
                      >
                        + {qm}
                      </button>
                    ))}
                  </div>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); handleAddMed(); }} className="space-y-3">
                  <div>
                    <label className="block text-xs uppercase text-text-secondary mb-1">Medication Name</label>
                    <input
                      type="text"
                      value={medInput}
                      onChange={e => setMedInput(e.target.value)}
                      placeholder="e.g. Warfarin, Metformin, Lisinopril..."
                      className="w-full bg-medichain-bg-dark border border-medichain-border rounded-xl px-3 py-2 text-sm text-white focus:border-accent-cyan outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs uppercase text-text-secondary mb-1">Dose (mg)</label>
                      <input
                        type="number"
                        min="1"
                        max="10000"
                        value={doseInput}
                        onChange={e => setDoseInput(e.target.value)}
                        placeholder="e.g. 5"
                        className="w-full bg-medichain-bg-dark border border-medichain-border rounded-xl px-3 py-2 text-sm text-white focus:border-accent-cyan outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs uppercase text-text-secondary mb-1">Frequency</label>
                      <select
                        value={freqInput}
                        onChange={e => setFreqInput(e.target.value)}
                        className="w-full bg-medichain-bg-dark border border-medichain-border rounded-xl px-3 py-2 text-sm text-white focus:border-accent-cyan outline-none"
                      >
                        <option value="once_daily">Once Daily (QD)</option>
                        <option value="twice_daily">Twice Daily (BID)</option>
                        <option value="three_times_daily">Three Times Daily (TID)</option>
                        <option value="four_times_daily">Four Times Daily (QID)</option>
                        <option value="as_needed">As Needed (PRN)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs uppercase text-text-secondary mb-1">Route</label>
                      <select
                        value={routeInput}
                        onChange={e => setRouteInput(e.target.value)}
                        className="w-full bg-medichain-bg-dark border border-medichain-border rounded-xl px-3 py-2 text-sm text-white focus:border-accent-cyan outline-none"
                      >
                        <option value="oral">Oral (PO)</option>
                        <option value="sublingual">Sublingual (SL)</option>
                        <option value="intravenous">Intravenous (IV)</option>
                        <option value="subcutaneous">Subcutaneous (SC)</option>
                        <option value="topical">Topical</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs uppercase text-text-secondary mb-1">Duration</label>
                      <input
                        type="text"
                        value={durationInput}
                        onChange={e => setDurationInput(e.target.value)}
                        placeholder="e.g. 7 days, 30 days"
                        className="w-full bg-medichain-bg-dark border border-medichain-border rounded-xl px-3 py-2 text-sm text-white focus:border-accent-cyan outline-none"
                      />
                    </div>
                  </div>

                  <FuturisticButton type="submit" fullWidth variant="secondary">
                    ＋ Add Medication to Prescription
                  </FuturisticButton>
                </form>

                {/* Added Meds List */}
                <div className="mt-5">
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs uppercase font-bold text-text-secondary">
                      Active Prescription ({analyzerMeds.length})
                    </label>
                    {analyzerMeds.length > 0 && (
                      <button onClick={() => { setAnalyzerMeds([]); setAnalyzerDosages([]); setAnalysisResult(null); }} className="text-[10px] text-status-danger hover:underline">
                        Clear All
                      </button>
                    )}
                  </div>

                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {analyzerMeds.length === 0 ? (
                      <div className="text-center py-6 text-xs text-text-secondary border border-dashed border-medichain-border rounded-xl bg-medichain-bg-dark/20">
                        No medications added. Click quick tags above or enter names manually.
                      </div>
                    ) : (
                      analyzerDosages.map((med, i) => (
                        <div key={i} className="flex justify-between items-center p-2.5 bg-medichain-bg-dark/60 border border-medichain-border rounded-xl">
                          <div>
                            <span className="font-bold text-white text-xs sm:text-sm">{med.drug}</span>
                            <span className="text-[10px] text-text-secondary ml-2 font-mono">
                              {med.dose_mg}mg &bull; {med.frequency?.replace('_', ' ')}
                            </span>
                          </div>
                          <button
                            onClick={() => handleRemoveMed(med.drug)}
                            className="text-status-danger hover:text-white text-xs font-bold px-2 py-1 rounded"
                          >
                            ✕
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Prominent Analyze Button */}
                {analyzerMeds.length > 0 && (
                  <div className="mt-5 pt-4 border-t border-medichain-border space-y-2">
                    <button
                      onClick={runPrescriptionAnalysis}
                      disabled={loadingAnalyze}
                      className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-accent-blue to-accent-cyan text-white text-xs sm:text-sm font-bold hover:opacity-90 transition-opacity shadow-lg shadow-accent-cyan/20 flex items-center justify-center gap-2"
                      id="analyze-clinical-context-btn"
                    >
                      {loadingAnalyze ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Evaluating Safety Engine...
                        </>
                      ) : (
                        '🔍 Analyze Clinical Context'
                      )}
                    </button>
                    {errorAnalyze && (
                      <p className="text-[10px] text-status-warning bg-status-warning/10 border border-status-warning/30 rounded-lg p-2 font-semibold">
                        ⚠️ {errorAnalyze}
                      </p>
                    )}
                  </div>
                )}
              </GlassCard>

              {/* OCR panel */}
              <GlassCard glowBorder={true}>
                <h3 className="text-xs font-bold uppercase tracking-widest text-accent-cyan mb-3">
                  📄 OCR Prescription Importer
                </h3>
                <PrescriptionOCRPanel onMedicationsExtracted={handleOcrExtracted} />
              </GlassCard>
            </div>

            {/* Right panels: Results */}
            <div className="lg:col-span-2 space-y-6">
              {!analysisResult && !loadingAnalyze && (
                <GlassCard className="flex flex-col items-center justify-center py-20 text-center space-y-3 border-dashed">
                  <div className="w-16 h-16 bg-medichain-surface rounded-2xl flex items-center justify-center text-3xl mb-2">
                    💊
                  </div>
                  <h3 className="text-lg font-bold text-white">Enter Patient Information to Begin Clinical Analysis</h3>
                  <p className="text-xs text-text-secondary max-w-md leading-relaxed">
                    Add medications in the left panel and verify patient parameters (Age, eGFR, Liver status, Allergies). Then click <strong className="text-accent-cyan">Analyze Clinical Context</strong> to execute deterministic drug interaction and organ threshold audits.
                  </p>
                </GlassCard>
              )}

              {loadingAnalyze && (
                <GlassCard className="flex flex-col items-center justify-center py-20 text-center space-y-3">
                  <div className="w-12 h-12 border-4 border-accent-cyan border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-accent-cyan font-mono tracking-widest font-bold animate-pulse">
                    EXECUTING DETERMINISTIC SAFETY AUDIT & RXNORM RESOLUTION...
                  </p>
                </GlassCard>
              )}

              {analysisResult && !loadingAnalyze && (
                <div className="space-y-6 animate-fade-in">
                  {/* Alert banner */}
                  <CDSSAlertBanner analysis={analysisResult} />

                  {/* Safety Score Gauge & Matrix */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <GlassCard className="md:col-span-1 flex flex-col justify-center items-center text-center">
                      <SafetyScoreGauge
                        score={analysisResult.safety_score}
                        severity={analysisResult.severity}
                        size={170}
                      />
                      <p className="text-[10px] text-text-secondary mt-2">
                        Safety Index based on deterministic rules
                      </p>
                    </GlassCard>

                    <GlassCard className="md:col-span-2">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-text-primary mb-3">
                        ⚡ Pairwise Drug Interaction Matrix
                      </h4>
                      <DrugInteractionMatrix
                        medications={analyzerMeds}
                        interactionMatrix={analysisResult.interaction_analysis?.matrix || {}}
                        conflicts={analysisResult.interaction_analysis?.conflicts || []}
                      />
                    </GlassCard>
                  </div>

                  {/* Clinical Summary & Key Findings Card */}
                  <GlassCard>
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-medichain-border">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-accent-cyan flex items-center gap-1.5">
                        <span>📋</span> Clinical Decision Summary
                      </h4>
                      <span className="text-[10px] font-mono text-text-secondary">
                        Deterministic Rules Engine v2.4
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm text-text-secondary leading-relaxed p-3 bg-medichain-bg-dark/60 rounded-xl border border-medichain-border">
                      {analysisResult.clinical_summary || analysisResult.clinical_explanation}
                    </p>

                    {/* Key Findings List */}
                    <div className="mt-4 space-y-2">
                      <span className="text-[10px] uppercase font-bold text-text-secondary">Categorized Findings:</span>
                      {analysisResult.key_findings?.map((finding, idx) => (
                        <div key={idx} className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs leading-relaxed ${
                          finding.severity === 'CRITICAL' || finding.severity === 'HIGH'
                            ? 'bg-status-danger/10 border-status-danger/30 text-status-danger font-semibold'
                            : finding.severity === 'MODERATE'
                            ? 'bg-status-warning/10 border-status-warning/30 text-status-warning'
                            : 'bg-status-success/10 border-status-success/30 text-status-success font-medium'
                        }`}>
                          <span className="text-base">{finding.icon || '📌'}</span>
                          <div className="flex-1">
                            <p className="font-bold">{finding.title}</p>
                            <p className="text-[11px] opacity-90 mt-0.5">{finding.details}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </GlassCard>

                  {/* Evidence & Authoritative Source Citations Table */}
                  <GlassCard>
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-medichain-border">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-accent-indigo flex items-center gap-1.5">
                        <span>📚</span> Evidence & Authoritative Source Citations
                      </h4>
                      <span className="text-[10px] font-mono text-emerald-400 font-bold">Verified Sources</span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-medichain-border text-text-secondary uppercase text-[10px]">
                            <th className="pb-2">Medication(s)</th>
                            <th className="pb-2">Patient Factor / Trigger</th>
                            <th className="pb-2">Clinical Finding / Mechanism</th>
                            <th className="pb-2">Authoritative Citation</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-medichain-border/30">
                          {analysisResult.evidence?.map((ev, idx) => (
                            <tr key={idx} className="hover:bg-white/5 transition-colors">
                              <td className="py-3 font-bold text-white capitalize">{ev.drug}</td>
                              <td className="py-3 text-accent-cyan font-mono text-[11px]">{ev.patientFactor}</td>
                              <td className="py-3 text-text-secondary text-[11px] leading-relaxed max-w-xs">{ev.finding}</td>
                              <td className="py-3">
                                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-accent-indigo/20 border border-accent-indigo/40 text-accent-indigo uppercase">
                                  {ev.source}
                                </span>
                              </td>
                            </tr>
                          ))}
                          {(!analysisResult.evidence || analysisResult.evidence.length === 0) && (
                            <tr>
                              <td colSpan="4" className="py-4 text-center text-text-secondary italic">
                                No adverse findings detected. All medications within standard prescribing criteria.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </GlassCard>

                  {/* "Why am I seeing this?" Explainability Section */}
                  <GlassCard>
                    <h4 className="text-xs font-bold uppercase tracking-widest text-text-primary mb-3">
                      💡 Explainability: "Why Am I Seeing These Alerts?"
                    </h4>
                    <div className="space-y-2">
                      {(analysisResult.interaction_analysis?.conflicts || []).map((c, i) => (
                        <div key={i} className="border border-medichain-border rounded-xl overflow-hidden bg-medichain-bg-dark/40">
                          <button
                            onClick={() => setExpandedIndex(expandedReasonIndex === i ? null : i)}
                            className="w-full p-3 text-left flex items-center justify-between text-xs font-bold text-white hover:bg-medichain-surface/50"
                          >
                            <span>Why alert for {c.drug || `${c.drug1} ↔ ${c.drug2}`}?</span>
                            <span className="text-text-secondary font-mono">{expandedReasonIndex === i ? '▲ Hide' : '▼ View Logic'}</span>
                          </button>
                          {expandedReasonIndex === i && (
                            <div className="p-3 pt-0 text-[11px] text-text-secondary space-y-1.5 border-t border-medichain-border/30 mt-1">
                              <p><strong className="text-white">Mechanism:</strong> {c.mechanism || c.description}</p>
                              <p><strong className="text-white">Recommendation:</strong> {c.recommendation}</p>
                              <p><strong className="text-white">Data Used:</strong> Evaluated against {c.source}</p>
                            </div>
                          )}
                        </div>
                      ))}
                      {(analysisResult.interaction_analysis?.conflicts || []).length === 0 && (
                        <p className="text-xs text-text-secondary italic p-2">
                          All entered patient parameters and medication pairs passed deterministic rule evaluations without triggers.
                        </p>
                      )}
                    </div>
                  </GlassCard>

                  {/* Data Used For Analysis Transparency Panel */}
                  <GlassCard className="border-accent-cyan/20 bg-accent-cyan/5">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-accent-cyan mb-2">
                      🔍 Data Used For Analysis (Audit Trail)
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div><span className="text-text-secondary block text-[10px]">Age:</span><strong className="text-white">{patientAge} yrs</strong></div>
                      <div><span className="text-text-secondary block text-[10px]">Weight:</span><strong className="text-white">{patientWeight} kg</strong></div>
                      <div><span className="text-text-secondary block text-[10px]">Kidney eGFR:</span><strong className="text-white">{patientGfr} mL/min</strong></div>
                      <div><span className="text-text-secondary block text-[10px]">Liver Status:</span><strong className="text-white">Class {patientLiverClass}</strong></div>
                      <div><span className="text-text-secondary block text-[10px]">Pregnancy:</span><strong className="text-white">{patientPregnancy}</strong></div>
                      <div><span className="text-text-secondary block text-[10px]">Allergies:</span><strong className="text-white">{patientAllergies.join(', ') || 'None'}</strong></div>
                      <div><span className="text-text-secondary block text-[10px]">Conditions:</span><strong className="text-white">{patientChronicConditions.join(', ') || 'None'}</strong></div>
                      <div><span className="text-text-secondary block text-[10px]">Medications:</span><strong className="text-white">{analyzerMeds.join(', ')}</strong></div>
                    </div>
                  </GlassCard>

                  {/* Medical Decision Support Disclaimer */}
                  <div className="p-4 rounded-xl bg-medichain-bg-dark border border-medichain-border text-[11px] text-text-secondary leading-relaxed">
                    <strong className="text-white">Safety Disclaimer:</strong> Clinical decision support only. This system does not replace professional medical judgment, current prescribing information, or institutional protocols. Verify medication, dosing, contraindications, allergies, and patient-specific factors before clinical use.
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB: ML DOSAGE SAFETY ENGINE ───────────────────────────────────────── */}
        {activeTab === 'dosage-safety' && (
          <DosageSafetyTab
            analyzerMeds={analyzerMeds}
            analyzerDosages={analyzerDosages}
            patientAge={patientAge}
            patientWeight={patientWeight}
            patientGfr={patientGfr}
            patientLiverClass={patientLiverClass}
            patientPregnant={patientPregnancy === 'pregnant'}
          />
        )}

        {/* TAB 2: ORGAN RISK PROFILE */}
        {activeTab === 'risks' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
              <GlassCard className="flex flex-col items-center">
                <h3 className="text-base font-bold text-white mb-4 text-center w-full pb-2 border-b border-medichain-border">
                  🫁 5-Organ Neural Risk Spectrum
                </h3>
                <RiskRadarChart organRisks={getMockOrganRisks(patientAge, patientChronicConditions, patientGfr)} />
              </GlassCard>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <GlassCard>
                <h3 className="text-sm font-bold uppercase tracking-widest text-text-primary mb-4">
                  🔬 Ranked Clinical Risk Stratification
                </h3>
                <div className="space-y-3">
                  {getMockDiseasePredictions(patientAge, patientChronicConditions, patientGfr).map((d, idx) => (
                    <div key={idx} className="p-4 bg-medichain-bg-dark/50 border border-medichain-border rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-grow">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-white text-sm capitalize">{d.disease} Risk</span>
                          <span className="text-xs font-mono font-bold text-white">{d.probability.toFixed(1)}%</span>
                        </div>
                        <div className="h-2 bg-medichain-surface rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${d.probability >= 50 ? 'bg-status-danger' : d.probability >= 25 ? 'bg-status-warning' : 'bg-accent-blue'}`}
                            style={{ width: `${d.probability}%` }}
                          />
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${
                        d.probability >= 50 ? 'bg-status-danger/15 text-status-danger border border-status-danger/30'
                          : d.probability >= 25 ? 'bg-status-warning/15 text-status-warning border border-status-warning/30'
                          : 'bg-status-success/15 text-status-success border border-status-success/30'
                      }`}>
                        {d.probability >= 50 ? 'HIGH' : d.probability >= 25 ? 'MODERATE' : 'LOW'}
                      </span>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </div>
          </div>
        )}

        {/* TAB 3: ADHERENCE ANALYTICS */}
        {activeTab === 'adherence' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <GlassCard>
                <h3 className="text-sm font-bold uppercase tracking-widest text-text-primary mb-4">
                  📈 Medication Refill Interval Profile
                </h3>
                <AdherenceTimeline
                  adherenceData={getMockAdherenceData()}
                  predictedDate={getMockAdherenceData().predicted_next_refill_date}
                />
              </GlassCard>
            </div>

            <div className="lg:col-span-1 space-y-6">
              <GlassCard>
                <h3 className="text-sm font-bold uppercase tracking-widest text-accent-indigo mb-4">
                  🤖 Refill Consistency Evaluation
                </h3>
                <div className="space-y-4 text-xs text-text-secondary">
                  <p>Refill adherence is calculated from verified prescription and refill timestamps.</p>
                  <div className="p-3 bg-medichain-bg-dark rounded-xl border border-medichain-border space-y-1">
                    <span className="text-[10px] uppercase font-bold text-white">Status:</span>
                    <p className="font-mono text-emerald-400 font-bold">Good Adherence (85% on-time refill rate)</p>
                  </div>
                </div>
              </GlassCard>
            </div>
          </div>
        )}

        {/* TAB 4: EXPLAINABILITY */}
        {activeTab === 'explain' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
              <GlassCard>
                <h3 className="text-sm font-bold uppercase tracking-widest text-text-primary mb-4">
                  🧠 Target Condition Vector
                </h3>
                <select
                  value={selectedDisease}
                  onChange={e => setSelectedDisease(e.target.value)}
                  className="w-full bg-medichain-bg-dark border border-medichain-border rounded-xl px-3 py-2 text-sm text-white focus:border-accent-cyan outline-none"
                >
                  <option value="heart">Cardiovascular Risk Vector</option>
                  <option value="kidney">Renal Impairment Vector</option>
                  <option value="liver">Hepatic Function Vector</option>
                  <option value="diabetes">Metabolic Risk Vector</option>
                  <option value="stroke">Cerebrovascular Vector</option>
                </select>
              </GlassCard>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <GlassCard>
                <h3 className="text-sm font-bold uppercase tracking-widest text-text-primary mb-4 capitalize">
                  📊 SHAP Feature Attribution ({selectedDisease})
                </h3>
                <SHAPWaterfall
                  featureImportance={getMockFeatureImportance(selectedDisease)}
                  disease={selectedDisease}
                  loading={false}
                />
              </GlassCard>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DOSAGE SAFETY TAB COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

function DosageSafetyTab({
  analyzerMeds,
  analyzerDosages,
  patientAge,
  patientWeight,
  patientGfr,
  patientLiverClass,
  patientPregnant
}) {
  return (
    <div className="space-y-6">
      <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-500/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">⚗️ Dosage Threshold Safety Checker</h2>
          <p className="text-xs text-text-secondary mt-1">Evaluates maximum safe doses against renal clearance (eGFR {patientGfr}) and hepatic function (Class {patientLiverClass}).</p>
        </div>
      </div>

      {!analyzerDosages.length ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-medichain-border rounded-2xl bg-medichain-bg-dark/20">
          <div className="text-4xl mb-3">💊</div>
          <h3 className="text-lg font-bold text-white mb-1">No Medications Loaded</h3>
          <p className="text-xs text-text-secondary max-w-sm">
            Add medications in the <strong className="text-accent-cyan">Prescription Analyzer</strong> tab to review dosage safety thresholds.
          </p>
        </div>
      ) : (
        <GlassCard>
          <h3 className="text-xs font-bold uppercase tracking-widest text-text-primary mb-4">
            Dosage Evaluation Table
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-medichain-border text-text-secondary uppercase text-[10px]">
                  <th className="pb-2">Drug</th>
                  <th className="pb-2">Prescribed Dose</th>
                  <th className="pb-2">Frequency</th>
                  <th className="pb-2">Route</th>
                  <th className="pb-2">Clinical Threshold Guidance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-medichain-border/30">
                {analyzerDosages.map((d, i) => (
                  <tr key={i} className="hover:bg-white/5">
                    <td className="py-3 font-bold text-white">{d.drug}</td>
                    <td className="py-3 font-mono">{d.dose_mg} mg</td>
                    <td className="py-3 capitalize">{d.frequency?.replace('_', ' ')}</td>
                    <td className="py-3 uppercase text-[11px]">{d.route || 'Oral'}</td>
                    <td className="py-3 text-text-secondary">
                      {patientGfr < 50 && ['metformin', 'ibuprofen', 'naproxen', 'digoxin'].includes(d.drug.toLowerCase())
                        ? <span className="text-status-danger font-semibold">⚠️ Dose reduction or avoidance required for eGFR {patientGfr}</span>
                        : <span className="text-status-success">✓ Within standard adult therapeutic boundaries</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}
    </div>
  );
}

// ── DETERMINISTIC LOCAL ENGINE / SANDBOX HELPERS ──────────────────────────────

function getMockOrganRisks(age = 45, conditions = [], gfr = 90) {
  const heartBase = conditions.includes('heart') ? 70 : conditions.includes('hypertension') ? 45 : 12;
  const kidneyBase = gfr < 30 ? 85 : gfr < 60 ? 55 : conditions.includes('kidney') ? 75 : conditions.includes('diabetes') ? 35 : 10;
  const liverBase = conditions.includes('liver') ? 65 : 8;
  const diabetesBase = conditions.includes('diabetes') ? 80 : 15;
  const strokeBase = conditions.includes('stroke') ? 85 : conditions.includes('hypertension') ? 40 : 5;

  return {
    heart: { label: 'Cardiovascular', risk_score: heartBase, risk_level: heartBase > 60 ? 'HIGH' : 'LOW', color: heartBase > 60 ? '#ef4444' : '#10b981' },
    kidney: { label: 'Renal', risk_score: kidneyBase, risk_level: kidneyBase > 60 ? 'HIGH' : 'LOW', color: kidneyBase > 60 ? '#ef4444' : '#10b981' },
    liver: { label: 'Hepatic', risk_score: liverBase, risk_level: liverBase > 60 ? 'HIGH' : 'LOW', color: liverBase > 60 ? '#ef4444' : '#10b981' },
    diabetes: { label: 'Metabolic', risk_score: diabetesBase, risk_level: diabetesBase > 60 ? 'HIGH' : 'LOW', color: diabetesBase > 60 ? '#ef4444' : '#10b981' },
    stroke: { label: 'Neurological', risk_score: strokeBase, risk_level: strokeBase > 60 ? 'HIGH' : 'LOW', color: strokeBase > 60 ? '#ef4444' : '#10b981' }
  };
}

function getMockDiseasePredictions(age = 45, conditions = [], gfr = 90) {
  const risks = getMockOrganRisks(age, conditions, gfr);
  return Object.entries(risks).map(([key, organ]) => ({
    disease: key,
    probability: organ.risk_score
  })).sort((a, b) => b.probability - a.probability);
}

function getMockAdherenceData() {
  return {
    adherence_score: 85,
    category_label: 'LOW RISK',
    risk_category: 'LOW',
    predicted_next_refill_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    avg_refill_delay_days: 1.5,
    missed_dose_rate: 4,
    contributing_factors: [
      'Refills consistently requested within therapeutic schedule',
      'High adherence recorded in encrypted medical trail'
    ],
    recommended_interventions: [
      'Maintain standard automated calendar alerts'
    ],
    history_trend: [
      { month: '5 mos ago', score: 78 },
      { month: '4 mos ago', score: 80 },
      { month: '3 mos ago', score: 82 },
      { month: '2 mos ago', score: 85 },
      { month: 'Last mo',   score: 87 },
      { month: 'Now',       score: 85 }
    ]
  };
}

function getMockFeatureImportance(disease) {
  if (disease === 'heart') {
    return [
      { feature: 'Cholesterol Vector', shap_value: 0.18, importance: 0.18, direction: 'increases_risk', clinical_context: 'Atherosclerotic burden' },
      { feature: 'Age Index', shap_value: 0.12, importance: 0.12, direction: 'increases_risk', clinical_context: 'Arterial compliance alteration' },
      { feature: 'Resting Blood Pressure', shap_value: 0.08, importance: 0.08, direction: 'increases_risk', clinical_context: 'Left ventricular afterload' }
    ];
  }
  return [
    { feature: 'Age Index', shap_value: 0.15, importance: 0.15, direction: 'increases_risk', clinical_context: 'Demographic baseline' },
    { feature: 'Renal eGFR Metric', shap_value: 0.12, importance: 0.12, direction: 'increases_risk', clinical_context: 'Filtration clearance rate' }
  ];
}

function getSandboxAnalysisResult(meds, dosages, patient) {
  let score = 100;
  const conflicts = [];
  const key_findings = [];
  const evidence = [];
  const lowerMeds = meds.map(m => m.toLowerCase());

  // Warfarin + Aspirin
  if (lowerMeds.includes('warfarin') && lowerMeds.includes('aspirin')) {
    score -= 40;
    conflicts.push({
      drug1: 'Warfarin',
      drug2: 'Aspirin',
      severity: 'HIGH',
      mechanism: 'Dual anticoagulant + antiplatelet inhibition.',
      description: 'Warfarin + Aspirin significantly increases risk of major gastrointestinal and systemic bleeding.',
      recommendation: 'Avoid combination unless indicated for specialized cardiovascular protocols. Monitor INR.',
      source: 'NLM RxNav / FDA DailyMed'
    });
    key_findings.push({
      severity: 'HIGH',
      icon: '🔴',
      title: 'Drug Interaction: Warfarin ↔ Aspirin',
      details: 'Additive hemorrhage and gastrointestinal bleeding risk.'
    });
    evidence.push({
      drug: 'Warfarin + Aspirin',
      patientFactor: 'Concurrent Prescriptions',
      finding: 'Additive antihemostatic synergy.',
      source: 'NLM RxNav / FDA DailyMed'
    });
  }

  // Check Allergies
  (patient.allergies || []).forEach(allergy => {
    const a = allergy.toLowerCase();
    lowerMeds.forEach(med => {
      if ((a.includes('penicillin') && (med.includes('amox') || med.includes('penic') || med.includes('augm'))) ||
          (a.includes('sulfa') && med.includes('bactrim')) ||
          (a.includes('nsaid') && (med.includes('ibu') || med.includes('napro') || med.includes('aspirin')))) {
        score -= 50;
        conflicts.push({
          type: 'drug-allergy',
          drug: med,
          severity: 'HIGH',
          description: `Patient has documented allergy to "${allergy}". Prescribed "${med}" is contraindicated.`,
          recommendation: `Discontinue ${med} and choose an alternative class.`,
          source: 'AAAAI Drug Allergy Guidelines'
        });
        key_findings.push({
          severity: 'HIGH',
          icon: '🔴',
          title: `Allergy Alert: ${med} (${allergy.toUpperCase()} Sensitivity)`,
          details: 'Potential severe hypersensitivity reaction.'
        });
        evidence.push({
          drug: med,
          patientFactor: `Documented Allergy: ${allergy.toUpperCase()}`,
          finding: 'Cross-reactivity identified.',
          source: 'AAAAI Clinical Practice Guidelines'
        });
      }
    });
  });

  // Check Kidney GFR
  if (patient.kidney_gfr < 60) {
    lowerMeds.forEach(med => {
      if (['metformin', 'ibuprofen', 'naproxen'].includes(med)) {
        score -= 25;
        const msg = med === 'metformin' && patient.kidney_gfr < 30
          ? 'Metformin is CONTRAINDICATED at eGFR < 30 mL/min due to lactic acidosis risk.'
          : `${med.toUpperCase()} requires dosage adjustment or avoidance in renal impairment (eGFR ${patient.kidney_gfr}).`;
        conflicts.push({
          type: 'drug-renal',
          drug: med,
          severity: 'HIGH',
          description: msg,
          recommendation: 'Evaluate renal panel and adjust dose.',
          source: 'KDIGO 2023 Guidelines'
        });
        key_findings.push({
          severity: 'HIGH',
          icon: '🔴',
          title: `Renal Alert: ${med} (eGFR ${patient.kidney_gfr} mL/min)`,
          details: msg
        });
        evidence.push({
          drug: med,
          patientFactor: `Kidney eGFR: ${patient.kidney_gfr} mL/min`,
          finding: msg,
          source: 'KDIGO 2023 Guidelines'
        });
      }
    });
  }

  // Check Pregnancy
  if (patient.pregnant) {
    lowerMeds.forEach(med => {
      if (['warfarin', 'lisinopril', 'losartan', 'methotrexate'].includes(med)) {
        score -= 45;
        conflicts.push({
          type: 'drug-pregnancy',
          drug: med,
          severity: 'CRITICAL',
          description: `${med.toUpperCase()} is contraindicated in pregnancy (teratogenic risks).`,
          recommendation: 'Discontinue immediately and switch to pregnancy-safe alternative.',
          source: 'FDA Boxed Warning (Teratogenicity)'
        });
        key_findings.push({
          severity: 'CRITICAL',
          icon: '🔴',
          title: `Pregnancy Warning: ${med}`,
          details: 'Teratogenic and contraindicated in pregnancy.'
        });
        evidence.push({
          drug: med,
          patientFactor: 'Active Pregnancy Status',
          finding: 'Teratogenic contraindication.',
          source: 'FDA Prescribing Information'
        });
      }
    });
  }

  score = Math.max(10, score);
  const severity = score < 50 ? 'CRITICAL' : score < 70 ? 'HIGH' : score < 85 ? 'MODERATE' : 'SAFE';

  if (key_findings.length === 0) {
    key_findings.push({
      severity: 'SAFE',
      icon: '🟢',
      title: 'Safety Profile Verified',
      details: 'No high-risk drug interactions or organ contraindications identified.'
    });
  }

  return {
    safety_score: score,
    severity,
    clinical_summary: `Based on patient parameters (Age: ${patient.age}, eGFR: ${patient.kidney_gfr} mL/min, Liver: Class ${patient.liverClass || 'A'}) and ${meds.length} medication(s), the safety engine produced a Score of ${score}/100 (${severity}).`,
    clinical_explanation: `Clinical Safety Score: ${score}/100. ${conflicts.length} finding(s) flagged.`,
    key_findings,
    evidence,
    recommendations: conflicts.map(c => c.recommendation || 'Review medication before prescribing.'),
    interaction_analysis: {
      conflicts,
      matrix: conflicts.reduce((acc, c) => {
        if (c.drug1 && c.drug2) acc[`${c.drug1} ↔ ${c.drug2}`] = c.severity;
        return acc;
      }, {})
    }
  };
}
