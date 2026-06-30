// frontend/src/components/prescription/BlockchainProof.jsx
// On-chain verification panel — shows report hash, TX hash, and blockchain status.

import React, { useState } from 'react';
import useContract from '../../hooks/useContract';
import useWallet from '../../hooks/useWallet';

const ETHERSCAN_BASE = 'https://sepolia.etherscan.io';

function HashDisplay({ label, value, link }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '10px',
      padding: '12px 14px',
    }}>
      <div style={{
        color: '#06b6d4',
        fontSize: '10px',
        textTransform: 'uppercase',
        letterSpacing: '0.8px',
        fontWeight: 700,
        marginBottom: '6px',
        fontFamily: "'Inter', sans-serif",
      }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <code style={{
          flex: 1,
          color: '#e5e7eb',
          fontSize: '11px',
          fontFamily: 'Courier New, monospace',
          overflowX: 'auto',
          whiteSpace: 'nowrap',
          background: 'rgba(0,0,0,0.3)',
          padding: '6px 10px',
          borderRadius: '6px',
          display: 'block',
        }}>
          {value || '—'}
        </code>
        {value && (
          <>
            <button
              onClick={copy}
              title="Copy to clipboard"
              style={{
                background: copied ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${copied ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)'}`,
                color: copied ? '#22c55e' : '#9ca3af',
                borderRadius: '6px',
                padding: '6px 10px',
                cursor: 'pointer',
                fontSize: '11px',
                transition: 'all 0.2s',
                flexShrink: 0,
              }}
            >
              {copied ? '✓ Copied' : '📋 Copy'}
            </button>
            {link && (
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  background: 'rgba(6,182,212,0.08)',
                  border: '1px solid rgba(6,182,212,0.2)',
                  color: '#06b6d4',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  textDecoration: 'none',
                  flexShrink: 0,
                  transition: 'all 0.2s',
                }}
              >
                🔗 View
              </a>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function BlockchainProof({
  reportHash,
  txHash,
  blockNumber,
  safetyScore,
  severity,
  patientAddress,
  reportId,
  onAnchor, // callback to trigger on-chain anchoring
}) {
  const { contract } = useContract();
  const { account, connected } = useWallet();
  const [anchoring, setAnchoring] = useState(false);
  const [anchorError, setAnchorError] = useState(null);
  const [anchorDone, setAnchorDone] = useState(false);

  const isAnchored = Boolean(txHash);

  const handleAnchor = async () => {
    if (!contract || !connected) {
      setAnchorError('Please connect your wallet first.');
      return;
    }
    if (!patientAddress) {
      setAnchorError('Patient wallet address required for anchoring.');
      return;
    }
    if (!reportHash || reportHash.length !== 64) {
      setAnchorError('Invalid report hash — cannot anchor.');
      return;
    }

    setAnchoring(true);
    setAnchorError(null);

    try {
      // Call the new smart contract function
      const tx = await contract.addPrescriptionValidation(
        patientAddress,
        reportHash,
        Math.round(safetyScore || 0),
        severity || 'UNKNOWN',
      );

      const receipt = await tx.wait();

      // Save TX hash to backend
      if (onAnchor) {
        await onAnchor({
          txHash:      tx.hash,
          blockNumber: receipt.blockNumber,
          reportId,
        });
      }

      setAnchorDone(true);
    } catch (err) {
      console.error('[BlockchainProof] Anchor error:', err);
      setAnchorError(err.message || 'Blockchain anchoring failed');
    } finally {
      setAnchoring(false);
    }
  };

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Status banner */}
      <div style={{
        padding: '16px 20px',
        borderRadius: '12px',
        background: isAnchored || anchorDone
          ? 'rgba(34,197,94,0.06)'
          : 'rgba(6,182,212,0.06)',
        border: `1px solid ${isAnchored || anchorDone ? 'rgba(34,197,94,0.2)' : 'rgba(6,182,212,0.2)'}`,
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
      }}>
        <div style={{
          width: '44px', height: '44px',
          borderRadius: '12px',
          background: isAnchored || anchorDone
            ? 'rgba(34,197,94,0.1)'
            : 'rgba(6,182,212,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '20px', flexShrink: 0,
        }}>
          {isAnchored || anchorDone ? '🔒' : '🔗'}
        </div>
        <div>
          <p style={{
            margin: 0,
            fontWeight: 700,
            fontSize: '14px',
            color: isAnchored || anchorDone ? '#22c55e' : '#06b6d4',
          }}>
            {isAnchored || anchorDone ? 'Report Anchored On-Chain ✓' : 'Awaiting Blockchain Anchoring'}
          </p>
          <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '12px' }}>
            {isAnchored || anchorDone
              ? `This report's SHA-256 hash is permanently stored on the Ethereum blockchain.`
              : 'Anchor this report hash on-chain for tamper-proof verification.'}
          </p>
        </div>
      </div>

      {/* Hash values */}
      <HashDisplay
        label="Report Hash (SHA-256)"
        value={reportHash}
      />

      {txHash && (
        <HashDisplay
          label="Blockchain Transaction Hash"
          value={txHash}
          link={`${ETHERSCAN_BASE}/tx/${txHash}`}
        />
      )}

      {blockNumber && (
        <div style={{
          display: 'flex',
          gap: '8px',
          color: '#6b7280',
          fontSize: '12px',
          alignItems: 'center',
          padding: '8px 12px',
          background: 'rgba(255,255,255,0.02)',
          borderRadius: '8px',
          border: '1px solid rgba(255,255,255,0.05)',
        }}>
          <span style={{ color: '#4b5563' }}>Block:</span>
          <span style={{ color: '#9ca3af', fontFamily: 'monospace' }}>#{blockNumber}</span>
        </div>
      )}

      {/* Score summary */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '8px',
      }}>
        {[
          { label: 'Safety Score', value: `${Math.round(safetyScore || 0)}/100` },
          { label: 'Severity', value: severity || 'UNKNOWN' },
        ].map((item, i) => (
          <div key={i} style={{
            padding: '10px 14px',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: '8px',
          }}>
            <div style={{ color: '#4b5563', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
              {item.label}
            </div>
            <div style={{ color: '#f9fafb', fontSize: '15px', fontWeight: 700 }}>
              {item.value}
            </div>
          </div>
        ))}
      </div>

      {/* Anchor button */}
      {!isAnchored && !anchorDone && (
        <div>
          {anchorError && (
            <p style={{ color: '#ef4444', fontSize: '12px', marginBottom: '8px' }}>{anchorError}</p>
          )}
          {!connected && (
            <p style={{ color: '#f97316', fontSize: '12px', marginBottom: '8px' }}>
              ⚠️ Connect your MetaMask wallet to anchor this report on-chain.
            </p>
          )}
          <button
            onClick={handleAnchor}
            disabled={anchoring || !connected || !reportHash}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '10px',
              border: 'none',
              background: anchoring
                ? 'rgba(6,182,212,0.3)'
                : 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
              color: 'white',
              fontSize: '14px',
              fontWeight: 700,
              cursor: anchoring || !connected ? 'not-allowed' : 'pointer',
              opacity: (!connected || !reportHash) ? 0.5 : 1,
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            {anchoring ? (
              <>
                <div style={{
                  width: '16px', height: '16px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTop: '2px solid white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }} />
                Anchoring on Blockchain…
              </>
            ) : (
              '🔗 Anchor Report Hash On-Chain'
            )}
          </button>
        </div>
      )}

      {anchorDone && !isAnchored && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '10px',
          background: 'rgba(34,197,94,0.08)',
          border: '1px solid rgba(34,197,94,0.2)',
          color: '#22c55e',
          fontSize: '13px',
          fontWeight: 600,
          textAlign: 'center',
        }}>
          ✅ Successfully anchored! Refresh to see the transaction hash.
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
