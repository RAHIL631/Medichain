// frontend/src/components/QRScanner.jsx
// Complete QR Scanner component with ZXing library, JSON validation, and manual entry fallback

import React, { useState, useEffect, useRef } from 'react';
import { BrowserQRCodeReader } from '@zxing/library';
import { ethers } from 'ethers';
import api from '../utils/api';

/**
 * QRScanner Component
 * Handles scanning patient Health IDs and manual wallet address entry.
 * On success, fetches patient profile from the backend and returns it via onScanSuccess.
 */
const QRScanner = ({ onScanSuccess, onScanError }) => {
  const [activeTab, setActiveTab] = useState('scan'); // 'scan' | 'manual'
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [manualAddress, setManualAddress] = useState('');
  const [verifiedPatient, setVerifiedPatient] = useState(null);

  const videoRef = useRef(null);
  const codeReaderRef = useRef(null);

  // --- Initialize ZXing Reader ---
  useEffect(() => {
    codeReaderRef.current = new BrowserQRCodeReader();
    return () => {
      stopScanning();
    };
  }, []);

  // --- Stop Camera ---
  const stopScanning = () => {
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
    }
    setIsScanning(false);
  };

  // --- Handle API Lookup ---
  const lookupPatient = async (address) => {
    setIsLoading(true);
    setError(null);
    try {
      // Endpoint expected: GET /api/doctor/patient/:address
      const { data } = await api.get(`/doctor/patient/${address}`);
      setVerifiedPatient(data);
      
      // Delay success callback slightly to show the "Verified" badge
      setTimeout(() => {
        onScanSuccess?.({ address, profile: data });
      }, 1500);

    } catch (err) {
      console.error("Patient Lookup Error:", err);
      const msg = err.response?.data?.error || "Patient not found or access denied";
      setError(msg);
      onScanError?.(err);
      setIsLoading(false);
    }
  };

  // --- Start Scanning ---
  const startScanning = async () => {
    setIsScanning(true);
    setError(null);
    setVerifiedPatient(null);

    try {
      await codeReaderRef.current.decodeFromVideoDevice(
        null, // default camera
        videoRef.current,
        (result, err) => {
          if (result) {
            stopScanning();
            try {
              const qrJson = JSON.parse(result.getText());
              
              // Validate MediChain Format
              if (qrJson.type === "medichain_health_id" && qrJson.address) {
                lookupPatient(qrJson.address);
              } else {
                setError("Invalid QR Code — not a MediChain Health ID");
              }
            } catch (e) {
              setError("Invalid QR Data format");
            }
          }
          // Ignore NotFoundException (it's continuous scanning)
        }
      );
    } catch (err) {
      console.error("Camera Error:", err);
      setError("Camera permission denied or device not found");
      setIsScanning(false);
    }
  };

  // --- Manual Lookup ---
  const handleManualLookup = (e) => {
    e.preventDefault();
    if (!ethers.isAddress(manualAddress)) {
      setError("Please enter a valid 0x wallet address");
      return;
    }
    lookupPatient(manualAddress);
  };

  return (
    <div className="w-full max-w-lg mx-auto bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700">
      
      {/* Tabs Header */}
      <div className="flex border-b border-gray-100 dark:border-gray-700">
        <button 
          onClick={() => { setActiveTab('scan'); stopScanning(); setError(null); }}
          className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-all ${activeTab === 'scan' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30' : 'text-gray-400 hover:text-gray-600'}`}
        >
          Scan QR Code
        </button>
        <button 
          onClick={() => { setActiveTab('manual'); stopScanning(); setError(null); }}
          className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-all ${activeTab === 'manual' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30' : 'text-gray-400 hover:text-gray-600'}`}
        >
          Manual Entry
        </button>
      </div>

      <div className="p-8 flex flex-col items-center">
        
        {activeTab === 'scan' ? (
          <div className="w-full space-y-6">
            {!isScanning && !isLoading && !verifiedPatient && (
              <div className="text-center py-10">
                <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Ready to Scan</h3>
                <p className="text-sm text-gray-500 mb-8">Scan the patient's physical or digital Health ID card.</p>
                <button 
                  onClick={startScanning}
                  className="px-10 py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-xl shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 transition-all"
                >
                  Start Scanning
                </button>
              </div>
            )}

            {isScanning && (
              <div className="relative w-full aspect-square max-w-[300px] mx-auto rounded-3xl overflow-hidden border-4 border-gray-100 dark:border-gray-700 bg-black shadow-2xl">
                <video ref={videoRef} className="w-full h-full object-cover" />
                
                {/* Scanning Frame Overlay */}
                <div className="absolute inset-0 border-[30px] border-black/40" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-green-500 rounded-2xl shadow-[0_0_20px_rgba(34,197,94,0.3)]">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-green-500 shadow-[0_0_15px_#22c55e] animate-scan-loop" />
                </div>

                <button 
                  onClick={stopScanning}
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-white/10 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest rounded-full border border-white/20 hover:bg-white/20 transition-all"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleManualLookup} className="w-full space-y-6 py-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Patient Wallet Address</label>
              <input 
                type="text"
                value={manualAddress}
                onChange={(e) => setManualAddress(e.target.value)}
                placeholder="0x..."
                className="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl font-mono text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
              />
            </div>
            <button 
              type="submit"
              disabled={isLoading || !manualAddress}
              className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-xl shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 disabled:opacity-50 transition-all"
            >
              {isLoading ? 'Verifying...' : 'Look Up Patient'}
            </button>
          </form>
        )}

        {/* --- Shared UI States --- */}

        {isLoading && !verifiedPatient && (
          <div className="py-10 text-center animate-pulse">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-indigo-600 font-bold">Verifying MediChain Identity...</p>
          </div>
        )}

        {verifiedPatient && (
          <div className="w-full p-6 bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30 rounded-2xl flex items-center gap-4 animate-fade-in-up">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center text-green-600">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
            </div>
            <div>
              <p className="text-xs font-bold text-green-600 uppercase tracking-widest">Patient QR Verified</p>
              <h4 className="text-lg font-bold text-gray-900 dark:text-white">{verifiedPatient.name}</h4>
            </div>
          </div>
        )}

        {error && (
          <div className="w-full mt-6 p-4 bg-red-50 dark:bg-red-900/10 border-l-4 border-red-500 text-red-700 dark:text-red-400 rounded-r-xl flex items-start gap-3">
            <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

      </div>

      <style>{`
        @keyframes scan-loop {
          0% { top: 0; }
          50% { top: 100%; }
          100% { top: 0; }
        }
        .animate-scan-loop {
          animation: scan-loop 2s linear infinite;
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.5s ease-out;
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default QRScanner;
