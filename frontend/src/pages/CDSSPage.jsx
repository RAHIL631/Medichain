// frontend/src/pages/CDSSPage.jsx
// Main Clinical Decision Support System (AI-CDSS) Page.
// Tabs: Prescription Analyzer, Health Risk Profile, Adherence Analytics, Explainability.

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

  // ── PATIENT CONTEXT STATE ──────────────────────────────────────────────────
  const [patientAge, setPatientAge] = useState(45);
  const [patientWeight, setPatientWeight] = useState(70);
  const [patientGfr, setPatientGfr] = useState(90);
  const [patientLiverScore, setPatientLiverScore] = useState(0);
  const [patientPregnant, setPatientPregnant] = useState(false);
  const [patientAllergies, setPatientAllergies] = useState([]);
  const [newAllergy, setNewAllergy] = useState('');
  const [patientChronicConditions, setPatientChronicConditions] = useState([]);

  // Chronic conditions options
  const CHRONIC_CONDITIONS = ['heart', 'kidney', 'liver', 'diabetes', 'stroke', 'hypertension'];

  // Initialize patient context from logged-in patient
  useEffect(() => {
    if (isPatient && user) {
      if (user.dateOfBirth) {
        const age = new Date().getFullYear() - new Date(user.dateOfBirth).getFullYear();
        setPatientAge(age);
      }
      if (user.allergies) {
        setPatientAllergies(user.allergies);
      }
      if (user.chronicConditions) {
        setPatientChronicConditions(user.chronicConditions);
      }
    }
  }, [isPatient, user]);

  // ── TAB 1: PRESCRIPTION ANALYZER STATE ──────────────────────────────────────
  const [analyzerMeds, setAnalyzerMeds] = useState([]);
  const [medInput, setMedInput] = useState('');
  const [doseInput, setDoseInput] = useState('');
  const [freqInput, setFreqInput] = useState('once_daily');
  const [analyzerDosages, setAnalyzerDosages] = useState([]);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [loadingAnalyze, setLoadingAnalyze] = useState(false);
  const [errorAnalyze, setErrorAnalyze] = useState('');

  // ── TAB 2: ORGAN RISK STATE ─────────────────────────────────────────────────
  const [organRisks, setOrganRisks] = useState(null);
  const [diseasePredictions, setDiseasePredictions] = useState([]);
  const [loadingRisks, setLoadingRisks] = useState(false);
  const [errorRisks, setErrorRisks] = useState('');

  // ── TAB 3: ADHERENCE STATE ──────────────────────────────────────────────────
  const [adherenceData, setAdherenceData] = useState(null);
  const [loadingAdherence, setLoadingAdherence] = useState(false);
  const [errorAdherence, setErrorAdherence] = useState('');

  // ── TAB 4: SHAP EXPLAINABILITY STATE ────────────────────────────────────────
  const [explainData, setExplainData] = useState(null);
  const [selectedDisease, setSelectedDisease] = useState('heart');
  const [loadingExplain, setLoadingExplain] = useState(false);
  const [errorExplain, setErrorExplain] = useState('');

  // ── TAB 5: DOSAGE SAFETY ML STATE ───────────────────────────────────────────
  const [dosageSafetyResult, setDosageSafetyResult] = useState(null);
  const [loadingDosageSafety, setLoadingDosageSafety] = useState(false);
  const [errorDosageSafety, setErrorDosageSafety] = useState('');
  const [mlStatus, setMlStatus] = useState(null);

  // ── PATIENT DATA AUTO-FETCH ON MOUNT ────────────────────────────────────────
  const fetchPatientData = useCallback(async () => {
    if (!isPatient) return;
    
    // Fetch risks
    setLoadingRisks(true);
    setErrorRisks('');
    try {
      const { data } = await api.post('/ai/cdss/risks', {
        age: patientAge,
        chronicConditions: patientChronicConditions
      });
      setOrganRisks(data.organ_risks || {});
      setDiseasePredictions(data.ranked_diseases || []);
    } catch (err) {
      setErrorRisks(err.message || 'Failed to fetch health risks');
      // Set mock fallback
      setOrganRisks(getMockOrganRisks());
      setDiseasePredictions(getMockDiseasePredictions());
    } finally {
      setLoadingRisks(false);
    }

    // Fetch adherence
    setLoadingAdherence(true);
    setErrorAdherence('');
    try {
      const { data } = await api.post('/ai/cdss/adherence', {});
      setAdherenceData(data);
    } catch (err) {
      setErrorAdherence(err.message || 'Failed to fetch adherence forecast');
      setAdherenceData(getMockAdherenceData());
    } finally {
      setLoadingAdherence(false);
    }

    // Fetch SHAP explanations
    setLoadingExplain(true);
    setErrorExplain('');
    try {
      const { data } = await api.post('/ai/cdss/explain', {
        age: patientAge,
        chronicConditions: patientChronicConditions
      });
      setExplainData(data.explanations || {});
    } catch (err) {
      setErrorExplain(err.message || 'Failed to fetch explanations');
    } finally {
      setLoadingExplain(false);
    }
  }, [isPatient, patientAge, patientChronicConditions]);

  useEffect(() => {
    if (isPatient) {
      fetchPatientData();
    }
  }, [fetchPatientData, isPatient]);

  // ── ACTIONS ────────────────────────────────────────────────────────────────

  // Tab 1: Manual Drug Adder
  const handleAddMed = (e) => {
    e.preventDefault();
    const med = medInput.trim();
    if (!med) return;

    if (!analyzerMeds.includes(med)) {
      setAnalyzerMeds([...analyzerMeds, med]);
      
      const newDose = {
        drug: med,
        dose_mg: parseFloat(doseInput) || 500,
        frequency: freqInput
      };
      setAnalyzerDosages([...analyzerDosages, newDose]);
    }
    setMedInput('');
    setDoseInput('');
    setFreqInput('once_daily');
  };

  const handleRemoveMed = (med) => {
    setAnalyzerMeds(analyzerMeds.filter(m => m !== med));
    setAnalyzerDosages(analyzerDosages.filter(d => d.drug !== med));
  };

  // Run full prescription pipeline
  const runPrescriptionAnalysis = async () => {
    if (analyzerMeds.length === 0) {
      setErrorAnalyze('Please add at least one medication to analyze.');
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
        liver_score: patientLiverScore,
        pregnant: patientPregnant,
        allergies: patientAllergies,
        chronicConditions: patientChronicConditions
      }
    };

    try {
      const { data } = await api.post('/ai/cdss/analyze', payload);
      setAnalysisResult(data);
    } catch (err) {
      setErrorAnalyze(err.message || 'Prescription analysis failed.');
      // Provide sandbox clinical fallback so user can interact even if local AI service is down
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

      // Prepopulate dosages for new meds
      const newDosages = [...analyzerDosages];
      ocrResult.medications.forEach(m => {
        if (!newDosages.find(d => d.drug === m)) {
          newDosages.push({
            drug: m,
            dose_mg: 500,
            frequency: 'once_daily'
          });
        }
      });
      setAnalyzerDosages(newDosages);
    }
  };

  // Run doctor custom health simulation
  const simulateDoctorAssessment = async () => {
    setLoadingRisks(true);
    setErrorRisks('');
    try {
      const { data } = await api.post('/ai/cdss/risks', {
        age: patientAge,
        chronicConditions: patientChronicConditions
      });
      setOrganRisks(data.organ_risks || {});
      setDiseasePredictions(data.ranked_diseases || []);
    } catch (err) {
      // Offline fallback
      setOrganRisks(getMockOrganRisks(patientAge, patientChronicConditions));
      setDiseasePredictions(getMockDiseasePredictions(patientAge, patientChronicConditions));
    } finally {
      setLoadingRisks(false);
    }

    setLoadingExplain(true);
    setErrorExplain('');
    try {
      const { data } = await api.post('/ai/cdss/explain', {
        age: patientAge,
        chronicConditions: patientChronicConditions
      });
      setExplainData(data.explanations || {});
    } catch (err) {
      setErrorExplain(err.message || 'Failed to fetch explanations');
    } finally {
      setLoadingExplain(false);
    }
  };

  // Allergy list management
  const addAllergy = (e) => {
    e.preventDefault();
    if (newAllergy.trim() && !patientAllergies.includes(newAllergy.trim())) {
      setPatientAllergies([...patientAllergies, newAllergy.trim()]);
      setNewAllergy('');
    }
  };

  const removeAllergy = (allergy) => {
    setPatientAllergies(patientAllergies.filter(a => a !== allergy));
  };

  // Toggle chronic conditions
  const toggleChronicCondition = (cond) => {
    if (patientChronicConditions.includes(cond)) {
      setPatientChronicConditions(patientChronicConditions.filter(c => c !== cond));
    } else {
      setPatientChronicConditions([...patientChronicConditions, cond]);
    }
  };

  return (
    <DashboardLayout role={userRoleText} navItems={navItems}>
      <div className="space-y-6">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-white flex items-center gap-2">
              🧠 Advanced AI Clinical Decision Support
            </h1>
            <p className="text-text-secondary mt-1">
              Multi-drug interaction indexing, patient-specific safety checking, and ML-powered diagnostic scoring.
            </p>
          </div>

          {/* Trigger refresh for patient */}
          {isPatient && (
            <FuturisticButton onClick={fetchPatientData} disabled={loadingRisks} variant="secondary">
              {loadingRisks ? 'Syncing...' : '↻ Refresh Health Profile'}
            </FuturisticButton>
          )}
        </div>

        {/* ── SECTION: PATIENT PROFILE CONTEXT ────────────────────────────────────── */}
        <GlassCard className="border-accent-indigo/20">
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-medichain-border">
            <h3 className="text-sm font-bold uppercase tracking-widest text-accent-indigo flex items-center gap-2">
              👤 Clinical Patient Context
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded bg-accent-indigo/20 border border-accent-indigo/40 text-accent-cyan font-mono font-bold uppercase">
              {isPatient ? 'Read Only (From Ledger)' : 'Dynamic Simulator'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Age */}
            <div>
              <label className="block text-[10px] uppercase text-text-secondary mb-1">Age (Years)</label>
              <input
                type="number"
                disabled={isPatient}
                value={patientAge}
                onChange={e => setPatientAge(parseInt(e.target.value) || 0)}
                className="w-full bg-medichain-bg-dark border border-medichain-border rounded-lg px-3 py-2 text-sm text-white focus:border-accent-cyan outline-none disabled:opacity-60"
              />
            </div>

            {/* Weight */}
            <div>
              <label className="block text-[10px] uppercase text-text-secondary mb-1">Weight (kg)</label>
              <input
                type="number"
                disabled={isPatient}
                value={patientWeight}
                onChange={e => setPatientWeight(parseInt(e.target.value) || 0)}
                className="w-full bg-medichain-bg-dark border border-medichain-border rounded-lg px-3 py-2 text-sm text-white focus:border-accent-cyan outline-none disabled:opacity-60"
              />
            </div>

            {/* Kidney GFR */}
            <div>
              <label className="block text-[10px] uppercase text-text-secondary mb-1">Kidney GFR</label>
              <input
                type="number"
                disabled={isPatient}
                value={patientGfr}
                onChange={e => setPatientGfr(parseInt(e.target.value) || 0)}
                placeholder="e.g. 90"
                className="w-full bg-medichain-bg-dark border border-medichain-border rounded-lg px-3 py-2 text-sm text-white focus:border-accent-cyan outline-none disabled:opacity-60"
              />
            </div>

            {/* Liver score */}
            <div>
              <label className="block text-[10px] uppercase text-text-secondary mb-1">Liver Child-Pugh Score</label>
              <select
                disabled={isPatient}
                value={patientLiverScore}
                onChange={e => setPatientLiverScore(parseInt(e.target.value) || 0)}
                className="w-full bg-medichain-bg-dark border border-medichain-border rounded-lg px-3 py-2 text-sm text-white focus:border-accent-cyan outline-none disabled:opacity-60"
              >
                <option value={0}>Class A (Normal)</option>
                <option value={5}>Class B (Moderate)</option>
                <option value={10}>Class C (Severe)</option>
              </select>
            </div>

            {/* Pregnancy */}
            <div>
              <label className="block text-[10px] uppercase text-text-secondary mb-1">Pregnancy Status</label>
              <select
                disabled={isPatient}
                value={patientPregnant ? 'yes' : 'no'}
                onChange={e => setPatientPregnant(e.target.value === 'yes')}
                className="w-full bg-medichain-bg-dark border border-medichain-border rounded-lg px-3 py-2 text-sm text-white focus:border-accent-cyan outline-none disabled:opacity-60"
              >
                <option value="no">Not Pregnant</option>
                <option value="yes">Pregnant</option>
              </select>
            </div>

            {/* Simulated Action for Doctors */}
            {!isPatient && (
              <div className="flex items-end">
                <FuturisticButton onClick={simulateDoctorAssessment} fullWidth variant="secondary">
                  🧬 Re-Assess Risks
                </FuturisticButton>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 pt-4 border-t border-medichain-border">
            {/* Allergies */}
            <div>
              <label className="block text-[10px] uppercase text-text-secondary mb-2">Drug Allergies</label>
              {!isPatient && (
                <form onSubmit={addAllergy} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newAllergy}
                    onChange={e => setNewAllergy(e.target.value)}
                    placeholder="e.g. Penicillin"
                    className="flex-grow bg-medichain-bg-dark border border-medichain-border rounded-lg px-3 py-1.5 text-xs text-white focus:border-accent-cyan outline-none"
                  />
                  <button type="submit" className="px-3 bg-medichain-surface border border-medichain-border rounded-lg text-white font-bold hover:bg-medichain-border text-xs">+</button>
                </form>
              )}
              <div className="flex flex-wrap gap-1.5 min-h-[32px]">
                {patientAllergies.length === 0 ? (
                  <span className="text-xs text-text-secondary my-auto ml-1 italic">No allergies reported.</span>
                ) : (
                  patientAllergies.map((allergy, i) => (
                    <span key={i} className="flex items-center gap-1.5 px-2.5 py-0.5 bg-status-danger/10 border border-status-danger/30 rounded-md text-xs text-status-danger uppercase font-bold">
                      {allergy}
                      {!isPatient && (
                        <button type="button" onClick={() => removeAllergy(allergy)} className="hover:text-white">×</button>
                      )}
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Chronic Conditions */}
            <div>
              <label className="block text-[10px] uppercase text-text-secondary mb-2">Chronic Conditions</label>
              <div className="flex flex-wrap gap-2">
                {CHRONIC_CONDITIONS.map((cond) => {
                  const active = patientChronicConditions.includes(cond);
                  return (
                    <button
                      key={cond}
                      disabled={isPatient}
                      type="button"
                      onClick={() => toggleChronicCondition(cond)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all border ${
                        active
                          ? 'bg-accent-indigo/20 border-accent-indigo/60 text-accent-cyan shadow-[0_0_10px_rgba(99,102,241,0.2)]'
                          : 'bg-medichain-bg-dark/40 border-medichain-border text-text-secondary hover:text-white'
                      }`}
                    >
                      {cond}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </GlassCard>

        {/* ── TAB SELECTOR ───────────────────────────────────────────────────────── */}
        <div className="flex border-b border-medichain-border gap-4 overflow-x-auto">
          {[
            { id: 'analyzer',      label: '🔍 Prescription Analyzer' },
            { id: 'dosage-safety', label: '⚗️ ML Dosage Safety' },
            { id: 'risks',         label: '🫁 Organ Health Risks' },
            { id: 'adherence',     label: '🗓️ Refill Adherence' },
            { id: 'explain',       label: '🧠 AI Explainability' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-4 px-2 font-display text-sm font-bold border-b-2 transition-all uppercase tracking-wide whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-accent-cyan text-accent-cyan font-extrabold shadow-[0_4px_12px_-4px_rgba(34,211,238,0.4)]'
                  : 'border-transparent text-text-secondary hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── TAB CONTENT ────────────────────────────────────────────────────────── */}
        
        {/* TAB 1: PRESCRIPTION ANALYZER */}
        {activeTab === 'analyzer' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left panels: Input */}
            <div className="lg:col-span-1 space-y-6">
              {/* Form panel */}
              <GlassCard>
                <h3 className="text-lg font-bold text-white mb-4">Medications Profile</h3>
                
                <form onSubmit={handleAddMed} className="space-y-4">
                  <div>
                    <label className="block text-xs uppercase text-text-secondary mb-1">Medication Name</label>
                    <input
                      type="text"
                      value={medInput}
                      onChange={e => setMedInput(e.target.value)}
                      placeholder="e.g. Warfarin"
                      className="w-full bg-medichain-bg-dark border border-medichain-border rounded-lg px-3 py-2 text-sm text-white focus:border-accent-cyan outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs uppercase text-text-secondary mb-1">Dose (mg)</label>
                      <input
                        type="number"
                        value={doseInput}
                        onChange={e => setDoseInput(e.target.value)}
                        placeholder="e.g. 5"
                        className="w-full bg-medichain-bg-dark border border-medichain-border rounded-lg px-3 py-2 text-sm text-white focus:border-accent-cyan outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs uppercase text-text-secondary mb-1">Frequency</label>
                      <select
                        value={freqInput}
                        onChange={e => setFreqInput(e.target.value)}
                        className="w-full bg-medichain-bg-dark border border-medichain-border rounded-lg px-3 py-2 text-sm text-white focus:border-accent-cyan outline-none"
                      >
                        <option value="once_daily">Once Daily</option>
                        <option value="twice_daily">Twice Daily</option>
                        <option value="three_times_daily">Three Times Daily</option>
                        <option value="four_times_daily">Four Times Daily</option>
                        <option value="as_needed">As Needed</option>
                      </select>
                    </div>
                  </div>

                  <FuturisticButton type="submit" fullWidth variant="secondary">
                    ＋ Add Medication
                  </FuturisticButton>
                </form>

                {/* Added Meds List */}
                <div className="mt-6">
                  <label className="block text-xs uppercase text-text-secondary mb-2">Prescription Ingredients</label>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                    {analyzerMeds.length === 0 ? (
                      <div className="text-center py-6 text-xs text-text-secondary border border-dashed border-medichain-border rounded-xl bg-medichain-bg-dark/20">
                        No medications added yet.
                      </div>
                    ) : (
                      analyzerDosages.map((med, i) => (
                        <div key={i} className="flex justify-between items-center p-3 bg-medichain-bg-dark/50 border border-medichain-border rounded-xl">
                          <div>
                            <span className="font-bold text-white text-sm">{med.drug}</span>
                            <span className="text-xs text-text-secondary ml-2">
                              ({med.dose_mg}mg, {med.frequency.replace('_', ' ')})
                            </span>
                          </div>
                          <button
                            onClick={() => handleRemoveMed(med.drug)}
                            className="text-status-danger hover:text-white text-sm font-bold px-2 py-1 rounded"
                          >
                            ✕
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Submit analyze */}
                {analyzerMeds.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-medichain-border">
                    <FuturisticButton
                      onClick={runPrescriptionAnalysis}
                      disabled={loadingAnalyze}
                      fullWidth
                    >
                      {loadingAnalyze ? 'Running Clinical Analysis...' : '🔍 Analyze Prescription'}
                    </FuturisticButton>
                    {errorAnalyze && (
                      <p className="text-[10px] text-status-danger bg-status-danger/10 border border-status-danger/30 rounded-lg p-2.5 mt-3 font-bold">
                        {errorAnalyze} (Running in Sandbox mode)
                      </p>
                    )}
                  </div>
                )}
              </GlassCard>

              {/* OCR panel */}
              <GlassCard glowBorder={true}>
                <h3 className="text-sm font-bold uppercase tracking-widest text-accent-cyan mb-3">
                  📄 OCR Prescription Importer
                </h3>
                <PrescriptionOCRPanel onMedicationsExtracted={handleOcrExtracted} />
              </GlassCard>
            </div>

            {/* Right panels: Results */}
            <div className="lg:col-span-2 space-y-6">
              {!analysisResult && !loadingAnalyze && (
                <GlassCard className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 bg-medichain-surface rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-text-secondary opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Prescription Safety Audit</h3>
                  <p className="text-sm text-text-secondary max-w-sm">
                    Enter medications manually or drop a prescription image above, then click Analyze to scan for multi-drug interactions and dosage alerts.
                  </p>
                </GlassCard>
              )}

              {loadingAnalyze && (
                <GlassCard className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-12 h-12 border-4 border-accent-cyan border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="text-sm text-text-secondary font-mono tracking-widest animate-pulse">
                    RUNNING DRUG SAFETY MATRIX...
                  </p>
                </GlassCard>
              )}

              {analysisResult && !loadingAnalyze && (
                <div className="space-y-6 animate-fade-in">
                  {/* Alert banner */}
                  <CDSSAlertBanner analysis={analysisResult} />

                  {/* Scorer Gauge & Matrix side-by-side */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <GlassCard className="md:col-span-1 flex flex-col justify-center items-center">
                      <SafetyScoreGauge
                        score={analysisResult.safety_score}
                        severity={analysisResult.severity}
                        size={170}
                      />
                    </GlassCard>

                    <GlassCard className="md:col-span-2">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-text-primary mb-3">
                        ⚡ Interaction Severity Matrix
                      </h4>
                      <DrugInteractionMatrix
                        medications={analysisResult.medications}
                        interactionMatrix={analysisResult.interaction_analysis?.matrix || {}}
                        conflicts={analysisResult.interaction_analysis?.conflicts || []}
                      />
                    </GlassCard>
                  </div>

                  {/* Dosage warnings details */}
                  <GlassCard>
                    <h4 className="text-xs font-bold uppercase tracking-widest text-text-primary mb-4">
                      💊 Patient Dosage Threshold Audit
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-medichain-border text-text-secondary uppercase">
                            <th className="pb-2">Medication</th>
                            <th className="pb-2">Prescribed Dose</th>
                            <th className="pb-2">Status</th>
                            <th className="pb-2">Clinical Warning / Reason</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-medichain-border/30">
                          {analysisResult.dosage_analysis?.map((check, idx) => (
                            <tr key={idx} className="hover:bg-white/5 transition-colors">
                              <td className="py-3 font-bold text-white">{check.drug}</td>
                              <td className="py-3 font-mono text-text-secondary">
                                {check.prescribed_dose || 'N/A'} {check.prescribed_frequency ? `(${check.prescribed_frequency.replace('_', ' ')})` : ''}
                              </td>
                              <td className="py-3">
                                <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold ${
                                  check.safe
                                    ? 'bg-status-success/15 text-status-success'
                                    : check.severity === 'CRITICAL' || check.severity === 'HIGH'
                                    ? 'bg-status-danger/15 text-status-danger'
                                    : 'bg-status-warning/15 text-status-warning'
                                }`}>
                                  {check.safe ? 'SAFE' : check.severity || 'WARNING'}
                                </span>
                              </td>
                              <td className="py-3 text-text-secondary leading-relaxed">{check.reason || 'Check passed, dosage is within therapeutic ranges.'}</td>
                            </tr>
                          ))}
                          {(!analysisResult.dosage_analysis || analysisResult.dosage_analysis.length === 0) && (
                            <tr>
                              <td colSpan="4" className="py-4 text-center text-text-secondary italic">
                                No dosage analyses performed. Add doses above to run threshold checker.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </GlassCard>

                  {/* Multi-Drug Engine results */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Alternatives Card */}
                    <GlassCard>
                      <h4 className="text-xs font-bold uppercase tracking-widest text-accent-cyan mb-4 flex items-center gap-2">
                        <span>🔄</span> Safer Alternative Medications
                      </h4>
                      <div className="space-y-4">
                        {(!analysisResult.alternative_medicines || analysisResult.alternative_medicines.length === 0) ? (
                          <p className="text-xs text-text-secondary italic">No drug conflicts require alternatives.</p>
                        ) : (
                          analysisResult.alternative_medicines.map((item, idx) => (
                            <div key={idx} className="p-3 bg-medichain-bg-dark/40 border border-medichain-border/30 rounded-xl space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-white text-xs">Conflict with {item.drug}</span>
                                <span className="text-[10px] text-accent-cyan font-semibold">Suggested Alternatives</span>
                              </div>
                              <p className="text-[11px] text-text-secondary leading-relaxed">{item.reason}</p>
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {item.alternatives.map((alt, ai) => (
                                  <span key={ai} className="px-2 py-0.5 bg-accent-cyan/10 border border-accent-cyan/30 rounded text-[10px] text-accent-cyan font-bold uppercase">
                                    {alt}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </GlassCard>

                    {/* Patient Contraindications Card */}
                    <GlassCard>
                      <h4 className="text-xs font-bold uppercase tracking-widest text-status-warning mb-4 flex items-center gap-2">
                        <span>⚠️</span> Patient Disease/Allergy Contraindications
                      </h4>
                      <div className="space-y-3">
                        {(!analysisResult.patient_contraindications || analysisResult.patient_contraindications.length === 0) ? (
                          <p className="text-xs text-text-secondary italic">No patient contraindications flagged.</p>
                        ) : (
                          analysisResult.patient_contraindications.map((contra, idx) => (
                            <div key={idx} className="p-3 bg-status-danger/5 border border-status-danger/20 rounded-xl space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-white text-xs">{contra.drug}</span>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                                  contra.severity === 'CRITICAL' ? 'bg-status-danger/20 text-status-danger' : 'bg-status-warning/20 text-status-warning'
                                }`}>
                                  {contra.severity}
                                </span>
                              </div>
                              <p className="text-[10px] text-text-secondary uppercase font-semibold">Condition: {contra.condition}</p>
                              <p className="text-[11px] text-text-secondary leading-relaxed">{contra.description}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </GlassCard>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Combination Analysis Card */}
                    <GlassCard>
                      <h4 className="text-xs font-bold uppercase tracking-widest text-accent-indigo mb-4 flex items-center gap-2">
                        <span>🧪</span> Cumulative Combination Toxicity
                      </h4>
                      <div className="space-y-3">
                        {(!analysisResult.combination_analysis || analysisResult.combination_analysis.length === 0) ? (
                          <p className="text-xs text-text-secondary italic">No overlapping drug class toxicities detected.</p>
                        ) : (
                          analysisResult.combination_analysis.map((combo, idx) => (
                            <div key={combo.name + idx} className="p-3 bg-medichain-bg-dark/40 border border-medichain-border/30 rounded-xl space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-white text-xs">{combo.name}</span>
                                <span className="text-[9px] px-2 py-0.5 bg-status-danger/10 text-status-danger rounded font-bold uppercase">{combo.severity}</span>
                              </div>
                              <p className="text-[11px] text-text-secondary leading-relaxed">{combo.description}</p>
                              <div className="text-[10px] text-text-secondary pt-1">
                                <span className="font-bold">Involved:</span> {combo.drugs_involved.join(', ')}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </GlassCard>

                    {/* Emergency Recommendations Card */}
                    <GlassCard className="border-status-danger/20">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-status-danger mb-4 flex items-center gap-2">
                        <span>🚨</span> Emergency Patient Recommendations
                      </h4>
                      <div className="space-y-2">
                        {(!analysisResult.emergency_recommendations || analysisResult.emergency_recommendations.length === 0) ? (
                          <p className="text-xs text-text-secondary italic">No emergency warnings triggered.</p>
                        ) : (
                          analysisResult.emergency_recommendations.map((rec, idx) => {
                            const isAlert = rec.includes('CRITICAL WARNING') || rec.includes('HIGH WARNING');
                            return (
                              <div key={idx} className={`p-3 rounded-xl border flex items-start gap-2.5 text-[11px] leading-relaxed ${
                                isAlert 
                                  ? 'bg-status-danger/10 border-status-danger/30 text-status-danger font-semibold' 
                                  : 'bg-medichain-bg-dark/40 border-medichain-border/40 text-text-secondary'
                              }`}>
                                <span className="text-xs">{isAlert ? '⚠️' : '🔔'}</span>
                                <div>{rec}</div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </GlassCard>
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
            patientLiverScore={patientLiverScore}
            patientPregnant={patientPregnant}
            dosageSafetyResult={dosageSafetyResult}
            setDosageSafetyResult={setDosageSafetyResult}
            loadingDosageSafety={loadingDosageSafety}
            setLoadingDosageSafety={setLoadingDosageSafety}
            errorDosageSafety={errorDosageSafety}
            setErrorDosageSafety={setErrorDosageSafety}
            mlStatus={mlStatus}
            setMlStatus={setMlStatus}
          />
        )}

        {/* TAB 2: ORGAN RISK PROFILE */}
        {activeTab === 'risks' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left side: Radar Chart */}
            <div className="lg:col-span-1 space-y-6">
              <GlassCard className="flex flex-col items-center">
                <h3 className="text-base font-bold text-white mb-4 text-center w-full pb-2 border-b border-medichain-border">
                  🫁 5-Organ Neural Risk Spectrum
                </h3>
                {loadingRisks ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <div className="w-8 h-8 border-4 border-accent-cyan border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs text-text-secondary">Assessing cardiovascular and hepatic pathways...</p>
                  </div>
                ) : (
                  <RiskRadarChart organRisks={organRisks || {}} />
                )}
              </GlassCard>
            </div>

            {/* Right side: Ranked diseases & urgent flags */}
            <div className="lg:col-span-2 space-y-6">
              {errorRisks && (
                <div className="p-4 rounded-xl bg-status-warning/10 border border-status-warning/30 text-status-warning text-sm flex items-center gap-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                  <span>{errorRisks} (Running in local Sandbox mode)</span>
                </div>
              )}

              {/* Disease Probability List */}
              <GlassCard>
                <h3 className="text-sm font-bold uppercase tracking-widest text-text-primary mb-4">
                  🔬 Ranked Disease Prediction List (XGBoost Classifier)
                </h3>
                {loadingRisks ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-10 bg-medichain-surface/50 border border-medichain-border rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {diseasePredictions?.map((d, idx) => {
                      const level = d.probability >= 70 ? 'CRITICAL'
                        : d.probability >= 45 ? 'HIGH'
                        : d.probability >= 20 ? 'MODERATE'
                        : 'LOW';
                      
                      const barColor = d.probability >= 70 ? 'bg-status-danger'
                        : d.probability >= 45 ? 'bg-status-warning'
                        : 'bg-accent-blue';

                      return (
                        <div key={idx} className="p-4 bg-medichain-bg-dark/50 border border-medichain-border rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex-grow">
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-bold text-white text-sm capitalize">{d.disease} Risk</span>
                              <span className="text-xs font-mono font-bold text-white">{d.probability.toFixed(1)}%</span>
                            </div>
                            <div className="h-2 bg-medichain-surface rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${d.probability}%` }} />
                            </div>
                          </div>

                          <div className="flex items-center gap-3 flex-shrink-0 justify-end">
                            <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold ${
                              level === 'CRITICAL' ? 'bg-status-danger/15 text-status-danger border border-status-danger/30'
                                : level === 'HIGH' ? 'bg-status-warning/15 text-status-warning border border-status-warning/30'
                                : 'bg-status-success/15 text-status-success border border-status-success/30'
                            }`}>
                              {level}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </GlassCard>

              {/* Recommendations and flags */}
              <GlassCard>
                <h3 className="text-sm font-bold uppercase tracking-widest text-accent-indigo mb-4">
                  💡 Clinical Risk Guidance & Interventions
                </h3>
                {loadingRisks ? (
                  <div className="h-20 bg-medichain-surface/50 rounded-xl animate-pulse" />
                ) : (
                  <div className="space-y-4">
                    {/* Urgent flags */}
                    {diseasePredictions?.some(d => d.probability >= 45) && (
                      <div className="p-4 bg-status-danger/10 border border-status-danger/30 rounded-xl text-status-danger text-xs font-semibold leading-relaxed flex items-start gap-2.5">
                        <span className="text-base">⚠️</span>
                        <div>
                          <strong>Urgent Clinical Warnings Triggered:</strong> Elevated risk flags identified.
                          Cardiovascular monitoring and metabolic GFR panel review suggested within 48 hours.
                        </div>
                      </div>
                    )}

                    <div>
                      <p className="text-xs text-text-secondary mb-2 uppercase font-bold">Suggested Monitoring Schedules</p>
                      <ul className="space-y-2">
                        <li className="flex items-start gap-2 text-xs text-text-secondary leading-relaxed">
                          <span className="text-accent-cyan mt-0.5 font-bold">›</span>
                          Schedule a serum creatinine laboratory test to review Kidney filtration stability.
                        </li>
                        <li className="flex items-start gap-2 text-xs text-text-secondary leading-relaxed">
                          <span className="text-accent-cyan mt-0.5 font-bold">›</span>
                          Daily blood pressure tracking is recommended. Target systolic threshold is &lt; 130 mmHg.
                        </li>
                        <li className="flex items-start gap-2 text-xs text-text-secondary leading-relaxed">
                          <span className="text-accent-cyan mt-0.5 font-bold">›</span>
                          Ensure glucose evaluations are captured fasting. Record levels on-chain for tracking.
                        </li>
                      </ul>
                    </div>
                  </div>
                )}
              </GlassCard>
            </div>
          </div>
        )}

        {/* TAB 3: ADHERENCE ANALYTICS */}
        {activeTab === 'adherence' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Timeline Area chart */}
            <div className="lg:col-span-2 space-y-6">
              <GlassCard>
                <h3 className="text-sm font-bold uppercase tracking-widest text-text-primary mb-4">
                  📈 Medication Adherence Trend Profile
                </h3>
                {loadingAdherence ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <div className="w-8 h-8 border-4 border-accent-cyan border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs text-text-secondary">Fetching refill intervals from medical ledger...</p>
                  </div>
                ) : (
                  <AdherenceTimeline
                    adherenceData={adherenceData}
                    predictedDate={adherenceData?.predicted_next_refill_date}
                  />
                )}
              </GlassCard>
            </div>

            {/* Metrics & Risk Category */}
            <div className="lg:col-span-1 space-y-6">
              {errorAdherence && (
                <div className="p-3 rounded-xl bg-status-warning/10 border border-status-warning/30 text-status-warning text-[10px] font-bold">
                  ⚠️ Adherence engine offline: {errorAdherence} (Sandbox loaded)
                </div>
              )}

              <GlassCard>
                <h3 className="text-sm font-bold uppercase tracking-widest text-accent-indigo mb-4">
                  🤖 ML Adherence Evaluation
                </h3>
                {loadingAdherence ? (
                  <div className="h-32 bg-medichain-surface/50 rounded-xl animate-pulse" />
                ) : (
                  <div className="space-y-4">
                    <div>
                      <span className="text-xs text-text-secondary uppercase">Risk Classification</span>
                      <div className="mt-1 font-display font-bold text-lg text-white">
                        {adherenceData?.risk_category === 'LOW' ? '🟢 Low Risk' : adherenceData?.risk_category === 'MEDIUM' ? '🟡 Medium Risk' : '🔴 High Refill Delay Risk'}
                      </div>
                    </div>

                    <div className="border-t border-medichain-border/50 pt-3">
                      <span className="text-[10px] text-text-secondary uppercase font-bold">ML Statistical Predictors</span>
                      <div className="grid grid-cols-2 gap-3 mt-2">
                        <div className="p-2.5 bg-medichain-bg-dark rounded-xl border border-medichain-border/30">
                          <p className="text-[9px] text-text-secondary uppercase">Refill Delay</p>
                          <p className="font-mono text-sm text-white font-bold">{adherenceData?.avg_refill_delay_days || 2} Days</p>
                        </div>
                        <div className="p-2.5 bg-medichain-bg-dark rounded-xl border border-medichain-border/30">
                          <p className="text-[9px] text-text-secondary uppercase">Missed Doses</p>
                          <p className="font-mono text-sm text-white font-bold">{adherenceData?.missed_dose_rate || 5}%</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </GlassCard>
            </div>
          </div>
        )}

        {/* TAB 4: EXPLAINABILITY */}
        {activeTab === 'explain' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Control & Details */}
            <div className="lg:col-span-1 space-y-6">
              <GlassCard>
                <h3 className="text-sm font-bold uppercase tracking-widest text-text-primary mb-4">
                  🧠 Model Select & Explanation
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs uppercase text-text-secondary mb-1">Target Disease Model</label>
                    <select
                      value={selectedDisease}
                      onChange={e => setSelectedDisease(e.target.value)}
                      className="w-full bg-medichain-bg-dark border border-medichain-border rounded-lg px-3 py-2 text-sm text-white focus:border-accent-cyan outline-none"
                    >
                      <option value="heart">Heart Disease Model</option>
                      <option value="diabetes">Diabetes Model</option>
                      <option value="stroke">Stroke Model</option>
                      <option value="kidney">Kidney Risk Model</option>
                      <option value="liver">Liver Risk Model</option>
                    </select>
                  </div>

                  <div className="border-t border-medichain-border/50 pt-4">
                    <span className="text-[10px] text-text-secondary uppercase font-bold">Explainable AI Narrative</span>
                    <p className="text-xs text-text-secondary leading-relaxed mt-2 p-3 bg-medichain-bg-dark/40 border border-medichain-border/30 rounded-xl">
                      {loadingExplain ? (
                        <span className="animate-pulse">Loading explanatory metrics...</span>
                      ) : explainData?.[selectedDisease]?.explanation_text ? (
                        // Render plain text explanation from SHAP
                        explainData[selectedDisease].explanation_text.replace(/\*\*/g, '')
                      ) : (
                        `Explainability model for ${selectedDisease} evaluated based on clinical inputs. Age and pre-existing chronic conditions represent the primary contributing vectors.`
                      )}
                    </p>
                  </div>
                </div>
              </GlassCard>
            </div>

            {/* Waterfall chart */}
            <div className="lg:col-span-2 space-y-6">
              <GlassCard>
                <h3 className="text-sm font-bold uppercase tracking-widest text-text-primary mb-4 capitalize">
                  📊 SHAP Feature Impact Waterfall ({selectedDisease})
                </h3>
                {loadingExplain ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <div className="w-8 h-8 border-4 border-accent-cyan border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs text-text-secondary font-mono">CALCULATING SHAPLEY VALUES...</p>
                  </div>
                ) : (
                  <SHAPWaterfall
                    featureImportance={explainData?.[selectedDisease]?.feature_importance || getMockFeatureImportance(selectedDisease)}
                    disease={selectedDisease}
                    loading={loadingExplain}
                  />
                )}
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
  analyzerMeds, analyzerDosages,
  patientAge, patientWeight, patientGfr, patientLiverScore, patientPregnant,
  dosageSafetyResult, setDosageSafetyResult,
  loadingDosageSafety, setLoadingDosageSafety,
  errorDosageSafety, setErrorDosageSafety,
  mlStatus, setMlStatus
}) {
  // Check ML model status on mount
  useEffect(() => {
    api.get('/ai/cdss/dosage-safety/status')
      .then(res => setMlStatus(res.data))
      .catch(() => setMlStatus({ ml_ready: false, fallback_mode: true }));
  }, []);

  const runDosageSafetyAnalysis = async () => {
    if (!analyzerDosages.length) {
      setErrorDosageSafety('Please add medications with doses in the Prescription Analyzer tab first.');
      return;
    }
    setLoadingDosageSafety(true);
    setErrorDosageSafety('');
    setDosageSafetyResult(null);

    const payload = {
      medications: analyzerDosages,
      patient: {
        age: patientAge,
        weight_kg: patientWeight,
        kidney_gfr: patientGfr,
        liver_score: patientLiverScore,
        pregnant: patientPregnant,
      }
    };

    try {
      const { data } = await api.post('/ai/cdss/dosage-safety/batch', payload);
      setDosageSafetyResult(data);
    } catch (err) {
      setErrorDosageSafety(err.message || 'ML service unavailable — running sandbox.');
      setDosageSafetyResult(getMockDosageSafetyResult(analyzerDosages, {
        age: patientAge, weight_kg: patientWeight,
        kidney_gfr: patientGfr, liver_score: patientLiverScore, pregnant: patientPregnant
      }));
    } finally {
      setLoadingDosageSafety(false);
    }
  };

  const RISK_COLORS = { SAFE: '#22c55e', LOW: '#eab308', MODERATE: '#f97316', HIGH: '#ef4444', CRITICAL: '#7f1d1d' };
  const RISK_BG    = { SAFE: 'bg-green-500/10 border-green-500/30 text-green-400', LOW: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400', MODERATE: 'bg-orange-500/10 border-orange-500/30 text-orange-400', HIGH: 'bg-red-500/10 border-red-500/30 text-red-400', CRITICAL: 'bg-red-900/20 border-red-700/50 text-red-300' };

  return (
    <div className="space-y-6">
      {/* Header info strip */}
      <div className="flex flex-wrap justify-between items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-500/20">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">⚗️ ML Dosage Safety Prediction Engine</h2>
          <p className="text-xs text-text-secondary mt-1">Random Forest · Gradient Boosting · XGBoost Ensemble — Predicts accumulation risk, toxic thresholds & emergency flags</p>
        </div>
        <div className="flex items-center gap-3">
          {mlStatus && (
            <span className={`text-[10px] px-3 py-1 rounded-full font-bold border ${
              mlStatus.ml_ready
                ? 'bg-green-500/10 border-green-500/30 text-green-400'
                : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
            }`}>
              {mlStatus.ml_ready ? '🟢 ML Models Online' : '🟡 Rule-Based Fallback'}
            </span>
          )}
          <button
            id="dosage-safety-run-btn"
            onClick={runDosageSafetyAnalysis}
            disabled={loadingDosageSafety || !analyzerDosages.length}
            className="px-6 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold text-sm
                       hover:from-purple-500 hover:to-blue-500 disabled:opacity-40 disabled:cursor-not-allowed
                       shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(139,92,246,0.5)]
                       transition-all duration-200"
          >
            {loadingDosageSafety ? 'Running ML Ensemble...' : '⚗️ Run Dosage Safety Prediction'}
          </button>
        </div>
      </div>

      {/* No medications notice */}
      {!analyzerDosages.length && (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-medichain-border rounded-2xl bg-medichain-bg-dark/20">
          <div className="text-4xl mb-4">💊</div>
          <h3 className="text-lg font-bold text-white mb-2">No Medications Loaded</h3>
          <p className="text-sm text-text-secondary max-w-sm">
            Add medications with doses in the <strong className="text-accent-cyan">Prescription Analyzer</strong> tab, then return here to run the ML Dosage Safety Engine.
          </p>
        </div>
      )}

      {/* Loading State */}
      {loadingDosageSafety && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-14 h-14 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <div className="text-center">
            <p className="text-white font-bold">Ensemble Inference Running...</p>
            <p className="text-xs text-text-secondary mt-1 font-mono animate-pulse">RANDOM FOREST → GRADIENT BOOSTING → XGBOOST</p>
          </div>
        </div>
      )}

      {/* Error banner */}
      {errorDosageSafety && (
        <div className="p-3 rounded-xl bg-status-warning/10 border border-status-warning/30 text-status-warning text-xs font-bold">
          ⚠️ {errorDosageSafety} — Showing sandbox simulation.
        </div>
      )}

      {/* Results */}
      {dosageSafetyResult && !loadingDosageSafety && (
        <div className="space-y-6 animate-fade-in">
          {/* Overall Risk Banner */}
          <div className={`p-5 rounded-2xl border-2 flex items-center justify-between gap-4 ${
            RISK_BG[dosageSafetyResult.overall_risk_level] || RISK_BG.MODERATE
          }`}>
            <div>
              <p className="text-[10px] uppercase font-bold tracking-widest opacity-70">ML Ensemble Overall Assessment</p>
              <h3 className="text-3xl font-display font-black mt-1" style={{ color: RISK_COLORS[dosageSafetyResult.overall_risk_level] }}>
                {dosageSafetyResult.overall_risk_level}
              </h3>
              <p className="text-xs mt-1 opacity-80">
                {dosageSafetyResult.total_medications} medication(s) analyzed · Total daily load: {dosageSafetyResult.total_daily_dose_mg?.toFixed(1) || 0}mg
              </p>
            </div>
            <div className="flex gap-3 flex-wrap">
              {dosageSafetyResult.has_emergency && (
                <div className="px-4 py-2 bg-red-600/20 border border-red-500/40 rounded-xl text-center">
                  <p className="text-[9px] uppercase text-red-400 font-bold">Emergency</p>
                  <p className="text-lg font-black text-red-400">{dosageSafetyResult.emergency_drugs?.length || 1}🚨</p>
                </div>
              )}
              {dosageSafetyResult.has_toxic && (
                <div className="px-4 py-2 bg-red-900/30 border border-red-700/50 rounded-xl text-center">
                  <p className="text-[9px] uppercase text-red-300 font-bold">Toxic Dose</p>
                  <p className="text-lg font-black text-red-300">{dosageSafetyResult.toxic_drugs?.length || 1}☠️</p>
                </div>
              )}
              <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-center">
                <p className="text-[9px] uppercase text-text-secondary font-bold">Source</p>
                <p className="text-sm font-bold text-accent-cyan">{dosageSafetyResult.ml_available ? 'ML Ensemble' : 'Rule-Based'}</p>
              </div>
            </div>
          </div>

          {/* Per-Drug Prediction Cards */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-text-secondary mb-4">💊 Per-Drug ML Predictions</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {dosageSafetyResult.individual_predictions?.map((pred, idx) => (
                <DrugSafetyCard key={idx} pred={pred} riskBg={RISK_BG} riskColors={RISK_COLORS} />
              ))}
            </div>
          </div>

          {/* Emergency Advice Panel */}
          {(dosageSafetyResult.has_emergency || dosageSafetyResult.has_toxic) && (
            <EmergencyAdvicePanel predictions={dosageSafetyResult.individual_predictions} />
          )}

          {/* Accumulation Risk Overview */}
          <AccumulationRiskPanel predictions={dosageSafetyResult.individual_predictions} />
        </div>
      )}
    </div>
  );
}

// ── Per-Drug Safety Card ──────────────────────────────────────────────────────
function DrugSafetyCard({ pred, riskBg, riskColors }) {
  const riskLabel = pred.risk_level || 'UNKNOWN';
  const bgClass = riskBg[riskLabel] || 'bg-white/5 border-white/10 text-white';

  return (
    <div className={`p-4 rounded-2xl border ${bgClass} space-y-3 transition-all hover:shadow-lg`}>
      {/* Drug Name + Badge */}
      <div className="flex justify-between items-start">
        <div>
          <h5 className="font-bold text-white capitalize text-sm">{pred.medication}</h5>
          <p className="text-[10px] opacity-60 mt-0.5">{pred.dose_mg}mg · {pred.frequency?.replace('_', ' ')}</p>
        </div>
        <span className={`text-[9px] px-2 py-0.5 rounded-full font-black border ${bgClass}`}>
          {riskLabel}
        </span>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 gap-2">
        <MetricCell label="Max Safe Dose" value={`${pred.max_safe_dose_mg ?? 'N/A'}mg`} />
        <MetricCell label="Toxic Threshold" value={`${pred.toxic_dose_mg ?? 'N/A'}mg`} />
        <MetricCell label="Daily Dose" value={`${pred.daily_dose_mg ?? 'N/A'}mg`} />
        <MetricCell label="Weekly Dose" value={`${pred.weekly_dose_mg ?? 'N/A'}mg`} />
      </div>

      {/* Dose Ratio Bar */}
      <div>
        <div className="flex justify-between items-center mb-1">
          <span className="text-[9px] uppercase opacity-60 font-bold">Dose vs Max Safe</span>
          <span className="text-[9px] font-mono font-bold" style={{ color: riskColors[riskLabel] || '#fff' }}>
            {((pred.dose_ratio || 0) * 100).toFixed(0)}%
          </span>
        </div>
        <div className="h-2 bg-black/20 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${Math.min(100, (pred.dose_ratio || 0) * 100)}%`,
              backgroundColor: riskColors[riskLabel] || '#6366f1'
            }}
          />
        </div>
      </div>

      {/* Accumulation Risk */}
      <div>
        <div className="flex justify-between items-center mb-1">
          <span className="text-[9px] uppercase opacity-60 font-bold">Accumulation Risk</span>
          <span className="text-[9px] font-mono font-bold">
            {((pred.accumulation_risk || 0) * 100).toFixed(0)}%
          </span>
        </div>
        <div className="h-1.5 bg-black/20 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 bg-purple-500"
            style={{ width: `${Math.min(100, (pred.accumulation_risk || 0) * 100)}%` }}
          />
        </div>
      </div>

      {/* Flags */}
      <div className="flex flex-wrap gap-1.5">
        {pred.narrow_therapeutic_index && (
          <span className="text-[8px] px-1.5 py-0.5 bg-amber-500/20 border border-amber-500/40 text-amber-400 rounded font-bold uppercase">NTI Drug</span>
        )}
        {pred.opioid_class && (
          <span className="text-[8px] px-1.5 py-0.5 bg-red-500/20 border border-red-500/40 text-red-400 rounded font-bold uppercase">Opioid</span>
        )}
        {pred.is_toxic && (
          <span className="text-[8px] px-1.5 py-0.5 bg-red-900/40 border border-red-700/50 text-red-300 rounded font-bold uppercase">☠️ Toxic</span>
        )}
        {pred.emergency_flag && (
          <span className="text-[8px] px-1.5 py-0.5 bg-red-600/30 border border-red-500/50 text-red-300 rounded font-bold uppercase">🚨 Emergency</span>
        )}
        <span className="text-[8px] px-1.5 py-0.5 bg-blue-500/20 border border-blue-500/30 text-blue-300 rounded font-bold uppercase">
          Tox: {pred.drug_toxicity_class || 'low'}
        </span>
        <span className="text-[8px] px-1.5 py-0.5 bg-white/5 border border-white/10 text-text-secondary rounded font-bold uppercase">
          {pred.prediction_source === 'ml_ensemble' ? '🤖 ML' : '📐 Rule'}
        </span>
      </div>

      {/* ML Confidence Breakdown (if available) */}
      {pred.ensemble_confidence?.averaged_probabilities && Object.keys(pred.ensemble_confidence.averaged_probabilities).length > 0 && (
        <div className="pt-2 border-t border-white/10">
          <p className="text-[8px] uppercase font-bold opacity-50 mb-1">Ensemble Probabilities</p>
          <div className="flex gap-1 flex-wrap">
            {Object.entries(pred.ensemble_confidence.averaged_probabilities).map(([lvl, prob]) => (
              <div key={lvl} className="text-center">
                <div className="text-[7px] opacity-40 uppercase">{lvl}</div>
                <div className="text-[9px] font-mono font-bold" style={{ color: { SAFE:'#22c55e', LOW:'#eab308', MODERATE:'#f97316', HIGH:'#ef4444', CRITICAL:'#dc2626' }[lvl] || '#fff' }}>
                  {(prob * 100).toFixed(0)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCell({ label, value }) {
  return (
    <div className="p-2 bg-black/20 rounded-xl">
      <p className="text-[8px] uppercase opacity-50 font-bold">{label}</p>
      <p className="text-xs font-mono font-bold text-white mt-0.5">{value}</p>
    </div>
  );
}

// ── Emergency Advice Panel ────────────────────────────────────────────────────
function EmergencyAdvicePanel({ predictions }) {
  const emergencyPreds = (predictions || []).filter(p => p.emergency_flag || p.is_toxic);
  if (!emergencyPreds.length) return null;

  return (
    <div className="p-5 rounded-2xl bg-red-950/30 border-2 border-red-700/50 space-y-4">
      <h4 className="text-sm font-bold text-red-400 uppercase tracking-widest flex items-center gap-2">
        🚨 Emergency Clinical Advice
      </h4>
      {emergencyPreds.map((pred, idx) => (
        <div key={idx} className="space-y-2">
          <h5 className="text-xs font-bold text-white uppercase">{pred.medication} — {pred.risk_level}</h5>
          <ul className="space-y-1.5">
            {pred.emergency_advice?.map((advice, ai) => (
              <li key={ai} className="flex items-start gap-2 text-xs text-red-300 leading-relaxed">
                <span className="text-red-500 mt-0.5 font-bold">›</span>
                <span>{advice}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

// ── Accumulation Risk Panel ───────────────────────────────────────────────────
function AccumulationRiskPanel({ predictions }) {
  if (!predictions?.length) return null;

  return (
    <div className="p-5 rounded-2xl bg-purple-950/20 border border-purple-500/20 space-y-4">
      <h4 className="text-sm font-bold text-purple-300 uppercase tracking-widest">📊 Drug Accumulation Risk Profile</h4>
      <div className="space-y-3">
        {predictions.map((pred, idx) => {
          const pct = Math.round((pred.accumulation_risk || 0) * 100);
          const color = pct >= 70 ? '#ef4444' : pct >= 40 ? '#f97316' : pct >= 20 ? '#eab308' : '#22c55e';
          return (
            <div key={idx}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-white capitalize">{pred.medication}</span>
                <div className="flex items-center gap-3">
                  <span className="text-[9px] text-text-secondary font-mono">Severity Score: {pred.severity_score?.toFixed(0) ?? '—'}/100</span>
                  <span className="text-xs font-mono font-bold" style={{ color }}>{pct}%</span>
                </div>
              </div>
              <div className="h-3 bg-black/30 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, backgroundColor: color }}
                />
              </div>
              <div className="flex justify-between text-[8px] text-text-secondary mt-0.5">
                <span>Daily: {pred.daily_dose_mg?.toFixed(1)}mg · Weekly: {pred.weekly_dose_mg?.toFixed(1)}mg</span>
                <span>Tox class: {pred.drug_toxicity_class || '—'}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── SANDBOX / MOCK FALLBACKS FOR ROBUSTNESS ───────────────────────────────────

function getMockDosageSafetyResult(dosages, patient) {
  const DRUG_PROFILES = {
    warfarin:     { max_single: 10,   daily_max: 10,   narrow: true,  opioid: false, tox: 'high' },
    morphine:     { max_single: 30,   daily_max: 120,  narrow: true,  opioid: true,  tox: 'high' },
    ibuprofen:    { max_single: 800,  daily_max: 3200, narrow: false, opioid: false, tox: 'medium' },
    metformin:    { max_single: 1000, daily_max: 2550, narrow: false, opioid: false, tox: 'low' },
    aspirin:      { max_single: 1000, daily_max: 4000, narrow: false, opioid: false, tox: 'low' },
    paracetamol:  { max_single: 1000, daily_max: 3000, narrow: false, opioid: false, tox: 'medium' },
    acetaminophen:{ max_single: 1000, daily_max: 3000, narrow: false, opioid: false, tox: 'medium' },
    insulin:      { max_single: 100,  daily_max: 300,  narrow: true,  opioid: false, tox: 'high' },
    amlodipine:   { max_single: 10,   daily_max: 10,   narrow: false, opioid: false, tox: 'low' },
    atorvastatin: { max_single: 80,   daily_max: 80,   narrow: false, opioid: false, tox: 'low' },
    lisinopril:   { max_single: 40,   daily_max: 40,   narrow: false, opioid: false, tox: 'low' },
  };

  const FREQ = { once_daily: 1, twice_daily: 2, tds: 3, qds: 4, weekly: 0.14 };
  const RISK_LEVELS = ['SAFE', 'LOW', 'MODERATE', 'HIGH', 'CRITICAL'];

  let maxRiskIdx = 0;
  let totalDaily = 0;
  const emergencyDrugs = [];
  const toxicDrugs = [];

  const individual_predictions = (dosages || []).map(entry => {
    const drug   = entry.drug || 'unknown';
    const dose   = parseFloat(entry.dose_mg) || 100;
    const freq   = entry.frequency || 'once_daily';
    const prof   = DRUG_PROFILES[drug.toLowerCase()] || { max_single: 500, daily_max: 2000, narrow: false, opioid: false, tox: 'low' };

    const freqVal    = FREQ[freq.toLowerCase()] || 1;
    const maxSafe    = prof.max_single;
    const toxicThresh= maxSafe * 1.5;
    const dailyDose  = dose * freqVal;
    const weeklyDose = dailyDose * 7;
    const doseRatio  = dose / maxSafe;
    const dailyRatio = dailyDose / prof.daily_max;

    // Accumulation
    const renal  = patient.kidney_gfr < 30 ? 0.3 : patient.kidney_gfr < 60 ? 0.15 : 0;
    const narrow = prof.narrow ? 0.2 : 0;
    const accu   = Math.min(1, renal + narrow + Math.max(0, doseRatio - 0.8) * 0.2 + (patient.age > 65 ? 0.1 : 0));

    // Risk
    const riskScore = doseRatio * 2.5 + (dailyRatio > 1 ? 1.5 : 0) + accu + (patient.kidney_gfr < 30 && prof.narrow ? 0.8 : 0);
    let riskIdx = riskScore < 0.5 ? 0 : riskScore < 1.2 ? 1 : riskScore < 2.0 ? 2 : riskScore < 3.0 ? 3 : 4;
    const emergFlag = riskIdx >= 3;
    const isToxic  = dose > toxicThresh;

    if (isToxic) toxicDrugs.push(drug);
    if (emergFlag) emergencyDrugs.push(drug);
    maxRiskIdx = Math.max(maxRiskIdx, riskIdx);
    totalDaily += dailyDose;

    const advice = [];
    if (emergFlag || isToxic) {
      advice.push(`URGENT: ${drug} dose of ${dose}mg exceeds safe threshold. Seek immediate clinical review.`);
      advice.push(`Patient-adjusted maximum dose is ${maxSafe}mg. Reduce dose immediately.`);
      if (prof.opioid) advice.push('OPIOID: Naloxone should be available. Monitor respiratory function.');
      if (prof.narrow) advice.push(`NARROW THERAPEUTIC INDEX: ${drug} has a very small safety margin.`);
    } else {
      advice.push(`${drug} ${dose}mg dose is within acceptable range for this patient profile.`);
    }

    return {
      medication:             drug,
      dose_mg:                dose,
      frequency:              freq,
      risk_level:             RISK_LEVELS[riskIdx],
      risk_index:             riskIdx,
      risk_confidence:        0.75,
      risk_color:             ['#22c55e','#eab308','#f97316','#ef4444','#7f1d1d'][riskIdx],
      prediction_source:      'rule_based',
      max_safe_dose_mg:       maxSafe,
      current_dose_mg:        dose,
      daily_dose_mg:          parseFloat(dailyDose.toFixed(1)),
      weekly_dose_mg:         parseFloat(weeklyDose.toFixed(1)),
      toxic_dose_mg:          toxicThresh,
      dose_ratio:             parseFloat(doseRatio.toFixed(3)),
      daily_dose_ratio:       parseFloat(dailyRatio.toFixed(3)),
      is_toxic:               isToxic,
      toxicity_probability:   isToxic ? 0.9 : 0.1,
      emergency_flag:         emergFlag,
      emergency_probability:  emergFlag ? 0.85 : 0.05,
      accumulation_risk:      parseFloat(accu.toFixed(3)),
      drug_toxicity_class:    prof.tox,
      narrow_therapeutic_index: prof.narrow,
      opioid_class:           prof.opioid,
      severity_score:         parseFloat(Math.max(0, 100 - riskIdx * 22 - accu * 15).toFixed(1)),
      emergency_advice:       advice,
      drug_in_database:       !!DRUG_PROFILES[drug.toLowerCase()],
      ensemble_confidence: {
        models_available:      [],
        averaged_probabilities: {
          SAFE:     riskIdx === 0 ? 0.75 : 0.05,
          LOW:      riskIdx === 1 ? 0.70 : 0.05,
          MODERATE: riskIdx === 2 ? 0.65 : 0.10,
          HIGH:     riskIdx === 3 ? 0.75 : 0.05,
          CRITICAL: riskIdx === 4 ? 0.80 : 0.05,
        }
      },
      patient_profile: {
        age:        patient.age,
        weight_kg:  patient.weight_kg,
        kidney_gfr: patient.kidney_gfr,
        liver_score:patient.liver_score,
        pregnant:   patient.pregnant,
      }
    };
  });

  return {
    individual_predictions,
    overall_risk_level:     RISK_LEVELS[Math.min(maxRiskIdx, 4)],
    overall_risk_index:     maxRiskIdx,
    overall_risk_color:     ['#22c55e','#eab308','#f97316','#ef4444','#7f1d1d'][maxRiskIdx],
    emergency_drugs:        emergencyDrugs,
    toxic_drugs:            toxicDrugs,
    has_emergency:          emergencyDrugs.length > 0,
    has_toxic:              toxicDrugs.length > 0,
    total_medications:      dosages.length,
    total_daily_dose_mg:    parseFloat(totalDaily.toFixed(1)),
    ml_available:           false,
  };
}

function getMockOrganRisks(age = 45, conditions = []) {
  const heartBase = conditions.includes('heart') ? 70 : conditions.includes('hypertension') ? 45 : 12;
  const kidneyBase = conditions.includes('kidney') ? 75 : conditions.includes('diabetes') ? 35 : 10;
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

function getMockDiseasePredictions(age = 45, conditions = []) {
  const risks = getMockOrganRisks(age, conditions);
  return Object.entries(risks).map(([key, organ]) => ({
    disease: key,
    probability: organ.risk_score
  })).sort((a, b) => b.probability - a.probability);
}

function getMockAdherenceData() {
  return {
    adherence_score: 82,
    category_label: 'LOW RISK',
    risk_category: 'LOW',
    predicted_next_refill_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    avg_refill_delay_days: 1.8,
    missed_dose_rate: 6,
    contributing_factors: [
      'Refills are typically completed on time or with minimal delay (under 2 days average)',
      'Chronically high consistency recorded over the last 180 days'
    ],
    recommended_interventions: [
      'Maintain standard automated calendar alerts for refill events'
    ],
    history_trend: [
      { month: '5 months ago', score: 75 },
      { month: '4 months ago', score: 78 },
      { month: '3 months ago', score: 80 },
      { month: '2 months ago', score: 83 },
      { month: 'Last month',   score: 85 },
      { month: 'Now',          score: 82 }
    ]
  };
}

function getMockFeatureImportance(disease) {
  if (disease === 'heart') {
    return [
      { feature: 'Cholesterol', shap_value: 0.18, importance: 0.18, direction: 'increases_risk', clinical_context: 'Total cholesterol contributes to blockages' },
      { feature: 'Age', shap_value: 0.12, importance: 0.12, direction: 'increases_risk', clinical_context: 'Age-related vessel degradation' },
      { feature: 'Resting BP', shap_value: 0.08, importance: 0.08, direction: 'increases_risk', clinical_context: 'High blood pressure damages heart muscles' },
      { feature: 'Max Heart Rate', shap_value: -0.05, importance: 0.05, direction: 'decreases_risk', clinical_context: 'High exercise tolerance is protective' }
    ];
  }
  return [
    { feature: 'Age', shap_value: 0.15, importance: 0.15, direction: 'increases_risk', clinical_context: 'Primary demographic risk factor' },
    { feature: 'Existing Conditions', shap_value: 0.12, importance: 0.12, direction: 'increases_risk', clinical_context: 'Co-morbidities elevate organ workload' },
    { feature: 'Activity Index', shap_value: -0.08, importance: 0.08, direction: 'decreases_risk', clinical_context: 'Physical exercise mitigates metabolic degradation' }
  ];
}

function getSandboxAnalysisResult(meds, dosages, patient) {
  // Compute interactive mock values for sandboxing
  let score = 100;
  const conflicts = [];
  const warnings = [];

  // Check manual interactions
  const lowercaseMeds = meds.map(m => m.toLowerCase());
  
  if (lowercaseMeds.includes('warfarin') && lowercaseMeds.includes('aspirin')) {
    score -= 40;
    conflicts.push({
      drug1: 'Warfarin',
      drug2: 'Aspirin',
      severity: 'HIGH',
      description: 'Concurrent use of warfarin and aspirin significantly increases risk of major gastrointestinal or systemic bleeding.',
      source: 'RxNorm Lookup Fallback'
    });
  }
  if (lowercaseMeds.includes('ibuprofen') && lowercaseMeds.includes('aspirin')) {
    score -= 15;
    conflicts.push({
      drug1: 'Ibuprofen',
      drug2: 'Aspirin',
      severity: 'MODERATE',
      description: 'Ibuprofen may decrease the cardioprotective effect of aspirin. Monitor bleeding risks.',
      source: 'RxNorm Lookup Fallback'
    });
  }

  // Check allergies
  patient.allergies.forEach(allergy => {
    const allergen = allergy.toLowerCase();
    meds.forEach(med => {
      if (med.toLowerCase().includes(allergen) || allergen.includes(med.toLowerCase())) {
        score -= 50;
        warnings.push({
          drug: med,
          safe: false,
          severity: 'CRITICAL',
          reason: `Patient is allergic to ${allergy}. Administration of ${med} is strictly contraindicated.`,
          prescribed_dose: dosages.find(d => d.drug === med)?.dose_mg || 500,
          prescribed_frequency: dosages.find(d => d.drug === med)?.frequency || 'once_daily'
        });
      }
    });
  });

  // Check kidney GFR
  if (patient.kidney_gfr < 60) {
    meds.forEach(med => {
      if (['ibuprofen', 'naproxen', 'metformin'].includes(med.toLowerCase())) {
        score -= 20;
        warnings.push({
          drug: med,
          safe: false,
          severity: 'HIGH',
          reason: `Impaired kidney function (GFR ${patient.kidney_gfr}). NSAIDs/Metformin are nephrotoxic and contraindicated.`,
          prescribed_dose: dosages.find(d => d.drug === med)?.dose_mg || 500,
          prescribed_frequency: dosages.find(d => d.drug === med)?.frequency || 'once_daily'
        });
      }
    });
  }

  // Prepopulate safe checks for anything not flagged
  meds.forEach(med => {
    if (!warnings.find(w => w.drug === med)) {
      warnings.push({
        drug: med,
        safe: true,
        severity: 'NONE',
        reason: 'Dosage and patient factors within safe clinical guidelines.',
        prescribed_dose: dosages.find(d => d.drug === med)?.dose_mg || 500,
        prescribed_frequency: dosages.find(d => d.drug === med)?.frequency || 'once_daily'
      });
    }
  });

  // Bound score
  score = Math.max(10, score);
  let severity = 'SAFE';
  if (score < 40) severity = 'CRITICAL';
  else if (score < 60) severity = 'HIGH';
  else if (score < 80) severity = 'MODERATE';
  else if (score < 95) severity = 'LOW';

  const combination_analysis = [];
  if (lowercaseMeds.includes('warfarin') && lowercaseMeds.includes('aspirin')) {
    combination_analysis.push({
      name: 'Additive Bleeding Risk',
      severity: 'HIGH',
      description: 'Combined use of anticoagulants and antiplatelets (Warfarin + Aspirin) significantly increases the risk of gastrointestinal or systemic bleeding.',
      drugs_involved: ['Warfarin', 'Aspirin']
    });
  }

  const alternative_medicines = [];
  if (lowercaseMeds.includes('warfarin')) {
    if (patient.pregnant) {
      alternative_medicines.push({
        drug: 'Warfarin',
        reason: 'Warfarin is contraindicated in pregnancy due to teratogenicity.',
        alternatives: ['Heparin', 'Enoxaparin (Lovenox)']
      });
    } else if (lowercaseMeds.includes('aspirin')) {
      alternative_medicines.push({
        drug: 'Warfarin',
        reason: 'High bleeding risk with Aspirin.',
        alternatives: ['Apixaban (Eliquis)', 'Dabigatran (Pradaxa)']
      });
    }
  }
  if (lowercaseMeds.includes('ibuprofen') && patient.kidney_gfr < 60) {
    alternative_medicines.push({
      drug: 'Ibuprofen',
      reason: 'NSAIDs are nephrotoxic and contraindicated in kidney disease.',
      alternatives: ['Acetaminophen (Tylenol)']
    });
  }

  const patient_contraindications = [];
  if (patient.pregnant && lowercaseMeds.includes('warfarin')) {
    patient_contraindications.push({
      drug: 'Warfarin',
      condition: 'Pregnancy',
      severity: 'CRITICAL',
      description: 'Pregnant patient. Warfarin is teratogenic and contraindicated.'
    });
  }
  if (patient.kidney_gfr < 60 && lowercaseMeds.includes('ibuprofen')) {
    patient_contraindications.push({
      drug: 'Ibuprofen',
      condition: `Kidney Disease (GFR ${patient.kidney_gfr})`,
      severity: 'HIGH',
      description: `Patient has kidney impairment. Ibuprofen is nephrotoxic.`
    });
  }

  const emergency_recommendations = [];
  if (score < 40) {
    emergency_recommendations.push('CRITICAL WARNING: Seek immediate physician review before administering this prescription.');
  } else if (score < 80) {
    emergency_recommendations.push('HIGH WARNING: Prescription should be reviewed by a pharmacist.');
  }
  if (combination_analysis.length > 0) {
    emergency_recommendations.push('MONITOR: Watch for black/tarry stools, unusual bruising, or nosebleeds. Contact emergency services for severe bleeding.');
  }
  if (emergency_recommendations.length === 0) {
    emergency_recommendations.push('Monitor patient for side effects and follow standard dosing schedule.');
  }

  return {
    safety_score: score,
    severity: severity,
    medications: meds,
    interaction_analysis: {
      conflicts,
      matrix: conflicts.reduce((acc, c) => {
        acc[`${c.drug1} ↔ ${c.drug2}`] = c;
        return acc;
      }, {})
    },
    dosage_analysis: warnings,
    combination_analysis,
    alternative_medicines,
    emergency_recommendations,
    patient_contraindications,
    clinical_explanation: conflicts.length > 0 || warnings.some(w => !w.safe)
      ? `Sandbox CDSS Warning: We identified potential therapeutic concerns. ${conflicts.map(c => `${c.drug1} and ${c.drug2} interact`).join('. ')}.`
      : 'No contraindications or therapeutic duplication issues detected. The prescription matches safety guidelines.',
    recommendations: conflicts.length > 0 || warnings.some(w => !w.safe)
      ? ['Consider alternative therapy for drug-drug interaction pairs.', 'Monitor patient vitals and serum markers closely.']
      : ['No specific clinical alerts. Standard administration schedules apply.']
  };
}
