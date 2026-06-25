// frontend/src/components/TxStatus.jsx
//
// Tracks and displays the full Ethereum transaction lifecycle:
//   idle → pending → mining → confirmed → error
//
// EXPORTS:
//   TxStatus        — React component (default export)
//   handleTx        — async helper to drive status through the lifecycle
//   translateError  — maps ethers error codes to human-readable strings
//
// USAGE:
//   const [status,  setStatus]  = useState('idle');
//   const [txHash,  setTxHash]  = useState(null);
//   const [txError, setTxError] = useState(null);
//   const [receipt, setReceipt] = useState(null);
//
//   const onUpload = () =>
//     handleTx(contract.addMedicalRecord(...), setStatus, setTxHash, setTxError, setReceipt);
//
//   <TxStatus status={status} txHash={txHash} error={txError}
//             receipt={receipt} network="localhost" ipfsURL={url} />

import React, { useState, useCallback } from 'react';

// ── Error translation map ─────────────────────────────────────────────────────
const ERROR_MAP = [
  { match: ['ACTION_REJECTED', 'user rejected', '4001'],
    msg: 'Transaction cancelled — you rejected the MetaMask request.' },
  { match: ['INSUFFICIENT_FUNDS', 'insufficient funds'],
    msg: 'Insufficient ETH for gas fees — top up your wallet.' },
  { match: ['UNPREDICTABLE_GAS_LIMIT', 'cannot estimate gas'],
    msg: 'Transaction would fail — check contract state or permissions.' },
  { match: ['NETWORK_ERROR', 'network changed'],
    msg: 'Network error — check MetaMask is on the right network.' },
  { match: ['NONCE_EXPIRED', 'nonce'],
    msg: 'Nonce error — reset your MetaMask account and retry.' },
  { match: ['Not authorized', 'Not registered', 'Access denied'],
    msg: 'Smart contract rejected the call — you may not have permission.' },
  { match: ['CALL_EXCEPTION', 'revert'],
    msg: 'Contract reverted — the transaction conditions were not met.' },
  { match: ['timeout', 'TIMEOUT'],
    msg: 'Transaction timed out — check your network connection.' },
];

/**
 * Translates a raw ethers.js error into a user-friendly string.
 * @param {Error|string} err
 * @returns {string}
 */
export const translateError = (err) => {
  const raw = typeof err === 'string' ? err : (err?.message || err?.code || '');
  for (const { match, msg } of ERROR_MAP) {
    if (match.some((m) => raw.includes(m))) return msg;
  }
  // Try Solidity revert reason first
  if (err?.reason) return `Contract error: ${err.reason}`;
  return raw || 'An unknown blockchain error occurred.';
};

// ── handleTx helper ───────────────────────────────────────────────────────────
/**
 * Drives a contract call through the full TX lifecycle, updating React state
 * at each stage so TxStatus can render the correct UI.
 *
 * Lifecycle:
 *   pending  — MetaMask popup shown, waiting for user approval
 *   mining   — user approved, TX in mempool, waiting for block inclusion
 *   confirmed — included in a block (1 confirmation)
 *   error    — user rejected, contract revert, or network failure
 *
 * @param {Promise<ethers.TransactionResponse>} txPromise — e.g. contract.addMedicalRecord(...)
 * @param {Function} setStatus   — setState for 'pending'|'mining'|'confirmed'|'error'
 * @param {Function} setTxHash   — setState for the 0x... TX hash string
 * @param {Function} setError    — setState for the translated error string
 * @param {Function} [setReceipt] — optional setState for the confirmed receipt object
 * @returns {Promise<ethers.TransactionReceipt>}  rejects on error (after setting state)
 */
export const handleTx = async (
  txPromise,
  setStatus,
  setTxHash,
  setError,
  setReceipt = () => {}
) => {
  setStatus('pending');
  setTxHash(null);
  setError(null);

  try {
    // Step 1: submit to MetaMask — user must approve
    const tx = await txPromise;

    // Step 2: user approved → now mining
    setTxHash(tx.hash);
    setStatus('mining');

    // Step 3: wait for 1 block confirmation
    const receipt = await tx.wait(1);

    // Step 4: confirmed
    setReceipt(receipt);
    setStatus('confirmed');

    return receipt;

  } catch (err) {
    const msg = translateError(err);
    setError(msg);
    setStatus('error');
    throw err; // re-throw so callers can chain .catch()
  }
};

