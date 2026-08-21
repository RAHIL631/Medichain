# MediChain — Blockchain Security Audit
**Date:** 2026-08-20  
**Contract:** MediChain.sol v2.0  
**Network:** Hardhat local / Sepolia testnet

---

## 1. CONTRACT OVERVIEW

Single contract: `MediChain.sol`  
Solidity: `0.8.19` with optimizer (200 runs)

### Functions
| Function | Access | Description |
|---|---|---|
| registerPatient() | External, any | Registers caller as patient |
| getAllPatients() | External view, any | Returns all patient addresses |
| getPatientCount() | External view, any | Returns total patient count |
| addMedicalRecord(...) | External, authorized doctor | Adds IPFS CID record |
| getMedicalRecords(...) | External view, authorized | Returns all records for patient |
| getRecordCount(...) | External view, registered patient | Returns record count |
| getPatientRecordsByType(...) | External view, authorized | Filtered records by type |
| deactivateRecord(...) | External, patient only | Soft-deletes a record |
| grantDoctorAccess(...) | External, registered patient | Permanent access grant |
| grantTimedDoctorAccess(...) | External, registered patient | Time-limited access grant |
| revokeDoctorAccess(...) | External, registered patient | Revokes permanent and timed access |
| hasAccess(...) | External view, any | Checks access status |
| getTimedAccessRemaining(...) | External view, any | Returns remaining seconds |
| setEmergencyContact(...) | External, registered patient | Sets emergency contact address |
| getEmergencyContact(...) | External view, registered patient | Returns emergency contact |
| grantEmergencyAccess(...) | External, emergency contact | Grants 24h access to doctor |
| addPrescriptionValidation(...) | External, authorized doctor | Anchors prescription hash |
| getPrescriptionValidations(...) | External view, patient or doctor | Returns validations |
| getPrescriptionValidationCount(...) | External view, any | Returns count |
| verifyPrescriptionHash(...) | External view, any | Verifies hash exists |

---

## 2. ACCESS CONTROL REVIEW

### Modifiers
| Modifier | Implementation | Assessment |
|---|---|---|
| `onlyRegisteredPatient` | `require(isRegistered[msg.sender])` | ✅ Correct |
| `patientMustExist` | Checks address != 0 AND isRegistered | ✅ Correct |
| `onlyAuthorizedDoctor` | Calls `_isAuthorized()` | ✅ Correct |

### _isAuthorized() Logic
```solidity
if (caller == patientAddr) return true;         // patient accesses own records
if (doctorAccess[patient][caller]) return true;  // permanent grant
TimedAccess ta = timedAccess[patient][caller];
if (ta.granted && block.timestamp <= ta.expiresAt) return true; // timed grant
return false;
```
Assessment: Logic is correct. Time comparison uses `<=` which is appropriate.

---

## 3. VULNERABILITIES FOUND AND STATUS

### FIXED (2026-08-20)
| ID | Vulnerability | Severity | Fix Applied |
|---|---|---|---|
| BC-FIX-001 | `addPrescriptionValidation()` had no authorization check — any address could add validation records for any patient | Critical | Added `onlyAuthorizedDoctor` modifier |

### REMAINING RISKS

| ID | Risk | Severity | Status |
|---|---|---|---|
| BC-001 | `getAllPatients()` returns entire patientList array — O(n) gas, could exceed block gas limit with many users | High | Not fixed |
| BC-002 | No upgradeable proxy — cannot patch contract post-deployment | Medium | By design (accepted) |
| BC-003 | Emergency access grants 24h to any doctor address — no reason string logged on-chain | Medium | Documentation only |
| BC-004 | Medical record IPFS CIDs stored on public chain — CIDs are discoverable | Medium | By design (files must be encrypted) |
| BC-005 | `verifyPrescriptionHash()` and `getPrescriptionValidationCount()` accessible by any address — may leak metadata | Low | Accepted |
| BC-006 | `isRegistered` is public mapping — anyone can check if an address is a registered patient | Low | Accepted (address-level, not personal data) |

---

## 4. RE-ENTRANCY ANALYSIS

All state-changing functions:
- Do not call external contracts
- Do not transfer ETH
- Do not use `.call()`, `.delegatecall()`, or `.transfer()`

Assessment: **No re-entrancy risk** in current contract design.

---

## 5. INTEGER OVERFLOW/UNDERFLOW

Solidity 0.8.x includes built-in overflow/underflow protection (reverts on overflow).

Assessment: **Safe** — no manual arithmetic operations that could overflow.

---

## 6. ACCESS CONTROL GAPS

### getRecordCount()
```solidity
function getRecordCount(address patientAddr)
    external view
    patientMustExist(patientAddr)
    returns (uint256)
```
**Note:** Does not require `onlyAuthorizedDoctor` — anyone can query record count for a patient. This is metadata leakage. Severity: Low.

### getPrescriptionValidationCount()
Same issue — any address can query prescription count.

---

## 7. GAS ANALYSIS

| Function | Gas Risk | Notes |
|---|---|---|
| getAllPatients() | HIGH | Unbounded array return |
| getPatientRecordsByType() | MEDIUM | O(n) iteration over all records |
| getMedicalRecords() | MEDIUM | Returns entire records array |
| verifyPrescriptionHash() | MEDIUM | O(n) iteration over validations |

**Recommendation:** Add pagination parameters or move large list queries off-chain using event logs.

---

## 8. EVENT COVERAGE

All state changes emit events:
- PatientRegistered ✅
- RecordAdded ✅
- DoctorAccessGranted ✅
- DoctorAccessRevoked ✅
- RecordDeactivated ✅
- TimedAccessGranted ✅
- EmergencyContactSet ✅
- EmergencyAccessGranted ✅
- PrescriptionValidated ✅

Assessment: **Good event coverage** — all important state changes are logged on-chain.

---

## 9. NETWORK CONFIGURATION

| Network | Purpose | Chain ID |
|---|---|---|
| localhost (Hardhat) | Development | 31337 |
| Sepolia | Staging/Demo | 11155111 |
| Mainnet | Not configured | — |

**Recommendation:** For a healthcare application, a public mainnet deployment requires careful legal and regulatory analysis before proceeding. Consider permissioned blockchain or layer-2 with data availability guarantees.

---

## 10. PRIVATE KEY MANAGEMENT

**Current:** Private key loaded from `blockchain/.env` (PRIVATE_KEY variable)  
**Risk:** If `blockchain/.env` is committed to git, private key is exposed  
**Status:** `blockchain/.env` is in `.gitignore` — appears safe  
**Recommendation:** Use a hardware wallet or managed key service for production deployment

---

## 11. REQUIRED FIXES BEFORE MAINNET

1. ✅ Add authorization to `addPrescriptionValidation()` — DONE
2. ❌ Implement pagination for `getAllPatients()` or move to event-log-based queries
3. ❌ Add emergency access reason logging (off-chain event or on-chain string)
4. ❌ Consider whether record count endpoints should be access-controlled
5. ❌ Formal security audit by a smart contract auditing firm before mainnet
