# MediChain — Data Governance Document
**Version:** 1.0  
**Date:** 2026-08-20

---

## IMPORTANT DISCLAIMER

> This document represents the current architecture. Before production deployment with real patient data, this document must be reviewed by qualified data protection counsel familiar with applicable healthcare regulations in the target jurisdiction (e.g., IT Act 2000 / DPDPA 2023 for India; HIPAA for US; GDPR for EU).

---

## 1. DATA INVENTORY

### 1.1 MongoDB — User Collection

| Field | Type | Sensitivity | Purpose | Retention |
|---|---|---|---|---|
| name | String | PII | Identity | Lifetime of account |
| email | String | PII | Authentication, notifications | Lifetime of account |
| password (hashed) | String | Critical | Authentication | Lifetime of account |
| role | String | Low | Access control | Lifetime of account |
| walletAddress | String | Low-Medium | Blockchain identity | Lifetime of account |
| bloodGroup | String | Health PII | Emergency/clinical | Lifetime of account |
| allergies | [String] | Health PII | Clinical safety | Lifetime of account |
| chronicConditions | [String] | Health PII | Clinical context | Lifetime of account |
| dateOfBirth | Date | PII | Identity verification | Lifetime of account |
| phone | String | PII | Contact | Lifetime of account |
| specialization | String | Professional | Doctor profile | Lifetime of account |
| licenseNumber | String | Professional | Doctor verification | Lifetime of account |
| isBlockchainRegistered | Boolean | Low | System state | Lifetime of account |
| createdAt, updatedAt | Date | Metadata | Audit | Lifetime of account |

**Encryption at rest:** MongoDB not configured with field-level encryption in current prototype.  
**Access:** Application service account only. Database should not be exposed publicly.

### 1.2 MongoDB — MedicalRecord Collection

| Field | Type | Sensitivity | Purpose |
|---|---|---|---|
| patientId | ObjectId ref | Medium | Ownership |
| patientWalletAddress | String | Low-Medium | Blockchain lookup |
| doctorId | ObjectId ref | Medium | Ownership |
| ipfsCID | String | Critical | File locator |
| ipfsURL | String | Critical | File access URL |
| recordType | String | Health | Classification |
| fileName | String | Low | UX |
| fileSize | Number | Low | Metadata |
| fileMimeType | String | Low | Metadata |
| notes | String | Health PII | Clinical notes |
| medications | [String] | Health PII | Drug information |
| aiAnalysis | Object | Health PII | AI results |
| blockchainTxHash | String | Low | Blockchain proof |
| isActive | Boolean | Low | Soft delete |

### 1.3 MongoDB — AuditLog Collection

| Field | Type | Sensitivity | Retention |
|---|---|---|---|
| userId | ObjectId | Low-Medium | 365 days (TTL index) |
| userRole | String | Low | 365 days |
| userEmail | String | PII | 365 days |
| method, path | String | Low | 365 days |
| ipAddress | String | PII | 365 days |
| userAgent | String | Low | 365 days |
| statusCode | Number | Low | 365 days |
| action | String | Low | 365 days |

**Note:** `userEmail` in audit logs is PII. Consider using userId reference only.

### 1.4 MongoDB — ConsentRecord Collection

| Field | Type | Purpose | Retention |
|---|---|---|---|
| patientId | ObjectId | Access control | Until revoked |
| granteeId | ObjectId | Access control | Until revoked |
| granteeRole | String | Access control | Until revoked |
| scope | [String] | Access scope | Until revoked |
| status | String | Active/revoked | Permanent (audit trail) |
| blockchainTxHash | String | Blockchain proof | Permanent |
| revokedAt | Date | Revocation timestamp | Permanent |

### 1.5 IPFS (Pinata)

| What | Sensitivity | Current State | Required State |
|---|---|---|---|
| Medical documents (PDF, images) | Critical Health PII | Uploaded unencrypted | Must be encrypted with AES-256-GCM |
| File content | Critical Health PII | Publicly retrievable by CID | Must be encrypted; CID alone insufficient |

**Key point:** IPFS is content-addressed, not access-controlled. Anyone with the CID can retrieve the file. The security model MUST rely on encryption, not CID obscurity.

### 1.6 Blockchain (Ethereum / Sepolia)

| What | Stored On-Chain | Sensitivity |
|---|---|---|
| Patient wallet address | Yes (mapping key) | Low-Medium |
| IPFS CID | Yes (in MedicalRecord struct) | Medium (if file encrypted, CID alone is not sensitive) |
| IPFS URL | Yes (in MedicalRecord struct) | Medium |
| Record type | Yes | Low |
| Doctor wallet address | Yes | Low |
| Block timestamp | Yes | Low |
| Prescription hash | Yes | Low |
| Safety score + severity | Yes | Medium |

**Critical note:** Blockchain data is immutable. Once written, it cannot be deleted. Patient wallet addresses and CIDs are permanently on-chain. This has significant implications for right-to-erasure requests.

### 1.7 AI Service

| What Is Sent | From | Purpose | Stored Permanently |
|---|---|---|---|
| Patient health metrics | Backend → AI | Risk prediction | No (computation only) |
| Medication list | Backend → AI | Drug interaction | No (computation only) |
| Prescription image/text | Frontend → Backend → AI | OCR extraction | Returned to MongoDB |
| Age, blood group, conditions | Backend → AI | Clinical analysis | No |