// ── Internal sub-components ───────────────────────────────────────────────────

// Spinner ring
const Spinner = ({ color = '#22d3ee', size = 36 }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" fill="none"
    style={{ animation: 'spin 0.9s linear infinite' }}>
    <circle cx="18" cy="18" r="15" stroke={color} strokeOpacity="0.15" strokeWidth="3" />
    <path d="M18 3 a15 15 0 0 1 15 15" stroke={color} strokeWidth="3"
      strokeLinecap="round" />
  </svg>
);

// Animated chain-link icon for "mining"
const ChainPulse = () => (
  <div style={{ position: 'relative', width: 40, height: 40 }}>
    {/* Outer pulse ring */}
    <div style={{
      position: 'absolute', inset: 0, borderRadius: '50%',
      background: 'rgba(139,92,246,0.15)',
      animation: 'pulse 1.4s ease-out infinite',
    }} />
    <div style={{
      position: 'absolute', inset: 4, borderRadius: '50%',
      background: 'rgba(139,92,246,0.25)',
      animation: 'pulse 1.4s ease-out 0.4s infinite',
    }} />
    {/* Chain icon */}
    <div style={{
      position: 'absolute', inset: 0, display: 'flex',
      alignItems: 'center', justifyContent: 'center',
    }}>
      <svg width="22" height="22" fill="none" stroke="#a78bfa" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    </div>
  </div>
);

// Animated green checkmark
const CheckMark = () => (
  <div style={{
    width: 44, height: 44, borderRadius: '50%',
    background: 'rgba(16,185,129,0.15)',
    border: '2px solid rgba(16,185,129,0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    animation: 'scaleIn 0.35s cubic-bezier(0.175,0.885,0.32,1.275) both',
  }}>
    <svg width="22" height="22" fill="none" stroke="#10b981"
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M5 13l4 4L19 7"
        style={{ strokeDasharray: 30, strokeDashoffset: 30,
          animation: 'drawCheck 0.4s 0.2s ease forwards' }} />
    </svg>
  </div>
);

// Red X icon
const ErrorIcon = () => (
  <div style={{
    width: 44, height: 44, borderRadius: '50%',
    background: 'rgba(239,68,68,0.12)',
    border: '2px solid rgba(239,68,68,0.35)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    animation: 'scaleIn 0.3s ease both',
  }}>
    <svg width="20" height="20" fill="none" stroke="#ef4444"
      strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24">
      <path d="M6 18L18 6M6 6l12 12" />
    </svg>
  </div>
);

// Copy-to-clipboard pill
const HashPill = ({ hash, href }) => {
  const [copied, setCopied] = useState(false);
  const short = hash ? `${hash.slice(0, 10)}…${hash.slice(-8)}` : '';

  const copy = useCallback(async () => {
    try { await navigator.clipboard.writeText(hash); setCopied(true);
      setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ }
  }, [hash]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#94a3b8' }}>
        TX:
      </span>
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer"
          style={{ fontFamily: 'monospace', fontSize: 11, color: '#38bdf8',
            textDecoration: 'none' }}>
          {short} ↗
        </a>
      ) : (
        <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#e2e8f0' }}>
          {short}
        </span>
      )}
      <button onClick={copy} style={{
        background: 'none', border: 'none', cursor: 'pointer',
        fontSize: 10, color: copied ? '#22c55e' : '#64748b', padding: '1px 5px',
        borderRadius: 4, transition: 'color 0.2s',
      }}>
        {copied ? '✓ Copied' : '⎘ Copy'}
      </button>
    </div>
  );
};

// Estimated time badge
const TimeBadge = ({ network }) => {
  const times = {
    localhost: '~2–5 seconds on Hardhat',
    sepolia:   '~12–30 seconds on Sepolia',
    mainnet:   '~15–60 seconds on Mainnet',
  };
  return (
    <span style={{
      fontSize: 10, color: '#64748b', padding: '2px 8px',
      background: 'rgba(255,255,255,0.04)', borderRadius: 20,
      border: '1px solid rgba(255,255,255,0.07)',
    }}>
      ⏱ {times[network] || times.localhost}
    </span>
  );
};

