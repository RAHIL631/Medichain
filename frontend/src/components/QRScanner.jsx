// frontend/src/components/QRScanner.jsx
// Production High-Performance QR Code Scanner & Identity Resolver for MediChain
// Supports Live WebRTC camera with ZXing decodeFromVideoElementContinuously, front/rear camera toggle,
// robust error handling, camera permission diagnostics, QR image file upload, and Manual Patient ID lookup.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BrowserQRCodeReader } from '@zxing/library';
import api from '../utils/api';
import {
  QrCode, Camera, RefreshCw, AlertCircle, CheckCircle2,
  Edit3, X, ShieldCheck, Upload, Image as ImageIcon
} from 'lucide-react';

/**
 * Extracts and validates patient identifier from diverse QR payloads:
 * - Structured JSON: {"type":"MEDICHAIN_PATIENT", "version":1, "patientId":"MC-PAT-..."}
 * - Legacy JSON: {"type":"medichain_health_id", "address":"0x..."}
 * - URL format: https://.../?patient=MC-PAT-...
 * - Raw Patient ID string: "MC-PAT-2026-000001"
 * - Raw Ethereum address: "0x..."
 */
export function extractPatientIdentity(rawText) {
  if (!rawText || typeof rawText !== 'string') return null;
  const trimmed = rawText.trim();

  // 1. Try parsing JSON
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === 'object') {
      const pid = parsed.patientId || parsed.id || parsed.patient_id;
      if (pid && typeof pid === 'string') {
        const cleanPid = pid.trim();
        if (/^MC-PAT-/i.test(cleanPid) || /^[0-9a-fA-F]{24}$/.test(cleanPid)) {
          return { patientId: cleanPid, raw: trimmed };
        }
      }

      const addr = parsed.address || parsed.patientAddress || parsed.walletAddress || parsed.wallet;
      if (addr && typeof addr === 'string' && /^0x[a-fA-F0-9]{40}$/i.test(addr.trim())) {
        return { walletAddress: addr.trim(), raw: trimmed };
      }

      if (parsed.type === 'MEDICHAIN_PATIENT' && parsed.patientId) {
        return { patientId: String(parsed.patientId).trim(), raw: trimmed };
      }
    }
  } catch {
    /* Not JSON */
  }

  // 2. Try URL query parameter or path extraction
  try {
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      const url = new URL(trimmed);
      const urlParam = url.searchParams.get('patient') || url.searchParams.get('patientId') || url.searchParams.get('id') || url.searchParams.get('address');
      if (urlParam) {
        if (/^MC-PAT-/i.test(urlParam.trim())) return { patientId: urlParam.trim(), raw: trimmed };
        if (/^0x[a-fA-F0-9]{40}$/i.test(urlParam.trim())) return { walletAddress: urlParam.trim(), raw: trimmed };
      }
      const pathParts = url.pathname.split('/').filter(Boolean);
      for (const part of pathParts) {
        if (/^MC-PAT-/i.test(part)) return { patientId: part.trim(), raw: trimmed };
        if (/^0x[a-fA-F0-9]{40}$/i.test(part)) return { walletAddress: part.trim(), raw: trimmed };
      }
    }
  } catch {
    /* Not valid URL */
  }

  // 3. Raw Patient ID match (e.g. MC-PAT-2026-000001)
  const patMatch = trimmed.match(/MC-PAT-\d{4}-[A-Z0-9]{6}/i) || trimmed.match(/MC-PAT-[A-Z0-9-]+/i);
  if (patMatch) {
    return { patientId: patMatch[0].trim(), raw: trimmed };
  }

  // 4. Raw Ethereum address match
  const addrMatch = trimmed.match(/0x[a-fA-F0-9]{40}/i);
  if (addrMatch) {
    return { walletAddress: addrMatch[0].trim(), raw: trimmed };
  }

  // 5. Raw MongoDB 24-character ObjectId match
  if (/^[0-9a-fA-F]{24}$/.test(trimmed)) {
    return { patientId: trimmed, raw: trimmed };
  }

  return { error: 'Scanned QR is not a recognized MediChain Patient ID or wallet.' };
}

