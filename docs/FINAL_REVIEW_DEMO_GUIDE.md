# MediChain — Final Review Demonstration Guide

**Project:** MediChain — Decentralized Electronic Health Record & Clinical Decision Support System  
**Purpose:** Step-by-Step Practical Demonstration Protocol for Academic Examination / Project Defense  
**Target Environment:** Local Full-Stack OR Live Cloud Staging  
**Status:** **VERIFIED & READY FOR DEMONSTRATION**

---

## 1. Application Overview

MediChain is a patient-controlled Electronic Health Record (EHR) ecosystem that guarantees medical data integrity and patient sovereignty by uniting three foundational technologies:
1. **Ethereum Smart Contracts (EVM):** Enforces decentralized, immutable patient consent, access rights, and cryptographic integrity proofs.
2. **Decentralized Storage (IPFS) with Envelope Encryption (AES-256-GCM):** Stores encrypted medical files off-chain so sensitive Protected Health Information (PHI) is never exposed in plaintext to public networks or centralized cloud databases.
3. **AI Clinical Decision Support System (CDSS):** Provides real-time prescription validation, drug-drug interaction matrix checks, multi-disease risk modeling (heart, stroke, diabetes, kidney, etc.), dosage safety analysis, and patient digital twin simulations.

---

## 2. Architecture Overview (Based on Actual Implementation)

```
                         ┌────────────────────────────────────────┐
                         │           React 18 SPA (Vite/CRA)      │
                         │   TailwindCSS + Ethers.js v6 + ZXing   │
                         │ (Ports 3000 / Vercel Production)       │
                         └──────────────────┬─────────────────────┘
                                            │
                     REST API (JWT + Request-ID)    Web3 Provider (EIP-1193)
                                            │                       │
                                            ▼                       ▼
┌────────────────────────────────────────────────────────┐    ┌───────────────────────────┐
│              Node.js / Express 5 API Server            │    │    Ethereum Blockchain    │
│  - Helmet + MongoSanitize + XSS-Clean + HPP            │    │  - MediChain.sol (0.8.19) │
│  - Rate Limiters (100 general / 10 auth per 15 min)    │    │  - Sepolia / Hardhat Node │
│  - AES-256-GCM Envelope Encryption Service            │    │  - Timed & Emergency      │
│  - Multi-Gateway IPFS Manager (Pinata + Fallbacks)     │    │    Access Control         │
│  - Pino Structured JSON Logging & Audit Trails         │    │  - CID & Prescription     │
└──────────────┬─────────────────────────┬───────────────┘    │    Report Hash Anchors    │
               │                         │                    └───────────────────────────┘
               ▼                         ▼
┌──────────────────────────┐    ┌────────────────────────────────────────┐
│      MongoDB Atlas       │    │     Python Flask AI Microservice       │
│  - Users & Profiles      │    │  - Multi-Drug Interaction Matrix       │
│  - Medical Record Meta   │    │  - XGBoost + LightGBM + CatBoost       │
│  - Consent Records       │    │  - Prescription Scorer & Dosage Rules  │
│  - Immutable Audit Logs  │    │  - SHAP Explainability Engine          │
└──────────────────────────┘    └────────────────────────────────────────┘
```

---

## 3. User Roles in MediChain

1. **Patient (`patient`):**
   - Owns all medical data.
   - Generates and presents QR Health ID.
   - Grants and revokes access to specific doctors on-chain.
   - Views personal health timeline and audit trail.
   - Exports data (GDPR portability) or exercises right to erasure.

2. **Doctor (`doctor`):**
   - Scans patient QR code or queries wallet address to identify patients.
   - Uploads clinical records, diagnoses, and prescriptions.
   - Accesses only authorized patient records (consent strictly validated).
   - Utilizes AI-assisted prescription safety validation and disease risk models.

3. **Hospital / Clinic (`hospital`):**
   - Manages institutional facilities, beds, emergency ward capacity.
   - Evaluated by the multi-criteria Hospital Recommendation Engine.

4. **Administrator (`admin`):**
   - Monitors system analytics, health probes, audit events, and user registry.

---

## 4. Main Implemented Features Verified for Demo

| Feature | Verified Component | Live Endpoint / Route |
|---|---|---|
| Multi-Role Authentication | `frontend/src/pages/Login.jsx` | `POST /api/auth/login` |
| QR Health ID Display & Export | `frontend/src/components/QRHealthID.jsx` | `/qr-id` |
| Live Camera QR Scanner | `frontend/src/components/QRScanner.jsx` | `/scan-qr` |
| Encrypted IPFS Upload | `backend/routes/doctor.js` + `utils/encryption.js` | `POST /api/doctor/upload-record` |
| Cryptographic Integrity Check | `backend/utils/ipfs.js` | Deterministic SHA-256 CIDv1 |
| Smart Contract Consent Grant | `frontend/src/components/AccessManager.jsx` | `MediChain.sol::grantDoctorAccess` |
| Smart Contract Consent Revoke | `frontend/src/components/AccessManager.jsx` | `MediChain.sol::revokeDoctorAccess` |
| Authorized Record Decryption | `backend/routes/doctor.js` | `GET /api/doctor/record/:id/download` |
| AI Clinical Intelligence | `ai/routes/cdss.py` + `app.py` | `POST /cdss/analyze` |
| AI Drug Interaction Matrix | `ai/drug_checker.py` | `POST /check-drugs` |
| AI Health Risk Scoring | `frontend/src/pages/HealthRiskDashboard.jsx` | `POST /api/health-risk/score` |
| Patient Medical Timeline | `frontend/src/pages/HealthTimelinePage.jsx` | `GET /api/timeline` |
| Immutable Audit History | `backend/models/AuditLog.js` | `GET /api/account/export` |