// ── Keyframe styles injected once ────────────────────────────────────────────
const KEYFRAMES = `
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes pulse {
    0%   { transform: scale(1); opacity: 0.8; }
    100% { transform: scale(2.2); opacity: 0; }
  }
  @keyframes scaleIn {
    from { transform: scale(0.4); opacity: 0; }
    to   { transform: scale(1);   opacity: 1; }
  }
  @keyframes drawCheck {
    to { stroke-dashoffset: 0; }
  }
  @keyframes slideDown {
    from { transform: translateY(-8px); opacity: 0; }
    to   { transform: translateY(0);    opacity: 1; }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
`;

let _injected = false;
const injectKeyframes = () => {
  if (_injected || typeof document === 'undefined') return;
  const style = document.createElement('style');
  style.textContent = KEYFRAMES;
  document.head.appendChild(style);
  _injected = true;
};

// ── Etherscan URL helper ──────────────────────────────────────────────────────
const txExplorerUrl = (txHash, network) => {
  if (!txHash) return null;
  const bases = {
    sepolia: 'https://sepolia.etherscan.io/tx/',
    mainnet: 'https://etherscan.io/tx/',
  };
  return bases[network] ? `${bases[network]}${txHash}` : null;
};

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
/**
 * TxStatus — renders the correct UI for each transaction lifecycle stage.
 *
 * Props:
 *   status      'idle'|'pending'|'mining'|'confirmed'|'error'
 *   txHash      string | null   — 0x... transaction hash
 *   error       string | null   — translated error message
 *   receipt     object | null   — ethers TransactionReceipt (has .blockNumber)
 *   network     string          — 'localhost'|'sepolia'|'mainnet'
 *   ipfsURL     string | null   — if provided, shows "View file on IPFS" link
 *   onDismiss   Function | null — callback for the dismiss ✕ button
 *   compact     boolean         — smaller layout for embedding in cards
 */
