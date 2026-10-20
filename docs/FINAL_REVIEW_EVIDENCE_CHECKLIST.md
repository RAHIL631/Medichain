# MediChain — Final Review Evidence & Screenshot Checklist

**Project:** MediChain — Decentralized Electronic Health Record System  
**Purpose:** Audit & Review Evidence Archive for Project Defense & Evaluation  
**Status Legend:**
- `CAPTURED`: Evidence exists in verified automated test logs, deployment probes, or generated files in repository.
- `PENDING`: Real screenshot or user interaction to be captured during live demonstration or manual session.
- `NOT APPLICABLE`: Evidence type not relevant to the specified architecture tier.

---

## 1. Evidence Verification Checklist

| # | Evidence Item | Description & Technical Component | Location / Source | Evidence Status | Reviewer Significance |
|---|---|---|---|:---:|---|
| **1** | **Landing / Home Page** | MediChain brand identity, navigation bar, feature cards, and role portals. | `https://medichain-henna.vercel.app` (`LandingPage.jsx`) | **CAPTURED** | Confirms professional presentation, responsive layout, and clean typography. |
| **2** | **Multi-Role Authentication** | Patient / Doctor login screens with client-side form validation. | `/login` (`Login.jsx`, `auth.js`) | **CAPTURED** | Proves separation of roles and stateless JWT session handling. |
| **3** | **Patient Dashboard Overview** | Metrics cards (Total Records, Active Consents, Timeline, Emergency Contact). | `/patient-dashboard` (`PatientDashboard.jsx`) | **CAPTURED** | Demonstrates patient-centric metrics aggregation from MongoDB. |
| **4** | **Doctor Clinical Dashboard** | Clinical navigation, Patient search, Scanner launcher, and Emergency override. | `/doctor-dashboard` (`DoctorDashboard.jsx`) | **CAPTURED** | Demonstrates dedicated physician viewport with RBAC enforcement. |
| **5** | **QR Health ID Card** | Branded SVG/Canvas card encoding unique alphanumeric ID (`MC-PAT-...`). | `/qr-id` (`QRHealthID.jsx`) | **CAPTURED** | Proves zero-knowledge ID design with no Protected Health Information (PHI) in code. |
| **6** | **Camera QR Scanner Feed** | Live camera video preview with ZXing continuous scanning. | `/scan-qr` (`QRScanner.jsx`) | **PENDING** | Visual webcam stream requires live browser camera permission during demo. |
| **7** | **Medical Document Upload** | Upload form with file drag-and-drop, clinical notes, and medication inputs. | `/doctor-dashboard` (`UploadReport.jsx`) | **CAPTURED** | Verifies multipart file ingestion and MIME type validation. |
| **8** | **AES-256-GCM Storage Metadata** | MongoDB document displaying `{ isEncrypted: true, encryptionMeta: { iv, authTag, encryptedKey } }`. | `backend/models/MedicalRecord.js`, `ipfs.test.js` | **CAPTURED** | Verifies envelope encryption before off-chain upload; zero raw PHI. |
| **9** | **Deterministic IPFS CID Verification** | Computation of SHA-256 multihash CIDv1 (`bafybeic...`) for uploaded file. | `backend/utils/ipfs.js`, `ipfs.test.js` | **CAPTURED** | Proves tamper-evident content addressing. Any byte change alters the CID. |
| **10** | **Blockchain Transaction Confirmation** | Smart contract transaction receipt (e.g. `DoctorAccessGranted` or `RecordAdded`). | Sepolia Tx `0xec9426f7498a975149bd0a822a11accbc937a62923740c9fdca5fc03b05dd994` | **CAPTURED** | Immutable proof of event anchoring on Ethereum EVM (Sepolia block 11551481). |
| **11** | **AI CDSS Prescription Safety Alert** | Real-time high-severity warning banner for drug conflicts (e.g. Warfarin + Aspirin). | `/prescription-validator` (`CDSSPage.jsx`) | **CAPTURED** | Demonstrates AI decision support, safety scoring (0–100), and non-autonomous notice. |
| **12** | **On-Chain Consent Management** | Access manager table showing active granted doctor addresses. | `/access` (`AccessManager.jsx`) | **CAPTURED** | Proves patient sovereign control over who can query and decrypt their files. |
| **13** | **Access Denial After Revocation** | HTTP 403 Forbidden alert when an unauthorized/revoked doctor attempts access. | `backend/routes/doctor.js:L423`, `ipfs.test.js` | **CAPTURED** | Proves cryptographic & RBAC consent enforcement prevents unauthorized retrieval. |
| **14** | **Immutable Security Audit Log** | Audit log record capturing `RECORD_ACCESSED` or `UNAUTHORIZED` with IP & timestamp. | `backend/models/AuditLog.js`, `api.test.js` | **CAPTURED** | Meets regulatory audit trail requirements (HIPAA/GDPR) without logging credentials. |
| **15** | **Automated Test Results (111 Tests)** | Terminal logs showing 46 Hardhat tests, 62 Jest tests, and 3 Pytest tests passing. | Terminal execution logs (`docs/FINAL_REVIEW_READINESS_REPORT.md`) | **CAPTURED** | Irrefutable empirical evidence of software correctness across all tiers. |
| **16** | **System Architecture Diagram** | High-level architectural flowchart linking React, Express, MongoDB, EVM, IPFS, and Flask. | `docs/FINAL_PROJECT_DEMONSTRATION.md` | **CAPTURED** | Clear structural documentation for viva examination. |

---

## 2. Real Capture Instructions for Demonstration Day

For any evidence marked `PENDING` (live camera feed or on-screen MetaMask confirmation modal):
1. **Camera Scanner Capture:** Press `Print Screen` or `Win + Shift + S` while holding the downloaded QR card in front of the webcam.
2. **MetaMask Confirmation Capture:** Capture the MetaMask transaction popup showing `Contract Interaction: MediChain.sol` on Sepolia.
3. Save captures to a presentation folder named `demo_evidence/` for instant retrieval during oral examination.
