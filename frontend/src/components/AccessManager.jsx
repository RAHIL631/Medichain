// frontend/src/components/AccessManager.jsx
// Complete React component for patient-controlled access management on-chain (Mobile-First Responsive).

import React, { useState, useEffect, useCallback } from 'react';
import { useWalletContext }   from '../context/WalletContext';
import { useContract as useBlockchainContract } from '../hooks/useBlockchain';
import WalletConnectionModal  from './WalletConnectionModal';
import { isValidEthAddress }  from '../utils/web3';
import { Lock, AlertCircle, CheckCircle, ExternalLink, Wallet } from 'lucide-react';

const TARGET_CHAIN_ID = Number(process.env.REACT_APP_TARGET_CHAIN_ID) || 11155111;

const AccessManager = () => {
  const { signer, isConnected, chainId } = useWalletContext();
  const contract = useBlockchainContract(signer);

  // wallet modal state
  const [walletModalOpen, setWalletModalOpen]   = useState(false);
  const [pendingAction,   setPendingAction]      = useState(null); // fn to run after wallet ready

  const [doctorAddress,       setDoctorAddress]       = useState('');
  const [loading,             setLoading]             = useState(false);
  const [error,               setError]               = useState(null);
  const [successMsg,          setSuccessMsg]          = useState(null);
  const [txHash,              setTxHash]              = useState(null);
  const [authorizedDoctors,   setAuthorizedDoctors]   = useState([]);
  const [listLoading,         setListLoading]         = useState(false);

  const isOnCorrectNetwork = chainId === TARGET_CHAIN_ID;
  const isReady = isConnected && isOnCorrectNetwork && !!contract;

  // ── Require wallet helper ──────────────────────────────────────────────────
  const requireWallet = useCallback((action) => {
    if (isReady) {
      action();
      return;
    }
    setPendingAction(() => action);
    setWalletModalOpen(true);
  }, [isReady]);

  const handleWalletConnected = useCallback(() => {
    setWalletModalOpen(false);
  }, []);

  // Run pendingAction once wallet becomes ready
  useEffect(() => {
    if (isReady && pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  }, [isReady, pendingAction]);

  // ── Fetch Authorized Doctors from Blockchain Events ───────────────────────
  const fetchAuthorizedDoctors = useCallback(async () => {
    if (!contract || !isConnected) return;

    setListLoading(true);
    try {
      const { address } = await contract.runner.provider.getSigner();
      const account = address;

      const grantFilter  = contract.filters.DoctorAccessGranted(account);
      const revokeFilter = contract.filters.DoctorAccessRevoked(account);
      const [grantEvents, revokeEvents] = await Promise.all([
        contract.queryFilter(grantFilter),
        contract.queryFilter(revokeFilter),
      ]);

      const accessMap = new Map();
      grantEvents.forEach(ev  => accessMap.set(ev.args[1], true));
      revokeEvents.forEach(ev => accessMap.set(ev.args[1], false));

      setAuthorizedDoctors(
        Array.from(accessMap.entries())
          .filter(([, has]) => has)
          .map(([doc]) => doc)
      );
    } catch (err) {
      console.error('Error fetching access events:', err);
    } finally {
      setListLoading(false);
    }
  }, [contract, isConnected]);

  useEffect(() => {
    if (!contract || !isConnected) return;
    fetchAuthorizedDoctors();

    const onGrant  = () => fetchAuthorizedDoctors();
    const onRevoke = () => fetchAuthorizedDoctors();
    contract.on('DoctorAccessGranted',  onGrant);
    contract.on('DoctorAccessRevoked',  onRevoke);
    return () => {
      contract.off('DoctorAccessGranted',  onGrant);
      contract.off('DoctorAccessRevoked',  onRevoke);
    };
  }, [contract, isConnected, fetchAuthorizedDoctors]);

  // ── Grant Access ──────────────────────────────────────────────────────────
  const doGrantAccess = useCallback(async () => {
    if (!isValidEthAddress(doctorAddress)) {
      setError('Please enter a valid Ethereum address (0x...)');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    setTxHash(null);
    try {
      const tx = await contract.grantDoctorAccess(doctorAddress);
      setTxHash(tx.hash);
      await tx.wait();
      setSuccessMsg('Access Granted!');
      setDoctorAddress('');
      fetchAuthorizedDoctors();
    } catch (err) {
      console.error('Grant Access Error:', err);
      setError(err.reason || err.data?.message || err.message || 'Transaction failed');
    } finally {
      setLoading(false);
    }
  }, [contract, doctorAddress, fetchAuthorizedDoctors]);

  const handleGrantAccess = useCallback((e) => {
    e.preventDefault();
    if (!isValidEthAddress(doctorAddress)) {
      setError('Please enter a valid Ethereum address (0x...)');
      return;
    }
    requireWallet(doGrantAccess);
  }, [doctorAddress, requireWallet, doGrantAccess]);

  // ── Revoke Access ─────────────────────────────────────────────────────────
  const doRevokeAccess = useCallback(async (docAddr) => {
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    setTxHash(null);
    try {
      const tx = await contract.revokeDoctorAccess(docAddr);
      setTxHash(tx.hash);
      await tx.wait();
      setSuccessMsg('Access Revoked!');
      fetchAuthorizedDoctors();
    } catch (err) {
      console.error('Revoke Access Error:', err);
      setError(err.reason || err.data?.message || err.message || 'Transaction failed');
    } finally {
      setLoading(false);
    }
  }, [contract, fetchAuthorizedDoctors]);

  const handleRevokeAccess = useCallback((docAddr) => {
    requireWallet(() => doRevokeAccess(docAddr));
  }, [requireWallet, doRevokeAccess]);

  return (
    <>
      {/* WalletConnectionModal */}
      <WalletConnectionModal
        isOpen={walletModalOpen}
        onClose={() => { setWalletModalOpen(false); setPendingAction(null); }}
        onConnected={handleWalletConnected}
        operationLabel="manage blockchain-based doctor access"
      />

      <div className="space-y-5 sm:space-y-6">
        {/* Wallet status banner */}
        {!isConnected && (
          <div className="p-3.5 sm:p-4 rounded-xl bg-hc-blue-soft border border-hc-blue/20 flex items-start gap-3">
            <Wallet className="w-5 h-5 text-hc-blue flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-bold text-hc-text">Blockchain access control</p>
              <p className="text-[11px] sm:text-xs text-hc-text-muted mt-0.5 leading-relaxed">
                Grant or revoke doctor access on-chain. A MetaMask wallet is required only when you
                submit a transaction. Click <strong>Grant Access</strong> or <strong>Revoke</strong> to connect.
              </p>
            </div>
          </div>
        )}

        {isConnected && !isOnCorrectNetwork && (
          <div className="p-3.5 sm:p-4 rounded-xl bg-hc-warning-soft border border-hc-warning/20 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-hc-warning flex-shrink-0 mt-0.5" />
            <p className="text-xs sm:text-sm text-hc-text-muted">
              Wrong network. Switch to <strong className="text-hc-text">Sepolia Testnet</strong> to perform blockchain transactions.
            </p>
          </div>
        )}

        {/* ── Grant Access Form ──────────────────────────────────────── */}
        <div className="hc-card p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <div className="w-8 h-8 rounded-lg bg-hc-teal-soft flex items-center justify-center flex-shrink-0">
              <Lock className="w-4 h-4 text-hc-teal" />
            </div>
            <h3 className="text-xs sm:text-sm font-bold text-hc-text">Grant Doctor Access</h3>
          </div>
          <form onSubmit={handleGrantAccess} className="space-y-3">
            <div>
              <label className="hc-label text-xs sm:text-sm">Doctor's Wallet Address</label>
              <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
                <input
                  type="text"
                  value={doctorAddress}
                  onChange={(e) => setDoctorAddress(e.target.value)}
                  placeholder="0x..."
                  className="hc-input flex-1 font-mono text-xs sm:text-sm min-w-0"
                  id="grant-access-address-input"
                />
                <button
                  type="submit"
                  disabled={loading || !doctorAddress}
                  className="hc-btn hc-btn-primary w-full sm:w-auto min-w-[130px] justify-center min-h-[48px]"
                  id="grant-access-submit-btn"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Processing…
                    </span>
                  ) : 'Grant Access'}
                </button>
              </div>
              <p className="text-[11px] sm:text-xs text-hc-text-muted mt-1.5 leading-relaxed">
                Enter the doctor's Ethereum wallet address. A MetaMask confirmation will appear.
              </p>
            </div>
          </form>
        </div>

        {/* ── Feedback ──────────────────────────────────────────────── */}
        {error && (
          <div className="p-3.5 sm:p-4 rounded-xl bg-hc-danger-soft border border-hc-danger/20 flex items-start gap-2.5 text-xs sm:text-sm text-hc-danger">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span className="min-w-0 flex-1">{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="p-3.5 sm:p-4 rounded-xl bg-hc-success-soft border border-hc-success/20 text-xs sm:text-sm text-hc-success">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span className="font-bold">{successMsg}</span>
            </div>
            {txHash && (
              <a
                href={`https://sepolia.etherscan.io/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 ml-6 text-xs text-hc-success hover:underline font-bold"
              >
                View on Etherscan <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        )}

        {loading && !txHash && (
          <p className="text-center text-xs sm:text-sm text-hc-blue animate-pulse font-medium">
            Waiting for MetaMask confirmation…
          </p>
        )}
        {loading && txHash && (
          <p className="text-center text-xs sm:text-sm text-hc-warning animate-pulse font-medium">
            Transaction pending on blockchain…
          </p>
        )}

        {/* ── Authorized Doctors List ───────────────────────────────── */}
        <div className="hc-card p-4 sm:p-6">
          <h3 className="text-xs sm:text-sm font-bold text-hc-text mb-3 sm:mb-4">Doctors with Current Access</h3>
          {!isConnected ? (
            <p className="text-xs sm:text-sm text-hc-text-muted italic">
              Connect your wallet to see which doctors currently have blockchain access to your records.
            </p>
          ) : listLoading ? (
            <div className="space-y-2.5 sm:space-y-3">
              {[1,2].map(i => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-hc-bg-alt">
                  <div className="hc-skeleton w-9 h-9 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-1.5 min-w-0">
                    <div className="hc-skeleton h-3.5 w-2/3" />
                    <div className="hc-skeleton h-3 w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : authorizedDoctors.length === 0 ? (
            <p className="text-xs sm:text-sm text-hc-text-muted italic">
              No doctors currently have access to your records.
            </p>
          ) : (
            <ul className="space-y-2.5 sm:space-y-3">
              {authorizedDoctors.map((doc) => (
                <li
                  key={doc}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:p-4 bg-hc-bg-alt border border-hc-border-light rounded-xl hover:border-hc-blue/30 transition-colors gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 bg-hc-blue-soft rounded-full flex items-center justify-center text-hc-blue font-bold text-xs flex-shrink-0">
                      {doc.slice(2, 4).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-mono text-hc-text font-semibold truncate">{doc}</p>
                      <p className="text-[11px] text-hc-text-muted">Authorized Doctor</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRevokeAccess(doc)}
                    disabled={loading}
                    className="hc-btn hc-btn-sm text-hc-danger border border-hc-danger/20 hover:bg-hc-danger-soft hover:border-hc-danger/30 transition-colors self-end sm:self-auto min-h-[38px]"
                    id={`revoke-access-btn-${doc.slice(2, 8)}`}
                  >
                    Revoke Access
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
};

export default AccessManager;
