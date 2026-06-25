// frontend/src/components/AccessManager.jsx
// Complete React component for patient-controlled access management on-chain

import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import useContract from '../hooks/useContract';
import useWallet from '../hooks/useWallet';
import { isValidEthAddress } from '../utils/web3';

/**
 * AccessManager Component
 * Allows patients to grant or revoke doctor access to their medical records.
 * Uses ethers.js v6 to interact with the MediChain smart contract.
 */
const AccessManager = () => {
  const { contract } = useContract();
  const { account } = useWallet();
  
  const [doctorAddress, setDoctorAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [txHash, setTxHash] = useState(null);
  const [authorizedDoctors, setAuthorizedDoctors] = useState([]);

  // --- Fetch Authorized Doctors from Blockchain Events ---
  const fetchAuthorizedDoctors = useCallback(async () => {
    if (!contract || !account) return;

    try {
      // Get all Grant events for this patient
      const grantFilter = contract.filters.DoctorAccessGranted(account);
      const grantEvents = await contract.queryFilter(grantFilter);

      // Get all Revoke events for this patient
      const revokeFilter = contract.filters.DoctorAccessRevoked(account);
      const revokeEvents = await contract.queryFilter(revokeFilter);

      // Build a map of current access status
      const accessMap = new Map();

      // Process grants
      grantEvents.forEach(event => {
        const doctor = event.args[1];
        accessMap.set(doctor, true);
      });

      // Process revokes (overwrite with false if revoked later)
      revokeEvents.forEach(event => {
        const doctor = event.args[1];
        accessMap.set(doctor, false);
      });

      // Convert map to list of doctors who still have access
      const currentDoctors = Array.from(accessMap.entries())
        .filter(([_, hasAccess]) => hasAccess)
        .map(([doctor, _]) => doctor);

      setAuthorizedDoctors(currentDoctors);
    } catch (err) {
      console.error("Error fetching access events:", err);
    }
  }, [contract, account]);

  // --- Initial Fetch and Event Listeners ---
  useEffect(() => {
    fetchAuthorizedDoctors();

    if (contract) {
      // Listen for real-time updates
      const onGrant = (patient, doctor) => {
        if (patient.toLowerCase() === account?.toLowerCase()) {
          fetchAuthorizedDoctors();
        }
      };
      const onRevoke = (patient, doctor) => {
        if (patient.toLowerCase() === account?.toLowerCase()) {
          fetchAuthorizedDoctors();
        }
      };

      contract.on("DoctorAccessGranted", onGrant);
      contract.on("DoctorAccessRevoked", onRevoke);

      return () => {
        contract.off("DoctorAccessGranted", onGrant);
        contract.off("DoctorAccessRevoked", onRevoke);
      };
    }
  }, [contract, account, fetchAuthorizedDoctors]);

  // --- Grant Access ---
  const handleGrantAccess = async (e) => {
    e.preventDefault();
    if (!isValidEthAddress(doctorAddress)) {
      setError("Please enter a valid Ethereum address (0x...)");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    setTxHash(null);

    try {
      const tx = await contract.grantDoctorAccess(doctorAddress);
      setTxHash(tx.hash);
      
      // Wait for transaction to be mined
      await tx.wait();
      
      setSuccessMsg(`Access Granted!`);
      setDoctorAddress('');
    } catch (err) {
      console.error("Grant Access Error:", err);
      const msg = err.reason || err.data?.message || err.message || "Transaction failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // --- Revoke Access ---
  const handleRevokeAccess = async (docAddr) => {
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    setTxHash(null);

    try {
      const tx = await contract.revokeDoctorAccess(docAddr);
      setTxHash(tx.hash);
      
      await tx.wait();
      
      setSuccessMsg(`Access Revoked!`);
    } catch (err) {
      console.error("Revoke Access Error:", err);
      const msg = err.reason || err.data?.message || err.message || "Transaction failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
        <span className="bg-indigo-100 dark:bg-indigo-900 p-2 rounded-lg mr-3">
          <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </span>
        Manage Doctor Access
      </h2>

      {/* Grant Access Form */}
      <form onSubmit={handleGrantAccess} className="mb-8">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Doctor's Wallet Address
        </label>
        <div className="flex gap-3">
          <input
            type="text"
            value={doctorAddress}
            onChange={(e) => setDoctorAddress(e.target.value)}
            placeholder="0x..."
            className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
          />
          <button
            type="submit"
            disabled={loading || !doctorAddress}
            className={`px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-200 dark:shadow-none flex items-center ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {loading ? 'Processing...' : 'Grant Access'}
          </button>
        </div>
      </form>

      {/* Feedback Messages */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-lg flex items-start">
          <svg className="w-5 h-5 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
          <p>{error}</p>
        </div>
      )}

      {successMsg && (
        <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 text-green-700 rounded-lg">
          <div className="flex items-center mb-1">
            <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
            <p className="font-bold">{successMsg}</p>
          </div>
          {txHash && (
            <a 
              href={`https://sepolia.etherscan.io/tx/${txHash}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm underline ml-8 hover:text-green-800"
            >
              View on Etherscan: {txHash.slice(0, 10)}...{txHash.slice(-8)}
            </a>
          )}
        </div>
      )}

      {/* Loading Overlay */}
      {loading && !txHash && (
        <div className="text-center py-4 text-indigo-600 animate-pulse font-medium">
          Waiting for MetaMask confirmation...
        </div>
      )}
      {loading && txHash && (
        <div className="text-center py-4 text-amber-600 animate-pulse font-medium">
          Transaction pending on blockchain...
        </div>
      )}

      {/* Authorized Doctors List */}
      <div className="mt-10">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Doctors with Current Access
        </h3>
        {authorizedDoctors.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 italic">No doctors currently have access to your records.</p>
        ) : (
          <ul className="space-y-3">
            {authorizedDoctors.map((doc) => (
              <li 
                key={doc}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 rounded-xl hover:border-indigo-200 dark:hover:border-indigo-900 transition-colors"
              >
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold mr-4">
                    {doc.slice(2, 4).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-mono text-gray-900 dark:text-gray-100">{doc}</p>
                    <p className="text-xs text-gray-500">Authorized Doctor</p>
                  </div>
                </div>
                <button
                  onClick={() => handleRevokeAccess(doc)}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-900/30 transition-all"
                >
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default AccessManager;
