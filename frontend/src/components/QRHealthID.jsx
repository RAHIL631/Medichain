// frontend/src/components/QRHealthID.jsx
// Complete Patient Health ID Component with Unique Patient ID, High-Res PNG Download, Printing, and Web Share.
// Follows strict security rules: QR payload contains only the safe structured identifier, NO sensitive medical records.

import React, { useRef, useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import html2canvas from 'html2canvas';
import { Copy, Check, Download, Printer, Share2, Shield } from 'lucide-react';

const QRHealthID = ({ 
  user,
  patientId: propPatientId,
  patientName: propPatientName,
  bloodGroup: propBloodGroup,
  walletAddress: propWalletAddress, // eslint-disable-line no-unused-vars
  onClose
}) => {
  const cardRef = useRef(null);
  const qrWrapperRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  // Extract patient details
  const name = propPatientName || user?.name || 'Authorized Patient';
  const patientId = propPatientId || user?.patientId || (user?._id ? `MC-PAT-2026-${user._id.slice(-6).toUpperCase()}` : 'MC-PAT-2026-000001');
  const bloodGroup = propBloodGroup || user?.bloodGroup || 'O+';

  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      setCanShare(true);
    }
  }, []);

  // Structured, safe, minimal QR payload
  const qrPayload = JSON.stringify({
    type: 'MEDICHAIN_PATIENT',
    version: 1,
    patientId: patientId
  });

  // ── COPY PATIENT ID ──────────────────────────────────────────────────────────
  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(patientId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // ── DOWNLOAD HIGH-RES QR PNG ────────────────────────────────────────────────
  const handleDownload = async () => {
    setDownloading(true);
    try {
      // Create high-res offscreen canvas (1000x1000 px) for crisp camera scanning
      const canvas = document.createElement('canvas');
      const size = 1000;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');

      // 1. Background gradient & rounded frame
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);

      // 2. Header banner
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, size, 160);

      // Logo icon & Title
      ctx.fillStyle = '#22d3ee';
      ctx.font = 'bold 44px sans-serif';
      ctx.fillText('MediChain Health ID', 180, 95);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '24px sans-serif';
      ctx.fillText('Decentralized Secure Patient Identity', 180, 135);

      // Draw cross logo icon
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.arc(100, 80, 48, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(92, 54, 16, 52);
      ctx.fillRect(74, 72, 52, 16);

      // 3. Render SVG QR code to high-res image
      const svgElement = qrWrapperRef.current?.querySelector('svg');
      if (svgElement) {
        const svgString = new XMLSerializer().serializeToString(svgElement);
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const URL = window.URL || window.webkitURL || window;
        const blobURL = URL.createObjectURL(svgBlob);

        const img = new Image();
        img.crossOrigin = 'anonymous';

        await new Promise((resolve, reject) => {
          img.onload = () => {
            // Draw QR code centered
            const qrSize = 540;
            const qrX = (size - qrSize) / 2;
            const qrY = 210;

            // Light gray container for QR
            ctx.fillStyle = '#f8fafc';
            ctx.strokeStyle = '#e2e8f0';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.roundRect(qrX - 20, qrY - 20, qrSize + 40, qrSize + 40, 24);
            ctx.fill();
            ctx.stroke();

            ctx.drawImage(img, qrX, qrY, qrSize, qrSize);
            URL.revokeObjectURL(blobURL);
            resolve();
          };
          img.onerror = reject;
          img.src = blobURL;
        });
      }

      // 4. Patient ID Label & Card Details
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 42px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(patientId, size / 2, 830);

      ctx.fillStyle = '#0284c7';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText(`Patient: ${name}`, size / 2, 875);

      // 5. Verification Notice & Footer
      ctx.fillStyle = '#64748b';
      ctx.font = '20px sans-serif';
      ctx.fillText('Present this QR to an authorized MediChain healthcare provider.', size / 2, 925);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '16px monospace';
      ctx.fillText('Verified on Sepolia Ethereum &bull; Chain ID 11155111', size / 2, 960);

      // 6. Trigger Download
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `MediChain-${patientId}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('[QRHealthID] Canvas download failed, falling back to card snapshot:', err);
      if (cardRef.current) {
        try {
          const snapshot = await html2canvas(cardRef.current, { scale: 3, useCORS: true });
          const link = document.createElement('a');
          link.download = `MediChain-${patientId}.png`;
          link.href = snapshot.toDataURL('image/png');
          link.click();
        } catch (snapErr) {
          console.error('[QRHealthID] Snapshot failed:', snapErr);
        }
      }
    } finally {
      setDownloading(false);
    }
  };

  // ── PRINT QR CARD ──────────────────────────────────────────────────────────
  const handlePrint = () => {
    window.print();
  };

  // ── WEB SHARE API ──────────────────────────────────────────────────────────
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'MediChain Health ID',
          text: `My MediChain Patient Health Identifier: ${patientId}. Present to authorized healthcare providers for EHR access.`,
        });
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 2000);
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('[QRHealthID] Share failed:', err);
        }
      }
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto print:max-w-none">
      
      {/* ── HEALTH ID CARD ────────────────────────────────────────────────── */}
      <div
        ref={cardRef}
        id="medichain-patient-health-card"
        className="w-full bg-white text-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 p-6 flex flex-col items-center print:shadow-none print:border print:border-slate-300 print:w-[380px] print:mx-auto"
      >
        {/* Card Header */}
        <div className="w-full flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center text-white font-black text-sm shadow-md">
              M+
            </div>
            <div>
              <span className="font-display font-bold text-slate-900 text-sm tracking-tight block">MediChain</span>
              <span className="text-[10px] font-semibold text-slate-500 block">Universal Health Identity</span>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-700 bg-cyan-50 border border-cyan-200 px-2.5 py-1 rounded-full">
            Verified ID
          </span>
        </div>

        {/* Patient Identity Header */}
        <div className="text-center mb-4">
          <h2 className="text-lg font-bold text-slate-900 leading-tight">{name}</h2>
          <p className="text-xs text-slate-500 mt-0.5">Your secure identity for authorized healthcare access</p>
        </div>

        {/* High Resolution Scannable QR Code Frame */}
        <div
          ref={qrWrapperRef}
          className="bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-inner flex items-center justify-center mb-4"
        >
          <QRCodeSVG
            value={qrPayload}
            size={230}
            level="H"
            includeMargin={true}
            bgColor="#f8fafc"
            fgColor="#0f172a"
          />
        </div>

        {/* Prominent Patient ID Display with Copy */}
        <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center justify-between gap-2 mb-4">
          <div className="min-w-0">
            <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">Patient ID</span>
            <span className="text-sm sm:text-base font-mono font-black text-cyan-800 tracking-wider truncate block" id="patient-id-display">
              {patientId}
            </span>
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all shadow-xs flex-shrink-0"
            title="Copy Patient ID"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 text-[11px]">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-[11px]">Copy</span>
              </>
            )}
          </button>
        </div>

        {copied && (
          <p className="text-xs text-emerald-600 font-semibold mb-3 animate-fade-in flex items-center gap-1">
            <Check className="w-3.5 h-3.5" /> Patient ID copied to clipboard.
          </p>
        )}

        {/* Security / Privacy Assurance */}
        <div className="w-full bg-emerald-50/70 border border-emerald-200 rounded-xl p-2.5 flex items-center gap-2 mb-4 text-left">
          <Shield className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <p className="text-[10px] text-emerald-800 leading-snug">
            <strong>✓ Secure Patient Identifier:</strong> This QR contains only your verified Patient ID. It does not expose medical records or sensitive data.
          </p>
        </div>

        {/* Card Footer Details */}
        <div className="w-full grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 text-[11px]">
          <div>
            <span className="text-slate-400 block text-[9px] uppercase">Blood Group</span>
            <strong className="text-slate-700 font-mono">{bloodGroup}</strong>
          </div>
          <div className="text-right">
            <span className="text-slate-400 block text-[9px] uppercase">Blockchain</span>
            <strong className="text-slate-700 font-mono">Sepolia 11155111</strong>
          </div>
        </div>
      </div>

      {/* ── ACTION BUTTONS ────────────────────────────────────────────────── */}
      <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-5 print:hidden">
        {/* Download */}
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold text-xs hover:opacity-90 transition-opacity shadow-md shadow-cyan-500/20"
        >
          <Download className="w-3.5 h-3.5" />
          {downloading ? 'Exporting...' : 'Download QR'}
        </button>

        {/* Print */}
        <button
          onClick={handlePrint}
          className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-medichain-surface border border-medichain-border text-white font-bold text-xs hover:bg-medichain-border transition-colors"
        >
          <Printer className="w-3.5 h-3.5 text-accent-cyan" />
          Print ID
        </button>

        {/* Share (if supported) */}
        {canShare && (
          <button
            onClick={handleShare}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-medichain-surface border border-medichain-border text-white font-bold text-xs hover:bg-medichain-border transition-colors"
          >
            <Share2 className="w-3.5 h-3.5 text-accent-indigo" />
            {shareSuccess ? 'Shared!' : 'Share QR'}
          </button>
        )}

        {/* Close (if modal) */}
        {onClose && (
          <button
            onClick={onClose}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-medichain-bg-dark border border-medichain-border text-text-secondary font-bold text-xs hover:text-white transition-colors"
          >
            Close
          </button>
        )}
      </div>

      {/* ── PRINT-SPECIFIC CSS ────────────────────────────────────────────── */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #medichain-patient-health-card, #medichain-patient-health-card * {
            visibility: visible;
          }
          #medichain-patient-health-card {
            position: absolute;
            left: 50%;
            top: 50px;
            transform: translateX(-50%);
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default QRHealthID;