**Note:** The AI service currently does not persist any data. Prediction results are returned to the backend and stored in MedicalRecord.aiAnalysis.

### 1.8 Logs

| What | Location | Sensitivity | Retention |
|---|---|---|---|
| HTTP request logs (morgan) | Console (dev only) | Low-Medium | Ephemeral |
| Audit logs | MongoDB | Medium | 365 days |
| AI service logs | Console | Low | Ephemeral |
| Error logs | Console | Low-Medium | Ephemeral |

---

## 2. DATA FLOW MAP

```
Patient Registration
  → Frontend (email, password, role, health fields)
  → Backend API /api/auth/register
  → MongoDB User collection (password hashed, fields stored)
  → No external service called

Patient Record Upload (Doctor)
  → Frontend (file + metadata)
  → Backend /api/doctor/upload-record
  → Pinata IPFS (file buffer) → CID returned
  → Python AI /cdss/analyze (medications list) → AI results returned
  → MongoDB MedicalRecord (CID + URL + AI results stored)
  → Frontend → MetaMask → Ethereum addMedicalRecord() (CID on-chain)

Drug Interaction Check
  → Frontend (drug name)
  → Backend /api/ai/check-drugs
  → MongoDB (existing medications fetched)
  → Python AI /check-drugs
  → Python AI → RxNorm API (drug names sent, NO patient PII sent)
  → Results returned to frontend

Hospital Recommendation
  → Frontend (diseases, location, emergency level)
  → Backend /api/hospital-recommendation/recommend
  → MongoDB Hospital collection (query based on criteria)
  → Score calculated backend-side (NO external API call)
  → Results returned to frontend
```

---

## 3. DATA SUBJECT RIGHTS

### Current Implementation Status

| Right | Status | Notes |
|---|---|---|
| Access (view own data) | ✅ Partial | Patient can view records via dashboard |
| Rectification | ✅ Partial | Profile update endpoint exists |
| Erasure | ❌ Not implemented | No account deletion endpoint |
| Portability | ❌ Not implemented | No data export endpoint |
| Objection | ❌ Not implemented | No consent withdrawal mechanism for analytics |
| Restriction | ❌ Not implemented | |

### Blockchain Limitation on Erasure
Records anchored to the Ethereum blockchain are immutable by design. Personal data (wallet address, CID, medical record type) cannot be deleted from the blockchain. This is a fundamental architectural conflict with right-to-erasure requirements in jurisdictions such as GDPR. Legal review required before EU deployment.

---

## 4. DATA RETENTION POLICY

| Data Type | Retention | Mechanism |
|---|---|---|
| User accounts | Until deletion request | Manual (not implemented) |
| Medical records | Indefinite (soft-delete only) | isActive flag |
| Audit logs | 365 days | MongoDB TTL index |
| Consent records | Permanent (audit trail) | No TTL |
| AI analysis results | Embedded in MedicalRecord | Follows record retention |
| Blockchain records | Permanent (immutable) | Cannot be deleted |
| IPFS files | Until unpinned from Pinata | Manual |

---

## 5. DATA MINIMIZATION ASSESSMENT

| Data | Minimization Status |
|---|---|
| userEmail in AuditLog | Could use userId reference only |
| IP addresses in AuditLog | Required for security; flag for jurisdiction-specific review |
| AI sends full medication list | Only necessary fields sent; no patient identity |
| Blockchain stores full IPFS URL | CID alone would be sufficient |

---

## 6. HOSPITAL DATA GOVERNANCE

### Data Source
Current hospital data in MongoDB is entered manually. Source and verification status of each record must be documented.

### Staleness Policy
- Hospital records must display `lastVerifiedAt` timestamp
- Records not verified within **90 days** must be labeled "Data may be outdated"
- `isVerified` field indicates admin verification, not real-time availability

### What Must NOT Be Fabricated
- Hospital facility capabilities
- Emergency response capabilities
- Success rates
- Doctor counts
- ICU/bed availability

All hospital data must be sourced from:
- Official hospital documentation
- Government healthcare registries (NHA, state health departments)
- Direct hospital-provided and verified information

---

## 7. THIRD-PARTY DATA SHARING

| Service | Data Sent | Purpose | Controlled By |
|---|---|---|---|
| Pinata (IPFS) | Medical file content (unencrypted currently) | Storage | Pinata Privacy Policy |
| RxNorm API (NLM) | Drug names only (NO patient ID) | Drug interaction | NLM Terms of Service |
| Ethereum/Hardhat | Wallet address, CID, record metadata | Blockchain proof | Smart contract |

---

## 8. REQUIRED ACTIONS BEFORE PRODUCTION

1. Implement AES-256-GCM encryption for all IPFS file uploads
2. Implement patient data export endpoint
3. Implement account deletion workflow
4. Remove userEmail from AuditLog or document legal basis
5. Define formal data retention policy document
6. Perform Data Protection Impact Assessment (DPIA)
7. Draft privacy notice for patients
8. Legal review of blockchain immutability vs. erasure rights
9. Document hospital data sources with verification timestamps
10. Configure MongoDB encryption at rest for production deployment
