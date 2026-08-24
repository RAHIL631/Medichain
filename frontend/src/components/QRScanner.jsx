// frontend/src/components/QRScanner.jsx
// Production High-Performance QR Code Scanner & Identity Resolver for MediChain
// Robust camera initialization with StrictMode-safe guard, dual-constraint fallback,
// video readiness verification, 8-second watchdog, and clean teardown on every exit path.

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

// ─────────────────────────────────────────────────────────────────────────────
// Diagnostic panel (dev-only) — never shown in production
// ─────────────────────────────────────────────────────────────────────────────
const IS_DEV = process.env.NODE_ENV !== 'production';

const QRScanner = ({ 
  onScan, 
  onScanSuccess, 
  onScanError, 
  onError, 
  onClose, 
  autoStart = false 
}) => {
  const [activeTab, setActiveTab]             = useState('scan'); // 'scan' | 'upload' | 'manual'
  const [status, setStatus]                   = useState('idle'); // always start idle — autoStart handled by effect
  const [facingMode, setFacingMode]           = useState('environment'); // 'environment' (rear) | 'user' (front)
  const [errorMessage, setErrorMessage]       = useState('');
  const [manualInput, setManualInput]         = useState('');
  const [verifiedPatient, setVerifiedPatient] = useState(null);
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);

  // Dev diagnostic state
  const [diag, setDiag] = useState({
    secureContext: '—',
    cameraAPI: '—',
    permission: '—',
    stream: 'NOT CONNECTED',
    videoReady: 'NO',
    videoWidth: 0,
    videoHeight: 0,
    qrDecoder: 'STOPPED',
  });

  const videoRef          = useRef(null);
  const readerRef         = useRef(null);
  const streamRef         = useRef(null);
  const fileInputRef      = useRef(null);
  const isScanningRef     = useRef(false);
  const isInitializingRef = useRef(false);
  const timeoutRef        = useRef(null);
  // Tracks whether this component instance is still mounted
  const mountedRef        = useRef(true);

  // ── Stop camera stream and scanning loop cleanly ─────────────────────────
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
      } catch { /* silent */ }
      try {
        readerRef.current.stopContinuousDecode();
      } catch { /* silent */ }
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
      try {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      } catch {}
    }

    if (mountedRef.current) {
      setDiag(d => ({ ...d, stream: 'NOT CONNECTED', videoReady: 'NO', videoWidth: 0, videoHeight: 0, qrDecoder: 'STOPPED' }));
    }
  }, []);

  // ── Initialize ZXing Reader instance once + enumerate cameras ────────────
  useEffect(() => {
    mountedRef.current = true;
    readerRef.current = new BrowserQRCodeReader();

    if (navigator.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then((devices) => {
        const videoInputs = devices.filter((d) => d.kind === 'videoinput');
        if (mountedRef.current) setHasMultipleCameras(videoInputs.length > 1);
      }).catch(() => {});
    }

    return () => {
      mountedRef.current = false;
      stopCamera();
    };
  }, [stopCamera]);

  // ── Patient Verification / Lookup ────────────────────────────────────────
  const verifyAndLookup = useCallback(async (identifier, rawPayload = '') => {
    stopCamera();
    if (!mountedRef.current) return;
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
      if (!mountedRef.current) return;
      setVerifiedPatient(patientSummary);
      setStatus('success');

      const primaryKey = patientSummary.walletAddress || patientSummary.patientId || identifier;
      setTimeout(() => {
        if (typeof onScan === 'function') onScan(primaryKey, patientSummary);
        if (typeof onScanSuccess === 'function') onScanSuccess(primaryKey, patientSummary);
      }, 700);

    } catch (err) {
      console.warn('[QRScanner] Patient lookup error:', err);
      if (!mountedRef.current) return;
      const errMsg = err.response?.data?.error || err.message || 'Patient ID not found.';
      setStatus('error');
      setErrorMessage(errMsg);
      if (typeof onScanError === 'function') onScanError(err);
      else if (typeof onError === 'function') onError(err);
    }
  }, [stopCamera, onScan, onScanSuccess, onScanError, onError]);

  // ── Handle decoded QR text ────────────────────────────────────────────────
  const handleDecodedText = useCallback((text) => {
    if (!text || !isScanningRef.current) return;
    const identity = extractPatientIdentity(text);
    if (identity && !identity.error) {
      isScanningRef.current = false;
      const key = identity.patientId || identity.walletAddress;
      verifyAndLookup(key, identity.raw || text);
    } else {
      if (mountedRef.current) {
        setErrorMessage(identity?.error || 'This is not a valid MediChain Patient QR.');
      }
    }
  }, [verifyAndLookup]);

  // ══════════════════════════════════════════════════════════════════════════
  // initializeCamera — the fully robust camera startup function
  // ══════════════════════════════════════════════════════════════════════════
  const initializeCamera = useCallback(async () => {
    // Prevent duplicate concurrent initialization attempts
    if (isInitializingRef.current) {
      return;
    }
    if (!mountedRef.current) return;

    isInitializingRef.current = true;

    // Reset state for a fresh attempt
    stopCamera();                   // kills any prior stream immediately
    isInitializingRef.current = true; // re-set because stopCamera() resets it

    if (!mountedRef.current) { isInitializingRef.current = false; return; }
    setStatus('requesting');
    setErrorMessage('');
    setVerifiedPatient(null);

    // ── Guard 1: Secure context ───────────────────────────────────────────
    const isSecure =
      window.isSecureContext ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1';

    if (IS_DEV) {
      setDiag(d => ({
        ...d,
        secureContext: isSecure ? 'YES' : 'NO',
        cameraAPI: (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') ? 'YES' : 'NO',
      }));
    }

    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
      isInitializingRef.current = false;
      if (!mountedRef.current) return;
      setStatus('error');
      setErrorMessage(
        !isSecure
          ? 'Camera access requires a secure HTTPS connection (https://). Please visit the production URL.'
          : 'Camera API is not supported by your browser. Please use Image Upload or Manual Entry.'
      );
      return;
    }

    // ── Guard 2: Permissions query (non-blocking — Firefox/Safari may not support) ──
    if (navigator.permissions && navigator.permissions.query) {
      try {
        const perm = await navigator.permissions.query({ name: 'camera' });
        if (IS_DEV && mountedRef.current) {
          setDiag(d => ({ ...d, permission: perm.state.toUpperCase() }));
        }
        if (perm.state === 'denied') {
          isInitializingRef.current = false;
          if (!mountedRef.current) return;
          setStatus('error');
          setErrorMessage(
            'Camera access is blocked for MediChain.\n\n' +
            'To fix:\n1. Click the camera icon in your browser address bar.\n2. Select "Allow".\n3. Press Try Again.'
          );
          return;
        }
      } catch {
        // Permissions API not supported — proceed and let getUserMedia show the prompt
      }
    }

    // ── Guard 3: 8-second total initialization watchdog ───────────────────
    timeoutRef.current = setTimeout(() => {
      if (!isScanningRef.current && mountedRef.current) {
        console.warn('[QRScanner] Camera stream initialization timed out after 8s');
        stopCamera();
        if (mountedRef.current) {
          setStatus('error');
          setErrorMessage('Unable to start camera. The request timed out after 8 seconds. Check permissions and try again.');
        }
        if (typeof onScanError === 'function') onScanError(new Error('Camera timeout'));
        else if (typeof onError === 'function') onError(new Error('Camera timeout'));
      }
    }, 8000);

    let stream = null;

    try {
      // ── Step 1: Acquire MediaStream (primary constraint, then fallback) ──
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width:  { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch (firstErr) {
        console.warn('[QRScanner] Primary camera constraint failed, trying generic fallback:', firstErr.name, firstErr.message);
        // If user explicitly denied permission, rethrow — don't try fallback
        if (firstErr.name === 'NotAllowedError' || firstErr.name === 'PermissionDeniedError') {
          throw firstErr;
        }
        // Generic fallback — works for all desktop webcams
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      if (!stream || stream.getVideoTracks().length === 0) {
        throw new Error('No video track was received from the camera device.');
      }

      if (!mountedRef.current) {
        // Component unmounted while we awaited stream — release immediately
        stream.getTracks().forEach(t => t.stop());
        isInitializingRef.current = false;
        return;
      }

      streamRef.current = stream;
      if (IS_DEV) setDiag(d => ({ ...d, stream: 'CONNECTED', permission: 'GRANTED' }));

      // Update multi-camera flag now that permission is granted
      if (navigator.mediaDevices.enumerateDevices) {
        navigator.mediaDevices.enumerateDevices().then((devices) => {
          const videoInputs = devices.filter((d) => d.kind === 'videoinput');
          if (mountedRef.current) setHasMultipleCameras(videoInputs.length > 1);
        }).catch(() => {});
      }

      // ── Step 2: Attach stream to <video> element ──────────────────────
      // The video element renders whenever status is 'requesting' | 'active' | 'verifying'.
      // We set status='requesting' above, so React has already rendered <video>.
      // Use requestAnimationFrame + a retry loop to handle the React commit timing.
      const getVideoEl = () => new Promise((resolve, reject) => {
        // Immediate check
        if (videoRef.current) { resolve(videoRef.current); return; }

        let attempts = 0;
        const maxAttempts = 30; // 30 × 50ms = 1500ms max wait for DOM commit

        const poll = () => {
          attempts++;
          if (videoRef.current) {
            resolve(videoRef.current);
          } else if (attempts >= maxAttempts) {
            reject(new Error('Video preview element did not appear in DOM after 1.5s. Try again.'));
          } else {
            setTimeout(poll, 50);
          }
        };

        // Let React flush the DOM first, then start polling
        requestAnimationFrame(() => setTimeout(poll, 50));
      });

      const videoEl = await getVideoEl();

      if (!mountedRef.current) {
        stream.getTracks().forEach(t => t.stop());
        isInitializingRef.current = false;
        return;
      }

      // Ensure required attributes for mobile Safari / iOS
      videoEl.setAttribute('autoplay',    'true');
      videoEl.setAttribute('playsinline', 'true');
      videoEl.setAttribute('muted',       'true');
      videoEl.muted      = true;
      videoEl.srcObject  = stream;

      // ── Step 3: Call play() ───────────────────────────────────────────
      try {
        await videoEl.play();
      } catch (playErr) {
        // play() can reject if the element is paused by browser policy.
        // This is usually recoverable — video will play as soon as it loads.
        console.warn('[QRScanner] video.play() warning (non-fatal):', playErr.name, playErr.message);
      }

      // ── Step 4: Wait for actual video frame data (dimensions > 0) ────
      await new Promise((resolve) => {
        // Already has data?
        if (videoEl.videoWidth > 0 && videoEl.videoHeight > 0) {
          resolve(); return;
        }

        let resolved = false;
        const finish = () => {
          if (resolved) return;
          resolved = true;
          videoEl.removeEventListener('loadedmetadata', finish);
          videoEl.removeEventListener('canplay', finish);
          videoEl.removeEventListener('playing', finish);
          clearInterval(dimPoll);
          clearTimeout(dimTimeout);
          resolve();
        };

        videoEl.addEventListener('loadedmetadata', finish);
        videoEl.addEventListener('canplay',        finish);
        videoEl.addEventListener('playing',        finish);

        // Polling fallback (covers browsers that skip the above events)
        const dimPoll = setInterval(() => {
          if (videoEl.videoWidth > 0 && videoEl.videoHeight > 0) {
            clearInterval(dimPoll);
            finish();
          }
        }, 100);

        // Give up waiting for dimensions after 3s — stream may still work
        const dimTimeout = setTimeout(() => {
          clearInterval(dimPoll);
          finish();
        }, 3000);
      });

      // ── Step 5: Cancel the 8s watchdog — we made it ──────────────────
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      if (!mountedRef.current) {
        stream.getTracks().forEach(t => t.stop());
        isInitializingRef.current = false;
        return;
      }

      if (IS_DEV) {
        const w = videoEl.videoWidth;
        const h = videoEl.videoHeight;
        setDiag(d => ({
          ...d,
          videoReady: w > 0 && h > 0 ? 'YES' : 'PENDING',
          videoWidth:  w,
          videoHeight: h,
        }));
        console.log('[QRScanner] Camera ready:', {
          secureContext: isSecure ? 'YES' : 'NO',
          protocol: window.location.protocol,
          stream: 'CONNECTED',
          videoWidth: w,
          videoHeight: h,
        });
      }

      // ── Step 6: Mark as scanning-active and transition UI ────────────
      isInitializingRef.current = false;
      isScanningRef.current     = true;
      setStatus('active');

      // ── Step 7: Start ZXing continuous QR decode ──────────────────────
      if (!readerRef.current) {
        readerRef.current = new BrowserQRCodeReader();
      }

      if (IS_DEV) setDiag(d => ({ ...d, qrDecoder: 'RUNNING' }));

      readerRef.current.decodeFromVideoElementContinuously(
        videoEl,
        (result, _err) => {
          if (result && isScanningRef.current) {
            const text = result.getText();
            if (text) handleDecodedText(text);
          }
        }
      );

    } catch (camErr) {
      console.error('[QRScanner] Camera initialization error:', camErr.name, camErr.message);
      isInitializingRef.current = false;

      // Clean up any partially acquired stream
      if (stream) {
        try { stream.getTracks().forEach(t => t.stop()); } catch {}
      }
      streamRef.current = null;

      // Cancel the watchdog
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      if (!mountedRef.current) return;

      let userMsg = 'Unable to start camera.';
      const name  = camErr.name || '';

      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        userMsg =
          'Camera permission was denied.\n\nTo fix:\n' +
          '1. Click the camera icon in your browser address bar.\n' +
          '2. Set Camera to "Allow".\n' +
          '3. Press Try Again.';
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        userMsg = 'No camera device was found. Please connect a camera and try again.';
      } else if (name === 'NotReadableError' || name === 'TrackStartError') {
        userMsg = 'The camera is in use by another app. Close other camera apps and try again.';
      } else if (name === 'OverconstrainedError') {
        userMsg = 'Preferred camera unavailable. Please try again and a different camera will be used.';
      } else if (name === 'SecurityError') {
        userMsg = 'Camera access requires a secure HTTPS connection.';
      } else if (name === 'AbortError') {
        userMsg = 'Camera access was aborted. Please try again.';
      } else {
        userMsg = camErr.message || 'Unable to start camera. Check browser permissions and try again.';
      }

      setStatus('error');
      setErrorMessage(userMsg);
      if (IS_DEV) setDiag(d => ({ ...d, stream: 'NOT CONNECTED', permission: name === 'NotAllowedError' ? 'DENIED' : d.permission }));

      if (typeof onScanError === 'function') onScanError(camErr);
      else if (typeof onError === 'function') onError(camErr);
    }
  }, [facingMode, stopCamera, handleDecodedText, onScanError, onError]);

  // ── autoStart: launch camera when component mounts with autoStart=true ──
  // Using a ref to track if we've already auto-started this mount cycle,
  // which prevents React StrictMode double-invocation from double-starting.
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (autoStart && activeTab === 'scan' && !autoStartedRef.current) {
      autoStartedRef.current = true;
      // Give React one frame to flush the initial render before we try to
      // get the video element (critical for StrictMode and slow renders).
      const raf = requestAnimationFrame(() => {
        if (mountedRef.current) {
          initializeCamera();
        }
      });
      return () => cancelAnimationFrame(raf);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, activeTab]);

  // ── facingMode changes: restart camera with new mode ────────────────────
  const facingModeRef = useRef(facingMode);
  useEffect(() => {
    if (facingMode === facingModeRef.current) return; // skip initial render
    facingModeRef.current = facingMode;
    if (status === 'active' || status === 'requesting') {
      initializeCamera();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  // ── Toggle front/rear camera ────────────────────────────────────────────
  const toggleCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // ── QR Code Image Upload Handler ─────────────────────────────────────────
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

  // ── Manual lookup handler ────────────────────────────────────────────────
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
    autoStartedRef.current = false;
    if (typeof onClose === 'function') onClose();
  };

  // ── Handle "Launch Camera Scanner" button click ──────────────────────────
  const handleStartClick = () => {
    autoStartedRef.current = false; // allow re-init from user action
    initializeCamera();
  };

  // ── Handle "Try Again" button ────────────────────────────────────────────
  const handleTryAgain = () => {
    autoStartedRef.current = false;
    initializeCamera();
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
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
        
        {/* ── 1. LIVE CAMERA TAB ──────────────────────────────────────────── */}
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
                  onClick={handleStartClick}
                  className="hc-btn hc-btn-primary w-full justify-center min-h-[44px] shadow-hc-card font-bold text-xs"
                  id="start-qr-scanner-btn"
                >
                  <Camera className="w-4 h-4" />
                  Launch Camera Scanner
                </button>
              </div>
            )}

            {/* LIVE CAMERA PREVIEW CONTAINER
                Rendered for requesting, active, and verifying states.
                The <video> element MUST exist in the DOM before we attach srcObject.
                It is always rendered (not conditionally) within this block so the ref
                is stable throughout the requesting → active transition. */}
            {(status === 'requesting' || status === 'active' || status === 'verifying') && (
              <div className="relative w-full aspect-square max-w-[320px] rounded-2xl overflow-hidden bg-black shadow-inner border-2 border-hc-border">
                {/* ↓ ALWAYS RENDERED — ref must be stable before stream is attached */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{ display: 'block' }}
                />

                {/* Requesting overlay — shows spinner while stream is being acquired */}
                {status === 'requesting' && (
                  <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center p-4 text-center z-10 space-y-3">
                    <div className="w-10 h-10 border-[3px] border-hc-blue border-t-transparent rounded-full animate-spin mx-auto" />
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
                      <div className="absolute -top-1 -left-1 w-4 h-4 border-t-[3px] border-l-[3px] border-hc-success" />
                      <div className="absolute -top-1 -right-1 w-4 h-4 border-t-[3px] border-r-[3px] border-hc-success" />
                      <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-[3px] border-l-[3px] border-hc-success" />
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-[3px] border-r-[3px] border-hc-success" />
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
                  <p className="text-xs text-hc-danger mt-1 max-w-xs mx-auto leading-relaxed font-medium whitespace-pre-line">{errorMessage}</p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center pt-2">
                  <button
                    type="button"
                    onClick={handleTryAgain}
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

            {/* DEV-ONLY DIAGNOSTIC PANEL */}
            {IS_DEV && (status === 'active' || status === 'requesting' || status === 'error') && (
              <details className="w-full mt-3 text-[10px] font-mono bg-black/80 text-green-400 rounded-lg p-2 border border-green-900 cursor-pointer" open={status === 'error'}>
                <summary className="text-green-300 font-bold text-[10px] cursor-pointer">🔧 Dev Diagnostics</summary>
                <div className="mt-1 space-y-0.5">
                  <div>Secure Context: <span className={diag.secureContext === 'YES' ? 'text-green-400' : 'text-red-400'}>{diag.secureContext}</span></div>
                  <div>Camera API: <span className={diag.cameraAPI === 'YES' ? 'text-green-400' : 'text-red-400'}>{diag.cameraAPI}</span></div>
                  <div>Permission: <span className={diag.permission === 'GRANTED' ? 'text-green-400' : diag.permission === 'DENIED' ? 'text-red-400' : 'text-yellow-400'}>{diag.permission}</span></div>
                  <div>Stream: <span className={diag.stream === 'CONNECTED' ? 'text-green-400' : 'text-red-400'}>{diag.stream}</span></div>
                  <div>Video Ready: <span className={diag.videoReady === 'YES' ? 'text-green-400' : 'text-yellow-400'}>{diag.videoReady}</span></div>
                  <div>Video: {diag.videoWidth}×{diag.videoHeight}</div>
                  <div>QR Decoder: <span className={diag.qrDecoder === 'RUNNING' ? 'text-green-400' : 'text-gray-400'}>{diag.qrDecoder}</span></div>
                </div>
              </details>
            )}
          </div>
        )}

        {/* ── 2. UPLOAD QR IMAGE TAB ──────────────────────────────────────── */}
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
                <p className="text-xs font-bold text-hc-text">Decoding QR &amp; Verifying Patient...</p>
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

        {/* ── 3. MANUAL ENTRY TAB ────────────────────────────────────────── */}
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