---

## 5. End-to-End Demonstration Sequence

### Step 1: System Readiness Verification
- **Action:** Open browser and navigate to `http://localhost:5000/ready` (or deployed `https://medichain-1-sjnc.onrender.com/ready`).
- **Expected Result:** JSON response showing:
  ```json
  {
    "status": "ready",
    "checks": {
      "database": "ok",
      "service": "MediChain API"
    }
  }
  ```
- **Evidence to Note:** Proves MongoDB connection is active and backend is primed.

---

### Step 2: Patient Registration & Login
- **Action:**
  1. Navigate to `/register` or `/login`.
  2. Log in with a patient account (e.g. `patient@medichain.example` / `Password123!`).
- **Expected Result:**
  - Authenticates immediately.
  - JWT tokens stored securely.
  - Redirects to `/patient-dashboard`.
  - Welcome banner displays patient name and unique ID (`MC-PAT-2026-XXXXXX`).
- **Evidence to Note:** Request headers include `Authorization: Bearer <token>` and `X-Request-ID`.

---

### Step 3: View & Export QR Health ID
- **Action:**
  1. Click **QR Health ID** in the patient sidebar navigation (`/qr-id`).
  2. Inspect the generated QR code card.
  3. Click **Download Card (PNG)**.
- **Expected Result:**
  - High-resolution SVG QR code renders cleanly.
  - The QR encodes ONLY the safe identifier string (`MC-PAT-2026-XXXXXX`), confirming zero Protected Health Information is leaked into the visual code.
  - Canvas exports a branded 1000x1000px PNG card.
- **Evidence to Note:** Demonstrates mobile-ready clinical identification without privacy compromise.

---

### Step 4: Grant Doctor Access (Patient Consent Control)
- **Action:**
  1. Navigate to **Manage Access** (`/access`).
  2. Enter the authorized doctor's Ethereum wallet address:
     `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` (or doctor address from demo roster).
  3. Click **Grant Access**.
  4. Confirm the MetaMask transaction (or simulate on local Hardhat).
- **Expected Result:**
  - Button state transitions: `Idle` → `Processing (Waiting for blockchain confirmation)` → `Success`.
  - Blockchain emits `DoctorAccessGranted(patientAddress, doctorAddress, timestamp)`.
  - Authorized doctors table updates dynamically to display the newly granted doctor address.
- **Evidence to Note:** Transaction hash displayed with direct link to Sepolia Etherscan (or local block number).

---

### Step 5: Doctor Login & Patient Record Lookup
- **Action:**
  1. Open an incognito window or log out, then log in as the Doctor (`doctor@medichain.example` / `Password123!`).
  2. In the Doctor Dashboard (`/doctor-dashboard`), navigate to patient lookup.
  3. Enter the patient's wallet address or scanned patient ID.
- **Expected Result:**
  - Backend verifies active consent.
  - Patient overview loads, displaying active consent status and previous records.
- **Evidence to Note:** Demonstrates strict permission verification before record disclosure.

---

### Step 6: Medical Record Upload with AES-256-GCM & IPFS Anchoring
- **Action:**
  1. In the Doctor Dashboard, open **Upload Medical Record**.
  2. Select record type: **Prescription** or **Lab Report**.
  3. Enter clinical notes: *"Prescription for hypertensive patient: Lisinopril 10mg once daily."*
  4. Add medications: `Lisinopril, Metformin`.
  5. Attach a PDF or image report.
  6. Click **Upload & Anchor Record**.
- **Expected Result:**
  - **Client & Server Encryption:** Backend encrypts file bytes using **AES-256-GCM** before passing to IPFS.
  - **IPFS Pinning:** Pinata receives encrypted buffer and returns deterministic CIDv1 (e.g. `bafybeic...`).
  - **AI CDSS Analysis:** Microservice evaluates medication safety score and drug interactions.
  - **Database Persistence:** Medical record stored in MongoDB with `{ isEncrypted: true, encryptionMeta: { iv, authTag, encryptedKey } }`.
  - **UI Notification:** Success banner shows assigned IPFS CID and clinical safety confirmation.
- **Evidence to Note:** Terminal / Network console shows encryption log `[DOCTOR] 🔒 File encrypted with AES-256-GCM before upload`.