const QRScanner = ({ 
  onScan, 
  onScanSuccess, 
  onScanError, 
  onError, 
  onClose, 
  autoStart = false 
}) => {
  const [activeTab, setActiveTab]             = useState('scan'); // 'scan' | 'upload' | 'manual'
  const [status, setStatus]                   = useState(autoStart ? 'requesting' : 'idle'); // 'idle' | 'requesting' | 'active' | 'verifying' | 'success' | 'error'
  const [facingMode, setFacingMode]           = useState('environment'); // 'environment' (rear) | 'user' (front)
  const [errorMessage, setErrorMessage]       = useState('');
  const [manualInput, setManualInput]         = useState('');
  const [verifiedPatient, setVerifiedPatient] = useState(null);
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);

  const videoRef          = useRef(null);
  const readerRef         = useRef(null);
  const streamRef         = useRef(null);
  const fileInputRef      = useRef(null);
  const isScanningRef     = useRef(false);
  const isInitializingRef = useRef(false);
  const timeoutRef        = useRef(null);

  // --- Stop camera stream and scanning loop cleanly ---
  const stopCamera = useCallback(() => {
    isScanningRef.current = false;
    isInitializingRef.current = false;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (readerRef.current) {
      try {
        readerRef.current.reset();
        readerRef.current.stopContinuousDecode();
      } catch {
        /* silent */
      }
    }

    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((t) => {
          try { t.stop(); } catch {}
        });
      } catch {}
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Initialize ZXing Reader instance and enumerate devices
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
      }, 700);

    } catch (err) {
      console.warn('[QRScanner] Patient lookup error:', err);
      const errMsg = err.response?.data?.error || err.message || 'Patient ID not found.';
      setStatus('error');
      setErrorMessage(errMsg);

      if (typeof onScanError === 'function') {
        onScanError(err);
      } else if (typeof onError === 'function') {
        onError(err);
      }
    }
  }, [stopCamera, onScan, onScanSuccess, onScanError, onError]);

  // Handle a successfully decoded text string from camera or file
  const handleDecodedText = useCallback((text) => {
    if (!text || !isScanningRef.current) return;
    const identity = extractPatientIdentity(text);
    if (identity && !identity.error) {
      isScanningRef.current = false;
      const key = identity.patientId || identity.walletAddress;
      verifyAndLookup(key, identity.raw || text);
    } else {
      setErrorMessage(identity?.error || 'This is not a valid MediChain Patient QR.');
    }
  }, [verifyAndLookup]);

  // --- Start Camera & Frame Analysis ---
  const startCamera = useCallback(async () => {
    if (isInitializingRef.current) return;
    isInitializingRef.current = true;

    stopCamera();
    setStatus('requesting');
    setErrorMessage('');
    setVerifiedPatient(null);

    // Guard 1: Secure context check
    const isSecure = window.isSecureContext || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      isInitializingRef.current = false;
      setStatus('error');
      setErrorMessage(
        !isSecure
          ? 'Camera access requires a secure HTTPS connection (https://).'
          : 'Camera access is not supported by your browser. Please use Image Upload or Manual Entry.'
      );
      return;
    }

    // Guard 2: Permissions query check if supported
    if (navigator.permissions && navigator.permissions.query) {
      try {
        const perm = await navigator.permissions.query({ name: 'camera' });
        if (perm.state === 'denied') {
          isInitializingRef.current = false;
          setStatus('error');
          setErrorMessage('Camera access is blocked for MediChain. Please allow camera access in your browser site settings and try again.');
          return;
        }
      } catch {
        // Permissions query for 'camera' may not be supported by some browsers (e.g. Firefox/Safari)
      }
    }

    // Guard 3: 8-second initialization timeout
    timeoutRef.current = setTimeout(() => {
      if (isScanningRef.current === false) {
        console.warn('[QRScanner] Camera stream initialization timed out after 8s');
        stopCamera();
        setStatus('error');
        setErrorMessage('Unable to start camera. Request timed out after 8 seconds.');
        if (typeof onScanError === 'function') onScanError(new Error('Camera timeout'));
        else if (typeof onError === 'function') onError(new Error('Camera timeout'));
      }
    }, 8000);

    let stream = null;

    try {
      // 1. First try preferred constraints (mobile rear / selected facingMode)
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });
      } catch (firstErr) {
        console.warn('[QRScanner] Primary camera constraint failed, trying fallback:', firstErr);
        // If user denied permission explicitly, rethrow immediately
        if (firstErr.name === 'NotAllowedError' || firstErr.name === 'PermissionDeniedError') {
          throw firstErr;
        }
        // 2. Fallback for desktop / webcams without facingMode
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      }

      if (!stream) {
        throw new Error('No video stream received from camera device.');
      }

      streamRef.current = stream;

      // Update multiple camera detection
      if (navigator.mediaDevices.enumerateDevices) {
        navigator.mediaDevices.enumerateDevices().then((devices) => {
          const videoInputs = devices.filter((d) => d.kind === 'videoinput');
          setHasMultipleCameras(videoInputs.length > 1);
        }).catch(() => {});
      }

      // 3. Attach stream to <video> element
      const videoEl = videoRef.current;
      if (!videoEl) {
        throw new Error('Video preview element is not ready in DOM.');
      }

      videoEl.srcObject = stream;
      videoEl.setAttribute('playsinline', 'true');
      videoEl.setAttribute('autoplay', 'true');
      videoEl.muted = true;

      try {
        await videoEl.play();
      } catch (playErr) {
        console.warn('[QRScanner] Video play warning:', playErr);
      }

      // 4. Verify video dimensions
      await new Promise((resolve) => {
        if (videoEl.videoWidth > 0 && videoEl.videoHeight > 0) {
          resolve();
          return;
        }

        let resolved = false;
        const markReady = () => {
          if (!resolved) {
            resolved = true;
            videoEl.removeEventListener('loadedmetadata', markReady);
            videoEl.removeEventListener('canplay', markReady);
            resolve();
          }
        };

        videoEl.addEventListener('loadedmetadata', markReady);
        videoEl.addEventListener('canplay', markReady);

        const checkInterval = setInterval(() => {
          if (videoEl.videoWidth > 0 && videoEl.videoHeight > 0) {
            clearInterval(checkInterval);
            markReady();
          }
        }, 100);

        setTimeout(() => {
          clearInterval(checkInterval);
          markReady();
        }, 3000);
      });

      // Clear timeout on successful start
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      isInitializingRef.current = false;
      isScanningRef.current = true;
      setStatus('active');

      // 5. Start continuous QR decoding
      if (!readerRef.current) {
        readerRef.current = new BrowserQRCodeReader();
      }

      readerRef.current.decodeFromVideoElementContinuously(
        videoEl,
        (result, err) => {
          if (result && isScanningRef.current) {
            const text = result.getText();
            if (text) {
              handleDecodedText(text);
            }
          }
        }
      );

    } catch (camErr) {
      console.error('[QRScanner] Camera stream error:', camErr);
      isInitializingRef.current = false;
      stopCamera();
      setStatus('error');

      let userMsg = 'Unable to start camera.';
      const name = camErr.name || '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        userMsg = 'Camera permission was denied. Allow camera access for this website and try again.';
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        userMsg = 'No camera was detected.';
      } else if (name === 'NotReadableError' || name === 'TrackStartError') {
        userMsg = 'The camera is being used by another application.';
      } else if (name === 'OverconstrainedError') {
        userMsg = 'Preferred camera unavailable. Trying another camera.';
      } else if (name === 'SecurityError') {
        userMsg = 'Camera access requires a secure HTTPS connection.';
      } else if (name === 'AbortError') {
        userMsg = 'Camera access was aborted.';
      } else {
        userMsg = camErr.message || 'Unable to start camera. Check permissions and try again.';
      }

      setErrorMessage(userMsg);

      if (typeof onScanError === 'function') {
        onScanError(camErr);
      } else if (typeof onError === 'function') {
        onError(camErr);
      }
    }
  }, [facingMode, stopCamera, handleDecodedText, onScanError, onError]);

  // Handle autoStart or facingMode changes
  useEffect(() => {
    if (activeTab === 'scan') {
      if (autoStart || status === 'active' || status === 'requesting') {
        startCamera();
      }
    }
  }, [facingMode, autoStart, activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle switching front/rear camera
  const toggleCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // --- QR Code Image Upload Handler (Screenshot / Image File) ---
  const handleImageFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus('verifying');
    setErrorMessage('');

    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      const fileUrl = URL.createObjectURL(file);

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = fileUrl;
      });

      if (!readerRef.current) {
        readerRef.current = new BrowserQRCodeReader();
      }

      // Decode directly from the image element
      const result = await readerRef.current.decodeFromImageElement(img);
      URL.revokeObjectURL(fileUrl);

      if (result && result.getText()) {
        isScanningRef.current = true;
        handleDecodedText(result.getText());
      } else {
        throw new Error('No QR code found in the uploaded image.');
      }

    } catch (err) {
      console.warn('[QRScanner] Image decode error:', err);
      setStatus('error');
      setErrorMessage('Could not find a valid QR code in this image. Please upload a clear QR photo or use Manual Entry.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

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

  const handleClose = () => {
    stopCamera();
    setStatus('idle');
    if (typeof onClose === 'function') {
      onClose();
    }
  };

  return (
    <div className="w-full max-w-md mx-auto hc-card overflow-hidden border border-hc-border shadow-xl">
      {/* Header Tabs */}
      <div className="flex border-b border-hc-border bg-hc-bg-alt">
        <button
          type="button"
          onClick={() => { setActiveTab('scan'); setErrorMessage(''); }}
          className={`flex-1 py-3 text-[11px] sm:text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'scan'
              ? 'text-hc-blue border-b-2 border-hc-blue bg-hc-surface'
              : 'text-hc-text-muted hover:text-hc-text'
          }`}
        >
          <Camera className="w-3.5 h-3.5" />
          Camera
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab('upload'); stopCamera(); setStatus('idle'); setErrorMessage(''); }}
          className={`flex-1 py-3 text-[11px] sm:text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'upload'
              ? 'text-hc-blue border-b-2 border-hc-blue bg-hc-surface'
              : 'text-hc-text-muted hover:text-hc-text'
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5" />
          Upload Image
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab('manual'); stopCamera(); setStatus('idle'); setErrorMessage(''); }}
          className={`flex-1 py-3 text-[11px] sm:text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'manual'
              ? 'text-hc-blue border-b-2 border-hc-blue bg-hc-surface'
              : 'text-hc-text-muted hover:text-hc-text'
          }`}
        >
          <Edit3 className="w-3.5 h-3.5" />
          Manual
        </button>
      </div>

      <div className="p-4 sm:p-6 flex flex-col items-center">
        
        {/* ── 1. LIVE CAMERA TAB ────────────────────────────────────────── */}
        {activeTab === 'scan' && (
          <div className="w-full flex flex-col items-center">
            
            {/* IDLE STATE */}
            {status === 'idle' && (
              <div className="text-center py-6 sm:py-8 w-full">
                <div className="w-16 h-16 rounded-2xl bg-hc-blue-soft text-hc-blue flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <QrCode className="w-8 h-8" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-hc-text mb-1">Scan Patient QR Health ID</h3>
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

            {/* LIVE CAMERA PREVIEW CONTAINER (Shown during requesting, active, and verifying) */}
            {(status === 'requesting' || status === 'active' || status === 'verifying') && (
              <div className="relative w-full aspect-square max-w-[320px] rounded-2xl overflow-hidden bg-black shadow-inner border-2 border-hc-border">
                {/* Real video element always rendered */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />

                {/* Requesting Overlay */}
                {status === 'requesting' && (
                  <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center p-4 text-center z-10 space-y-3">
                    <div className="w-10 h-10 border-3 border-hc-blue border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-xs font-bold text-white">Requesting camera permission...</p>
                    <p className="text-[11px] text-gray-300 max-w-[200px]">
                      Please click &quot;Allow&quot; if your browser prompts for camera access.
                    </p>
                  </div>
                )}

                {/* Targeting Reticle Overlay (active / verifying) */}
                {(status === 'active' || status === 'verifying') && (
                  <>
                    <div className="absolute inset-0 border-[28px] border-black/40 pointer-events-none" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-hc-success rounded-xl pointer-events-none shadow-[0_0_15px_rgba(34,197,94,0.4)]">
                      <div className="absolute -top-1 -left-1 w-4 h-4 border-t-3 border-l-3 border-hc-success" />
                      <div className="absolute -top-1 -right-1 w-4 h-4 border-t-3 border-r-3 border-hc-success" />
                      <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-3 border-l-3 border-hc-success" />
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-3 border-r-3 border-hc-success" />
                      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-hc-success to-transparent shadow-[0_0_10px_#22c55e] animate-pulse" />
                    </div>
                  </>
                )}

                {/* Top Controls: Switch Camera & Close */}
                <div className="absolute top-2 left-2 right-2 flex items-center justify-between z-20">
                  {hasMultipleCameras && (
                    <button
                      type="button"
                      onClick={toggleCamera}
                      className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] font-bold flex items-center gap-1 hover:bg-black/80 transition-colors"
                      title="Switch Camera"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Switch
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleClose}
                    className="ml-auto p-1.5 rounded-full bg-black/60 backdrop-blur-md text-white hover:bg-black/80 transition-colors"
                    aria-label="Close Scanner"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Bottom Status Banner */}
                <div className="absolute bottom-2 left-2 right-2 px-3 py-1.5 rounded-xl bg-black/75 backdrop-blur-md text-center z-20">
                  <p className="text-[11px] font-semibold text-white">
                    {status === 'verifying' 
                      ? 'Verifying patient identity...' 
                      : status === 'requesting'
                      ? 'Connecting camera...'
                      : 'Point camera at the patient\'s MediChain QR code.'}
                  </p>
                </div>
              </div>
            )}

            {/* SUCCESS BADGE */}
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

            {/* ERROR STATE */}
            {status === 'error' && (
              <div className="w-full text-center py-6 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-hc-danger-soft text-hc-danger flex items-center justify-center mx-auto">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-hc-text">Camera Scan Issue</h4>
                  <p className="text-xs text-hc-danger mt-1 max-w-xs mx-auto leading-relaxed font-medium">{errorMessage}</p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center pt-2">
                  <button
                    type="button"
                    onClick={startCamera}
                    className="hc-btn hc-btn-primary hc-btn-sm"
                  >
                    Try Again
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActiveTab('upload'); setStatus('idle'); setErrorMessage(''); }}
                    className="hc-btn hc-btn-secondary hc-btn-sm"
                  >
                    Upload QR Image
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActiveTab('manual'); setStatus('idle'); setErrorMessage(''); }}
                    className="hc-btn hc-btn-secondary hc-btn-sm"
                  >
                    Enter ID
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── 2. UPLOAD QR IMAGE TAB ───────────────────────────────────── */}
        {activeTab === 'upload' && (
          <div className="w-full flex flex-col items-center py-4 space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageFile}
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-hc-border hover:border-hc-blue rounded-2xl p-8 text-center cursor-pointer transition-all bg-hc-bg-alt hover:bg-hc-surface group"
            >
              <div className="w-14 h-14 rounded-2xl bg-hc-blue-soft text-hc-blue flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform">
                <Upload className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-bold text-hc-text mb-1">Select QR Code Image</h4>
              <p className="text-xs text-hc-text-muted max-w-xs mx-auto">
                Upload a screenshot, saved badge PNG, or photo of the patient's QR code.
              </p>
            </div>

            {status === 'verifying' && (
              <div className="text-center py-4 space-y-2">
                <div className="w-8 h-8 border-2 border-hc-blue border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-bold text-hc-text">Decoding QR & Verifying Patient...</p>
              </div>
            )}

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
                  <p className="text-[11px] font-mono font-bold text-hc-teal mt-0.5">
                    Patient ID: {verifiedPatient.patientId || 'Verified'}
                  </p>
                </div>
              </div>
            )}

            {errorMessage && status !== 'success' && (
              <p className="text-xs text-hc-danger font-semibold bg-hc-danger-soft p-3 rounded-xl border border-hc-danger/20 text-center w-full">
                {errorMessage}
              </p>
            )}
          </div>
        )}

        {/* ── 3. MANUAL ENTRY TAB ──────────────────────────────────────── */}
        {activeTab === 'manual' && (
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
                  <p className="text-[11px] font-mono font-bold text-hc-teal mt-0.5">
                    Patient ID: {verifiedPatient.patientId || 'Verified'}
                  </p>
                </div>
              </div>
            )}

            {errorMessage && status !== 'success' && (
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