const TxStatus = ({
  status    = 'idle',
  txHash    = null,
  error     = null,
  receipt   = null,
  network   = 'localhost',
  ipfsURL   = null,
  onDismiss = null,
  compact   = false,
}) => {
  injectKeyframes();

  if (status === 'idle') return null;

  const explorerLink = txExplorerUrl(txHash, network);

  // ── Shared card wrapper ───────────────────────────────────────────────────
  const Card = ({ accent, children }) => (
    <div style={{
      borderRadius: compact ? 10 : 16,
      border: `1px solid ${accent}33`,
      background: `linear-gradient(135deg, ${accent}0d 0%, rgba(2,6,23,0.9) 100%)`,
      backdropFilter: 'blur(12px)',
      padding: compact ? '12px 14px' : '18px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: compact ? 8 : 12,
      position: 'relative',
      animation: 'slideDown 0.25s ease both',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      {onDismiss && (
        <button onClick={onDismiss} style={{
          position: 'absolute', top: 10, right: 12,
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#475569', fontSize: 16, lineHeight: 1,
          transition: 'color 0.2s',
        }} title="Dismiss">✕</button>
      )}
      {children}
    </div>
  );

  const Row = ({ children }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      {children}
    </div>
  );

  const Label = ({ children, color = '#94a3b8', size = 13 }) => (
    <span style={{ color, fontSize: size, lineHeight: 1.4 }}>{children}</span>
  );

  const Title = ({ children, color }) => (
    <span style={{ fontWeight: 700, fontSize: compact ? 13 : 15, color, letterSpacing: '-0.01em' }}>
      {children}
    </span>
  );

  // ── PENDING ───────────────────────────────────────────────────────────────
  if (status === 'pending') {
    return (
      <Card accent="#f59e0b">
        <Row>
          <Spinner color="#f59e0b" size={compact ? 28 : 36} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Title color="#fbbf24">Waiting for MetaMask approval…</Title>
            <Label size={11}>
              Please confirm the transaction in the MetaMask popup.
            </Label>
          </div>
        </Row>
        {/* MetaMask visual hint */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 12px',
          background: 'rgba(245,158,11,0.06)',
          borderRadius: 8, border: '1px solid rgba(245,158,11,0.15)',
        }}>
          <span style={{ fontSize: 18 }}>🦊</span>
          <Label size={11} color="#fbbf24">
            Check for the MetaMask extension popup — it may be minimised in your browser toolbar.
          </Label>
        </div>
      </Card>
    );
  }

  // ── MINING ────────────────────────────────────────────────────────────────
  if (status === 'mining') {
    return (
      <Card accent="#a78bfa">
        <Row>
          <ChainPulse />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Title color="#a78bfa">Transaction submitted! Mining…</Title>
            <Label size={11}>
              Your transaction is in the mempool — waiting for block inclusion.
            </Label>
          </div>
        </Row>

        {txHash && <HashPill hash={txHash} href={explorerLink} />}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <TimeBadge network={network} />
          <Label size={10} color="#475569">Do not close this window.</Label>
        </div>

        {/* Animated progress bar */}
        <div style={{
          height: 3, borderRadius: 2, background: 'rgba(167,139,250,0.1)',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', width: '60%',
            background: 'linear-gradient(90deg, #7c3aed, #a78bfa)',
            borderRadius: 2,
            animation: 'slideDown 2s ease-in-out infinite alternate',
          }} />
        </div>
      </Card>
    );
  }

  // ── CONFIRMED ─────────────────────────────────────────────────────────────
  if (status === 'confirmed') {
    return (
      <Card accent="#10b981">
        <Row>
          <CheckMark />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Title color="#10b981">✓ Transaction Confirmed!</Title>
            {receipt?.blockNumber && (
              <Label size={11} color="#6ee7b7">
                Included in block #{receipt.blockNumber.toLocaleString()}
              </Label>
            )}
          </div>
        </Row>

        {txHash && <HashPill hash={txHash} href={explorerLink} />}

        {/* Links row */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {explorerLink && (
            <a href={explorerLink} target="_blank" rel="noopener noreferrer"
              style={{
                fontSize: 11, color: '#38bdf8', textDecoration: 'none',
                padding: '4px 10px', borderRadius: 20,
                border: '1px solid rgba(56,189,248,0.25)',
                background: 'rgba(56,189,248,0.06)',
              }}>
              ⛓ View on Etherscan ↗
            </a>
          )}
          {ipfsURL && (
            <a href={ipfsURL} target="_blank" rel="noopener noreferrer"
              style={{
                fontSize: 11, color: '#a78bfa', textDecoration: 'none',
                padding: '4px 10px', borderRadius: 20,
                border: '1px solid rgba(167,139,250,0.25)',
                background: 'rgba(167,139,250,0.06)',
              }}>
              📁 View file on IPFS ↗
            </a>
          )}
        </div>

        {/* Tamper-proof note */}
        <div style={{
          fontSize: 10, color: '#475569', padding: '6px 10px',
          background: 'rgba(16,185,129,0.04)',
          borderRadius: 6, border: '1px solid rgba(16,185,129,0.1)',
        }}>
          🔒 The IPFS CID is now permanently anchored on the Ethereum blockchain.
          Any modification to the file would change the CID, making tampering detectable.
        </div>
      </Card>
    );
  }

  // ── ERROR ─────────────────────────────────────────────────────────────────
  if (status === 'error') {
    return (
      <Card accent="#ef4444">
        <Row>
          <ErrorIcon />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Title color="#f87171">Transaction Failed</Title>
            <Label size={11} color="#fca5a5">
              {error || 'An unexpected error occurred.'}
            </Label>
          </div>
        </Row>

        {txHash && (
          <div style={{ opacity: 0.7 }}>
            <HashPill hash={txHash} href={explorerLink} />
          </div>
        )}

        {/* Retry hint */}
        <div style={{
          fontSize: 10, color: '#64748b', padding: '6px 10px',
          background: 'rgba(239,68,68,0.04)', borderRadius: 6,
          border: '1px solid rgba(239,68,68,0.12)',
        }}>
          💡 Check MetaMask for details. If the issue persists, ensure you are on
          the correct network and have sufficient ETH for gas.
        </div>
      </Card>
    );
  }

  return null;
};

export default TxStatus;