---

### Step 7: Authorized Record Retrieval & Real-Time Decryption
- **Action:**
  1. As the authorized doctor, click **Download / View Record** on the newly uploaded document.
- **Expected Result:**
  - Backend fetches encrypted ciphertext from IPFS gateway.
  - Validates `ConsentRecord.hasActiveConsent(patientId, doctorId)`.
  - Decrypts ciphertext in-memory using `decryptBuffer()`.
  - Returns original plaintext file with correct MIME type.
  - An audit log event `RECORD_ACCESSED` is written to MongoDB.
- **Evidence to Note:** Plaintext file is readable only because active consent was verified.

---

### Step 8: Execute AI Clinical Decision Support (CDSS)
- **Action:**
  1. Navigate to **CDSS / AI Prescription Validator** (`/prescription-validator` or `/ai-dashboard`).
  2. Enter two conflicting drugs, e.g.: `Warfarin` and `Aspirin`.
  3. Submit for AI analysis.
- **Expected Result:**
  - AI engine processes drug interaction rules and ML models.
  - Returns **High / Critical Severity Alert**:
    *"Major interaction: Concomitant use increases risk of severe bleeding."*
  - Displays safety score (e.g. 35/100) and clinical explanations.
  - Demonstrates that high-severity prescriptions trigger blocking warnings.
- **Evidence to Note:** Non-autonomous clinical disclaimer is explicitly shown on the UI.

---

### Step 9: Revoke Doctor Access (Consent Revocation Verification)
- **Action:**
  1. Log back in as the Patient.
  2. Navigate to **Manage Access** (`/access`).
  3. Locate the authorized doctor and click **Revoke Access**.
  4. Confirm blockchain transaction.
- **Expected Result:**
  - Transaction confirms: `DoctorAccessRevoked` event emitted on-chain.
  - Doctor address is removed from the active permissions list.
- **Evidence to Note:** Consent state is immediately revoked in real time.

---

### Step 10: Attempt Access After Revocation (Security Validation)
- **Action:**
  1. Switch back to the Doctor account.
  2. Attempt to download or view the patient's record again.
- **Expected Result:**
  - Request is **DENIED with HTTP 403 Forbidden**.
  - UI displays clear alert: *"Access denied: You do not have active patient consent to access this medical file."*
  - Security audit event `UNAUTHORIZED` is recorded with timestamp, doctor ID, and IP address.
- **Evidence to Note:** Proves cryptographic and role-based consent enforcement is truly end-to-end.

---

## 6. Evidence to Capture for Project Submission

1. **Smart Contract Proofs:**
   - Contract address on Sepolia: `0x54fb71438b6A79947BE43dFAfB72194619405004`.
   - 46/46 unit tests passing screenshot (`npx hardhat test`).
2. **Backend API Proofs:**
   - 62/62 tests passing in Jest (`npm test`).
   - `/ready` endpoint returning 200 OK with MongoDB status.
3. **AI Microservice Proofs:**
   - Pytest passing 3/3 test suites (`test_clinical_intelligence.py`).
   - Multi-drug conflict detection output.
4. **Data Privacy Proofs:**
   - Inspection of MongoDB document showing ciphertext / encryption metadata.
   - Demonstration that IPFS CID yields ciphertext unless decrypted through authorized backend route.

---

## 7. Known Limitations & Documented Edge Cases

1. **Free-Tier Cloud Cold Start:**
   - When hosted on Render free tier, instances spin down after 15 minutes of inactivity. Initial request may take 30–50 seconds to warm up. The frontend Axios client includes a 60-second timeout with a user-friendly cold-start banner.
2. **MetaMask Extension Dependency:**
   - On-chain transactions require an EVM browser extension (MetaMask) connected to Sepolia or a local Hardhat node (`http://127.0.0.1:8545`). If MetaMask is disconnected, the UI prompts the user to connect without crashing.
3. **Pinata Gateway Rate Limits:**
   - Under heavy batch retrieval, public IPFS gateways may throttle requests. The backend includes a resilient multi-gateway fallback list (`pinata`, `ipfs.io`, `cloudflare`) to guarantee uptime.

---

## 8. Recovery Procedures for Demonstration Edge Cases

| Scenario | Immediate Recovery Action |
|---|---|
| **Render API Cold Start / Timeout** | Refresh the `/ready` endpoint once in a browser tab. Once it responds 200, all frontend operations respond instantly. |
| **MetaMask Wrong Network Prompt** | Click the network switch button in the MediChain wallet header; it automatically triggers `wallet_switchEthereumChain` to Sepolia or Hardhat. |
| **Offline Internet / Local Demo Mode** | MediChain runs 100% locally: run `start:chain` (Hardhat node), `start:backend`, `start:ai`, and `start:frontend`. Local MongoDB Memory Server and mock IPFS fallbacks enable an entirely offline demonstration. |
| **Forgotten Test Credentials** | Pre-seeded accounts are documented in `docs/DEVELOPER_GUIDE.md` and test fixtures. |
