// frontend/src/components/QRHealthID.jsx
// Complete QR Health ID component with card generation, PNG download, and printing

import React, { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import html2canvas from 'html2canvas';

/**
 * QRHealthID Component
 * Generates a professional Health ID card with an encoded QR code for blockchain EHR access.
 */
const QRHealthID = ({ 
  patientAddress, 
  patientName, 
  bloodGroup, 
  allergies = [], 
  chronicConditions = [] 
}) => {
  const cardRef = useRef(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // QR Data: JSON format for standardized medical scanning
  const qrData = JSON.stringify({
    type: "medichain_health_id",
    version: "1.0",
    address: patientAddress,
    name: patientName,
    bloodGroup: bloodGroup,
    timestamp: Date.now()
  });

  // --- Download Card as PNG ---
  const handleDownload = async () => {
    if (cardRef.current) {
      try {
        const canvas = await html2canvas(cardRef.current, {
          backgroundColor: null,
          scale: 2, // higher resolution
          logging: false,
          useCORS: true
        });
        const image = canvas.toDataURL("image/png");
        const link = document.createElement('a');
        link.href = image;
        link.download = `MediChain-ID-${patientName.replace(/\s+/g, '-')}.png`;
        link.click();
      } catch (err) {
        console.error("Failed to generate image:", err);
      }
    }
  };

  // --- Print Card ---
  const handlePrint = () => {
    window.print();
  };

  // --- Copy Address to Clipboard ---
  const handleCopy = () => {
    navigator.clipboard.writeText(patientAddress);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  // Format address for display: 0x1234...5678
  const shortAddress = patientAddress 
    ? `${patientAddress.slice(0, 6)}...${patientAddress.slice(-4)}` 
    : "Not Linked";

  return (
    <div className="flex flex-col items-center gap-8 py-10 print:py-0">
      
      {/* ── HEALTH ID CARD ────────────────────────────────────────────────── */}
      <div 
        ref={cardRef}
        id="medichain-health-card"
        className="w-80 bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col items-center p-6 text-gray-900 print:shadow-none print:border-2 print:border-gray-200"
      >
        {/* Card Header */}
        <div className="w-full flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-indigo-600 rounded-md flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a8 8 0 100 16 8 8 0 000-16zM9 5a1 1 0 112 0v3h3a1 1 0 110 2H11v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V5z" />
              </svg>
            </div>
            <span className="font-bold text-indigo-900 text-sm tracking-tight">MediChain</span>
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-50 px-2 py-1 rounded-full">
            Health ID
          </span>
        </div>

        {/* QR Code Section */}
        <div className="bg-gray-50 p-4 rounded-2xl mb-4 border border-gray-100">
          <QRCodeSVG 
            value={qrData}
            size={200}
            level="H"
            includeMargin={true}
          />
        </div>

        {/* Patient Info */}
        <h3 className="text-xl font-bold text-gray-900 mb-1">{patientName || "Anonymous Patient"}</h3>
        
        <div className="flex items-center gap-2 mb-4">
          <span className="px-3 py-1 bg-red-600 text-white text-xs font-black rounded-full shadow-sm">
            {bloodGroup || "O+"}
          </span>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
            Scan to access full history
          </span>
        </div>

        {/* Medical Tags (Allergies) */}
        {allergies.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1.5 mb-6">
            {allergies.slice(0, 3).map((item, idx) => (
              <span key={idx} className="bg-red-50 text-red-600 text-[9px] font-bold px-2 py-0.5 rounded border border-red-100">
                ⚠️ {item}
              </span>
            ))}
          </div>
        )}

        {/* Wallet Address Footnote */}
        <div className="w-full pt-4 border-t border-gray-100 mt-auto text-center">
          <p className="text-[9px] font-mono text-gray-400 mb-1 uppercase tracking-widest">Digital Wallet Address</p>
          <p className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50/50 py-1 rounded-lg">
            {shortAddress}
          </p>
        </div>

        <footer className="mt-4 text-[8px] text-gray-300 font-medium uppercase tracking-tight">
          MediChain Blockchain Health ID · Ethereum Network
        </footer>
      </div>

      {/* ── ACTION BUTTONS ────────────────────────────────────────────────── */}
      <div className="flex flex-wrap justify-center gap-4 print:hidden">
        
        {/* Download Button */}
        <button 
          onClick={handleDownload}
          className="flex items-center gap-2 px-6 py-3 bg-white hover:bg-gray-50 text-gray-700 font-bold rounded-2xl shadow-lg border border-gray-200 transition-all active:scale-95"
        >
          <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download Card
        </button>

        {/* Print Button */}
        <button 
          onClick={handlePrint}
          className="flex items-center gap-2 px-6 py-3 bg-white hover:bg-gray-50 text-gray-700 font-bold rounded-2xl shadow-lg border border-gray-200 transition-all active:scale-95"
        >
          <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print ID
        </button>

        {/* Copy Address Button */}
        <button 
          onClick={handleCopy}
          className={`flex items-center gap-2 px-6 py-3 font-bold rounded-2xl shadow-lg transition-all active:scale-95 ${
            copySuccess ? 'bg-green-600 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {copySuccess ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            )}
          </svg>
          {copySuccess ? 'Copied!' : 'Copy Wallet'}
        </button>
      </div>

      {/* ── PRINT-SPECIFIC CSS ────────────────────────────────────────────── */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #medichain-health-card, #medichain-health-card * {
            visibility: visible;
          }
          #medichain-health-card {
            position: absolute;
            left: 50%;
            top: 10%;
            transform: translateX(-50%);
          }
        }
      `}</style>

    </div>
  );
};

export default QRHealthID;
