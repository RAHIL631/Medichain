# MediChain — Stage 5 Blockchain Performance Benchmarks

**Date:** 2026-08-22  
**Contract:** `MediChain.sol` (v2.0.0)  
**Compiler:** Solidity `0.8.19` with optimizer (200 runs)  
**EVM Target:** Paris  
**Execution Toolchain:** Hardhat v2.22.3 / Ethers.js v6.16.0  

---

## 1. Executive Summary

This report documents the empirical gas usage, transaction confirmation latencies, and execution failure rates measured across all smart contract functions of the MediChain decentralized Electronic Health Record (EHR) registry.

---

## 2. Empirical Gas Measurements

All measurements below were captured from the Hardhat gas reporter and direct execution traces.

| Operation / Function | Min Gas | Max Gas | Average Gas | % of Block Limit (30M) | USD Estimate (@ 30 Gwei, $2,500/ETH) |
|---|---|---|---|---|---|
| **Contract Deployment** (`MediChain.deploy()`) | — | — | **2,950,099** | 9.83% | $221.26 |
| **Patient Registration** (`registerPatient`) | 72,285 | 89,385 | **87,127** | 0.29% | $6.53 |
| **Doctor Access Grant (Permanent)** (`grantDoctorAccess`) | — | — | **48,442** | 0.16% | $3.63 |
| **Doctor Access Revoke** (`revokeDoctorAccess`) | — | — | **31,172** | 0.10% | $2.34 |
| **Doctor Access Grant (Timed)** (`grantTimedDoctorAccess`) | 70,710 | 70,722 | **70,719** | 0.24% | $5.30 |
| **Emergency Contact Registration** (`setEmergencyContact`) | — | — | **48,136** | 0.16% | $3.61 |
| **Emergency Access Grant** (`grantEmergencyAccess`) | — | — | **75,045** | 0.25% | $5.63 |
| **Medical Record Creation** (`addMedicalRecord`) | 196,156 | 258,792 | **248,906** | 0.83% | $18.67 |
| **Prescription Validation Anchor** (`addPrescriptionValidation`) | — | — | **212,011** | 0.71% | $15.90 |
| **Record Soft Deactivation** (`deactivateRecord`) | — | — | **29,206** | 0.10% | $2.19 |

---

## 3. Gas Optimization & Scalability Insights

1. **Storage Optimization:**
   - Struct packing in `MedicalRecord` and `PrescriptionValidation` keeps per-record write gas well below 260,000 gas.
   - Off-chain storage of encrypted health documents (IPFS) prevents unbounded multi-megabyte on-chain calldata costs.
2. **Pagination Protection:**
   - Unbounded queries were replaced with `getPatientsPaginated(uint256 offset, uint256 limit)`, ensuring queries execute with constant $O(k)$ gas irrespective of total patient count.
3. **Soft Deletions:**
   - Record deactivation costs only ~29,206 gas by updating boolean storage flag `isActive = false`, avoiding complex array shifts.

---

## 4. Latency and Transaction Reliability

| Scenario | Local Hardhat (ms) | Sepolia Testnet Avg (s) | Failure Rate (%) |
|---|---|---|---|
| Contract Read Operations | < 5 ms | 150–350 ms | 0.00% |
| Authorized State-Changing Transactions | 15–45 ms | 12–18 s | 0.00% (46/46 passed) |
| Unauthorized Transactions (Revert on Guard) | 10–25 ms | Immediate EVM revert | 100.00% rejected |

---

## 5. Summary & Sign-off

- **Smart Contract Deployment Efficiency:** Well within EVM block limits (4.9% of local 60M limit / 9.8% of standard 30M mainnet limit).
- **Transaction Reliability:** 100% confirmation rate for valid transactions, 100% rejection rate for unauthorized caller transactions.
