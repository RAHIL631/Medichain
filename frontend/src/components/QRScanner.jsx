// frontend/src/components/QRScanner.jsx
// Production QR Scanner & Manual Patient ID Resolver for MediChain
// Supports Mobile (iOS Safari, Android Chrome) & Desktop with camera switching,
// MediChain Patient QR JSON payload validation, Patient ID extraction, and unified backend verification.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BrowserQRCodeReader } from '@zxing/library';
import api from '../utils/api';
import {
  QrCode, Camera, RefreshCw, AlertCircle, CheckCircle2,
  Edit3, X, ShieldCheck
} from 'lucide-react';

/**
 * Extracts and validates patient identifier from diverse QR payloads:
 * - Structured JSON: {"type":"MEDICHAIN_PATIENT", "version":1, "patientId":"MC-PAT-..."}
 * - Legacy JSON: {"type":"medichain_health_id", "address":"0x..."}
 * - Raw Patient ID string: "MC-PAT-2026-000001"
 * - Raw Ethereum address: "0x..."
 */
function extractPatientIdentity(rawText) {
  if (!rawText || typeof rawText !== 'string') return null;
  const trimmed = rawText.trim();

  // 1. Try parsing JSON
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === 'object') {
      if (parsed.type && parsed.type !== 'MEDICHAIN_PATIENT' && parsed.type !== 'medichain_health_id') {
        return { error: 'This is not a valid MediChain Patient QR.' };
      }
      const pid = parsed.patientId || parsed.id;
      if (pid && /^MC-PAT-\d{4}-[A-Z0-9]{6}$/i.test(pid.trim())) {
        return { patientId: pid.trim(), raw: trimmed };
      }
      const addr = parsed.address || parsed.patientAddress || parsed.walletAddress;
      if (addr && /^0x[a-fA-F0-9]{40}$/i.test(addr.trim())) {
        return { walletAddress: addr.trim(), raw: trimmed };
      }
      if (parsed.patientId) {
        return { patientId: parsed.patientId.trim(), raw: trimmed };
      }
    }
  } catch {
    /* Not JSON */
  }

  // 2. Try raw Patient ID pattern (e.g. MC-PAT-2026-000001)
  const patMatch = trimmed.match(/MC-PAT-\d{4}-[A-Z0-9]{6}/i);
  if (patMatch) {
    return { patientId: patMatch[0].trim(), raw: trimmed };
  }

  // 3. Try raw 0x Ethereum address match
  const addrMatch = trimmed.match(/0x[a-fA-F0-9]{40}/i);
  if (addrMatch) {
    return { walletAddress: addrMatch[0].trim(), raw: trimmed };
  }

  // 4. If arbitrary URL or unrecognized format
  return { error: 'This is not a valid MediChain Patient QR.' };
}

const QRScanner = ({ onScan, onScanSuccess, onScanError }) => {
  const [activeTab, setActiveTab]         = useState('scan'); // 'scan' | 'manual'
  const [status, setStatus]               = useState('idle'); // 'idle' | 'requesting' | 'active' | 'verifying' | 'success' | 'error'
  const [facingMode, setFacingMode]       = useState('environment'); // 'environment' (rear) | 'user' (front)
  const [errorMessage, setErrorMessage]   = useState('');
  const [manualInput, setManualInput]     = useState('');
  const [verifiedPatient, setVerifiedPatient] = useState(null);
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);

  const videoRef        = useRef(null);
  const streamRef       = useRef(null);
  const readerRef       = useRef(null);
  const animFrameRef    = useRef(null);
  const timeoutTimerRef = useRef(null);
  const isScanningRef   = useRef(false);

  // --- Stop camera stream and scanning loop ---
  const stopCamera = useCallback(() => {
    isScanningRef.current = false;
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (timeoutTimerRef.current) {
      clearTimeout(timeoutTimerRef.current);
      timeoutTimerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try { track.stop(); } catch { /* silent */ }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (readerRef.current) {
      try { readerRef.current.reset(); } catch { /* silent */ }
    }
  }, []);

  // Initialize ZXing Reader instance once
  useEffect(() => {
    readerRef.current = new BrowserQRCodeReader();
    if (navigator.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then((devices) => {
        const videoInputs = devices.filter((d) => d.kind === 'videoinput');
        setHasMultipleCameras(videoInputs.length > 1);
      }).catch(() => {});
    }

    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // --- Perform Patient Verification / Lookup via Unified Backend Resolver ---
  const verifyAndLookup = useCallback(async (identifier, rawPayload = '') => {
    stopCamera();
    setStatus('verifying');
    setErrorMessage('');

    try {
      // Unified backend resolver accepts patientId, walletAddress, or structured qrData
      const { data } = await api.post('/doctor/resolve-patient', {
        patientId: identifier,
        qrData: rawPayload
      });

      if (!data.success && !data.patient) {
        throw new Error(data.error || 'Patient ID not found.');
      }

      const patientSummary = data.patient || data;
      setVerifiedPatient(patientSummary);
      setStatus('success');

      // Dispatch callbacks to parent dashboard
      const primaryKey = patientSummary.walletAddress || patientSummary.patientId || identifier;
      setTimeout(() => {
        if (typeof onScan === 'function') {
          onScan(primaryKey, patientSummary);
        }
        if (typeof onScanSuccess === 'function') {
          onScanSuccess(primaryKey, patientSummary);
        }
      }, 1000);

    } catch (err) {
      console.warn('[QRScanner] Patient lookup error:', err);
      const errMsg = err.response?.data?.error || err.message || 'Patient ID not found.';
      setStatus('error');
      setErrorMessage(errMsg);

      if (typeof onScanError === 'function') {
        onScanError(err);
      }
    }
  }, [stopCamera, onScan, onScanSuccess, onScanError]);

  // --- Start Camera & Frame Analysis ---
  const startCamera = useCallback(async () => {
    stopCamera();
    setStatus('requesting');
    setErrorMessage('');
    setVerifiedPatient(null);

    // Guard: MediaDevices supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStatus('error');
      setErrorMessage('Camera access is not supported by your browser. Please use Manual Entry.');
      return;
    }

    try {
      // 6-second black-screen watchdog timer
      timeoutTimerRef.current = setTimeout(() => {
        if (videoRef.current && (videoRef.current.videoWidth === 0 || videoRef.current.paused)) {
          setStatus('error');
          setErrorMessage('Camera could not be started. Check camera permissions or enter Patient ID manually.');
          stopCamera();
        }
      }, 6000);

      const constraints = {
        video: {
          facingMode: { ideal: facingMode },
          width:      { ideal: 1280 },
          height:     { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (!videoRef.current) return;

      videoRef.current.srcObject = stream;
      videoRef.current.setAttribute('playsinline', 'true');
      videoRef.current.setAttribute('autoplay', 'true');
      videoRef.current.setAttribute('muted', 'true');

      // Wait for video to play
      await videoRef.current.play();

      if (timeoutTimerRef.current) {
        clearTimeout(timeoutTimerRef.current);
        timeoutTimerRef.current = null;
      }

      setStatus('active');
      isScanningRef.current = true;

      // Scan frames using ZXing
      let lastScanTime = 0;
      const scanLoop = async (time) => {
        if (!isScanningRef.current) return;

        // Throttle decoding to ~12 FPS (every 80ms)
        if (time - lastScanTime > 80 && videoRef.current && videoRef.current.readyState >= 2) {
          lastScanTime = time;
          try {
            if (readerRef.current) {
              const result = await readerRef.current.decodeFromVideoElement(videoRef.current);
              if (result && result.getText()) {
                const text = result.getText();
                const identity = extractPatientIdentity(text);

                if (identity && !identity.error) {
                  isScanningRef.current = false;
                  const key = identity.patientId || identity.walletAddress;
                  verifyAndLookup(key, identity.raw || text);
                  return;
                } else {
                  setErrorMessage(identity?.error || 'This is not a valid MediChain Patient QR.');
                }
              }
            }
          } catch {
            // Frame did not contain a readable QR code in this pass — continue loop
          }
        }

        if (isScanningRef.current) {
          animFrameRef.current = requestAnimationFrame(scanLoop);
        }
      };

      animFrameRef.current = requestAnimationFrame(scanLoop);

    } catch (err) {
      console.error('[QRScanner] Camera stream error:', err);
      stopCamera();
      setStatus('error');

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMessage('Camera permission was denied. Please allow camera access in your browser settings.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setErrorMessage('No camera was detected on this device.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setErrorMessage('The camera is currently being used by another application.');
      } else {
        setErrorMessage(`Unable to access camera: ${err.message || 'Check browser permissions'}`);
      }

      if (typeof onScanError === 'function') {
        onScanError(err);
      }
    }
  }, [facingMode, stopCamera, verifyAndLookup, onScanError]);

  // Handle switching front/rear camera
  const toggleCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Re-launch camera when facingMode changes and scanner is active
  useEffect(() => {
    if (status === 'active' || status === 'requesting') {
      startCamera();
    }
  }, [facingMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Manual lookup handler
  const handleManualSubmit = (e) => {
    e.preventDefault();
    const clean = manualInput.trim();
    if (!clean) {
      setErrorMessage('Please enter a valid Patient ID (e.g. MC-PAT-2026-000001) or Ethereum address.');
      return;
    }
    verifyAndLookup(clean);
  };

  return (
    <div className="w-full max-w-md mx-auto hc-card overflow-hidden border border-hc-border shadow-xl">
      {/* Header Tabs */}
      <div className="flex border-b border-hc-border bg-hc-bg-alt">
        <button
          type="button"
          onClick={() => { setActiveTab('scan'); setErrorMessage(''); }}
          className={`flex-1 py-3.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
            activeTab === 'scan'
              ? 'text-hc-blue border-b-2 border-hc-blue bg-hc-surface'
              : 'text-hc-text-muted hover:text-hc-text'
          }`}
        >
          <Camera className="w-4 h-4" />
          Scan Patient QR
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab('manual'); stopCamera(); setStatus('idle'); setErrorMessage(''); }}
          className={`flex-1 py-3.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
            activeTab === 'manual'
              ? 'text-hc-blue border-b-2 border-hc-blue bg-hc-surface'
              : 'text-hc-text-muted hover:text-hc-text'
          }`}
        >
          <Edit3 className="w-4 h-4" />
          Manual Entry
        </button>
      </div>

      <div className="p-4 sm:p-6 flex flex-col items-center">
        {activeTab === 'scan' ? (
          <div className="w-full flex flex-col items-center">
            {/* 1. IDLE STATE */}
            {status === 'idle' && (
              <div className="text-center py-6 sm:py-8 w-full">
                <div className="w-16 h-16 rounded-2xl bg-hc-blue-soft text-hc-blue flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <QrCode className="w-8 h-8" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-hc-text mb-1">Ready to Scan Patient QR</h3>
                <p className="text-xs text-hc-text-muted max-w-xs mx-auto mb-6">
                  Point your camera at the patient's MediChain Health ID QR badge.
                </p>
                <button
                  type="button"
                  onClick={startCamera}
                  className="hc-btn hc-btn-primary w-full justify-center min-h-[44px] shadow-hc-card font-bold text-xs"
                  id="start-qr-scanner-btn"
                >
                  <Camera className="w-4 h-4" />
                  Launch Camera Scanner
                </button>
              </div>
            )}

            {/* 2. REQUESTING STATE */}
            {status === 'requesting' && (
              <div className="text-center py-10 w-full space-y-3">
                <div className="w-10 h-10 border-3 border-hc-blue border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-bold text-hc-text">Requesting Camera Permission...</p>
                <p className="text-[11px] text-hc-text-muted">Please allow camera access in the browser prompt.</p>
              </div>
            )}

            {/* 3. ACTIVE LIVE CAMERA FEED */}
            {(status === 'active' || status === 'verifying') && (
              <div className="relative w-full aspect-square max-w-[320px] rounded-2xl overflow-hidden bg-black shadow-inner border-2 border-hc-border">
                {/* Real Live Video Feed */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />

                {/* Targeting Reticle Overlay */}
                <div className="absolute inset-0 border-[28px] border-black/40 pointer-events-none" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-hc-success rounded-xl pointer-events-none shadow-[0_0_15px_rgba(34,197,94,0.4)]">
                  {/* Corner Accent Marks */}
                  <div className="absolute -top-1 -left-1 w-4 h-4 border-t-3 border-l-3 border-hc-success" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 border-t-3 border-r-3 border-hc-success" />
                  <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-3 border-l-3 border-hc-success" />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-3 border-r-3 border-hc-success" />
                  
                  {/* Animated Laser Sweep */}
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-hc-success to-transparent shadow-[0_0_10px_#22c55e] animate-pulse" />
                </div>

                {/* Top Controls: Switch Camera & Cancel */}
                <div className="absolute top-2 left-2 right-2 flex items-center justify-between z-20">
                  {hasMultipleCameras && (
                    <button
                      type="button"
                      onClick={toggleCamera}
                      className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] font-bold flex items-center gap-1 hover:bg-black/80 transition-colors"
                      title="Switch Front/Rear Camera"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Switch
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => { stopCamera(); setStatus('idle'); }}
                    className="ml-auto p-1.5 rounded-full bg-black/60 backdrop-blur-md text-white hover:bg-black/80 transition-colors"
                    aria-label="Close Scanner"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Bottom Instruction Bar */}
                <div className="absolute bottom-2 left-2 right-2 px-3 py-1.5 rounded-xl bg-black/70 backdrop-blur-md text-center">
                  <p className="text-[11px] font-semibold text-white">
                    {status === 'verifying' ? 'Verifying patient identity...' : 'Align MediChain Patient QR inside frame'}
                  </p>
                </div>
              </div>
            )}

            {/* 4. SUCCESS SCREEN */}
            {status === 'success' && verifiedPatient && (
              <div className="w-full p-4 rounded-2xl bg-hc-success-soft border border-hc-success/30 flex items-start gap-3 animate-slide-up">
                <div className="w-10 h-10 rounded-full bg-hc-success flex items-center justify-center text-white flex-shrink-0 shadow-sm mt-0.5">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-hc-success text-xs font-bold mb-0.5">
                    <ShieldCheck className="w-4 h-4" />
                    <span>✓ Patient Identified</span>
                  </div>
                  <h4 className="text-sm font-bold text-hc-text truncate">{verifiedPatient.name || 'Verified Patient'}</h4>
                  <div className="mt-1 space-y-0.5">
                    <p className="text-[11px] font-mono font-bold text-hc-teal">
                      Patient ID: {verifiedPatient.patientId || 'Verified'}
                    </p>
                    {verifiedPatient.walletAddress && (
                      <p className="text-[10px] font-mono text-hc-text-muted truncate">
                        Wallet: {verifiedPatient.walletAddress}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-hc-success/20 text-[10px] text-hc-text-muted">
                    <span>Blood: <strong className="text-hc-text">{verifiedPatient.bloodGroup || 'O+'}</strong></span>
                    <span>&bull;</span>
                    <span>Records: <strong className="text-hc-text">{verifiedPatient.recordCount ?? 0} active</strong></span>
                  </div>
                </div>
              </div>
            )}

            {/* 5. ERROR STATE */}
            {status === 'error' && (
              <div className="w-full text-center py-6 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-hc-danger-soft text-hc-danger flex items-center justify-center mx-auto">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-hc-text">Scan / Lookup Issue</h4>
                  <p className="text-xs text-hc-danger mt-1 max-w-xs mx-auto leading-relaxed font-medium">{errorMessage}</p>
                </div>
                <div className="flex gap-2 justify-center pt-2">
                  <button
                    type="button"
                    onClick={startCamera}
                    className="hc-btn hc-btn-primary hc-btn-sm"
                  >
                    Scan Again
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActiveTab('manual'); setStatus('idle'); }}
                    className="hc-btn hc-btn-secondary hc-btn-sm"
                  >
                    Manual Entry
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* MANUAL ENTRY TAB */
          <form onSubmit={handleManualSubmit} className="w-full space-y-4 py-2">
            <div>
              <label className="block text-[10px] uppercase font-bold text-hc-text-muted tracking-wider mb-1.5">
                Patient ID or Ethereum Wallet Address
              </label>
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="e.g. MC-PAT-2026-000001 or 0x..."
                className="hc-input font-mono text-xs min-h-[44px]"
                required
              />
              <span className="text-[10px] text-hc-text-muted mt-1 block">
                Enter the unique MediChain Patient ID (MC-PAT-YYYY-XXXXXX) or wallet address.
              </span>
            </div>
            {errorMessage && (
              <p className="text-xs text-hc-danger font-semibold bg-hc-danger-soft p-2.5 rounded-lg border border-hc-danger/20">
                {errorMessage}
              </p>
            )}
            <button
              type="submit"
              disabled={!manualInput.trim() || status === 'verifying'}
              className="hc-btn hc-btn-primary w-full justify-center min-h-[44px] font-bold text-xs"
            >
              {status === 'verifying' ? 'Verifying...' : 'Find Patient'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default QRScanner;
