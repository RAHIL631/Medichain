# MediChain — Comprehensive Technical Architecture & Engineering Documentation

**Project:** MediChain — Decentralized Electronic Health Record (EHR) & Clinical Decision Support System (CDSS)  
**Document Type:** Technical Reference Architecture & System Implementation Whitepaper  
**Version:** 3.0.0 (Production Release Candidate)  
**Date:** October 2026  

---

## 1. System Architecture

MediChain is engineered as a decoupled, multi-tier microservices architecture designed to address the trilemma of **confidentiality, integrity, and clinical utility** in healthcare IT.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PRESENTATION TIER                               │
│  React 18 Single Page Application (Tailwind CSS, Ethers.js v6, ZXing) │
└──────────────────┬─────────────────────────────────┬───────────────────┘
                   │ HTTPS / JSON REST API           │ Web3 / EIP-1193 RPC
                   ▼                                 ▼
┌──────────────────────────────────────┐   ┌─────────────────────────────┐
│          API GATEWAY / BACKEND       │   │   DECENTRALIZED EXECUTION   │
│  Node.js / Express 5 Application     │   │   Ethereum EVM Smart        │
│  - Security & Rate Limiting Pipeline │   │   Contracts (Solidity 0.8.19│
│  - AES-256-GCM Envelope Encryption   │   │   - Access Control & Consent│
│  - Multi-Gateway IPFS Manager        │   │   - Record Hash Anchoring   │
│  - Pino Structured JSON Logging      │   │   - Prescription Auditing   │
└──────────────┬───────────────────────┘   └──────────────┬──────────────┘
               │                                          │
       ┌───────┴──────────────┐                           │
       ▼                      ▼                           ▼
┌──────────────┐    ┌─────────────────────────┐    ┌─────────────────────┐
│ PERSISTENCE  │    │      AI CDSS TIER       │    │ DECENTRALIZED STORE │
│ MongoDB      │    │  Python Flask Engine    │    │ Pinata IPFS Nodes   │
│ Atlas Cluster│    │  - Multi-Drug Matrix    │    │ - Encrypted Cipher  │
│ - Users      │    │  - XGBoost/LightGBM     │    │ - Content Hash CIDs │
│ - Meta CIDs  │    │  - Dosage Risk Models   │    │ - Multi-Gateway Fall│
│ - Consents   │    │  - Non-Autonomous Guard │    └─────────────────────┘
└──────────────┘    └─────────────────────────┘
```

The system separates metadata management from document storage:
- **Off-Chain Encrypted Storage:** Heavy binary medical documents (PDFs, radiological DICOM/JPEG scans) are never stored on the blockchain due to block gas limits. Instead, they are encrypted client-side/in-flight and pinned to IPFS.
- **On-Chain Access State:** The blockchain acts as the authoritative source of truth for patient consent, access timestamps, and cryptographic tamper detection.
- **Off-Chain Relational Metadata:** MongoDB Atlas stores queryable user profiles, hospital directory indexes, and cached transaction references.

---

## 2. Frontend Technology

- **Framework:** React 18.2.0 Single Page Application (SPA).
- **Styling Architecture:** TailwindCSS (utility-first) with an accessible medical-grade design token system (`hc-primary`, `hc-success`, `hc-warning`, `hc-danger`, `hc-surface`).
- **Web3 Interaction:** Ethers.js v6 (`BrowserProvider`, `Contract`, `formatEther`). Custom hooks encapsulate state:
  - `useWallet()`: Handles wallet connection, silent reconnection on refresh via `localStorage`, network detection, and chain switching.
  - `useContract(signer)`: Memoizes the typed `MediChain.sol` contract instance.
  - `usePatientRecords()` and `useAccessControl()`: Manage on-chain queries and transaction execution with loading/error lifecycle states.
- **Computer Vision / QR Processing:** `@zxing/library` (Zebra Crossing) for real-time video feed decoding from webcams.
- **Data Visualization:** `recharts` for interactive patient vital signs, adherence trends, and radar safety scores.
- **Bundle Optimization:** Webpack code splitting with gzip compression yielding a main bundle under 189 kB.

---

## 3. Backend / API Layer

- **Runtime:** Node.js v20+ with Express 5.2.1.
- **Security Pipeline (Middleware Execution Order):**
  1. `helmet()`: Enforces 14 security headers (CSP, HSTS, X-Frame-Options `SAMEORIGIN`, X-Content-Type-Options `nosniff`).
  2. `pinoHttp`: High-throughput structured JSON logging with dynamic log level filtering.
  3. `cors()`: Origin whitelisting supporting production Vercel frontend, local staging, and rejecting unauthorized origins.
  4. `express.json({ limit: '10kb' })`: Restricts request payload size to prevent DoS memory exhaustion.
  5. Native Express 5 NoSQL Sanitizer: Recursively removes any object keys containing `$` or `.` to eliminate NoSQL injection.
  6. Native Express 5 XSS Sanitizer: Recursively escapes `<, >, ", '` to prevent stored Cross-Site Scripting.
  7. HTTP Parameter Pollution (`hpp`): Normalizes duplicate query string arrays to the last item.
  8. `X-Request-ID`: Injects a unique tracing ID into every request and response header.
  9. Rate Limiters (`express-rate-limit`): 100 requests / 15 minutes globally; 10 requests / 15 minutes on `/api/auth/*`.
- **API Versioning:** Dual mounting allows seamless backward compatibility: both `/api/*` and `/api/v1/*` routes are exposed.

---

## 4. Database & Data Models

MediChain uses MongoDB Atlas with strict Mongoose schema validation:
- **`User`:** Stores identity attributes (name, email, hashed password, role enum: `['patient', 'doctor', 'hospital', 'admin']`, assigned `patientId` string format `MC-PAT-YYYY-XXXXXX`, linked `walletAddress`, blood group, allergies, chronic conditions).
- **`MedicalRecord`:** Stores metadata referencing off-chain files: `patientId`, `doctorId`, `ipfsCID`, `ipfsURL`, `fileName`, `fileMimeType`, `fileSize`, `isEncrypted: Boolean`, `encryptionMeta: { encryptedKey, iv, authTag, algorithm }`, and embedded `aiAnalysis` summary.
- **`ConsentRecord`:** Represents patient authorization grants: `patientId`, `granteeId`, `status: ['active', 'revoked', 'expired']`, `validUntil`, with a compound index `{ patientId: 1, granteeId: 1, status: 1 }` and a static helper `hasActiveConsent(patientId, granteeId)`.
- **`AuditLog`:** Compliance audit trail recording `userId`, `action`, `resource`, `ipAddress`, `userAgent`, `status`, and `metadata`. Configured with a TTL index (`expires: 31536000`) for automatic 365-day regulatory retention.

---

## 5. Authentication & Authorization

- **Authentication:** Stateless JSON Web Tokens (JWT).
  - Access Token: Signed with `JWT_SECRET`, valid for 24 hours.
  - Refresh Token: Signed with independent `JWT_REFRESH_SECRET`, valid for 7 days.
- **Password Security:** Salted hashing with `bcryptjs` using 12 computational rounds, protecting against dictionary and rainbow table attacks.
- **Authorization Enforcement:**
  - `protect` middleware: Verifies JWT signature from `Authorization: Bearer <token>`, checks the Redis/in-memory token blocklist (for revoked tokens on logout), and attaches `req.user`.
  - `authorize(...roles)` middleware: Confirms `req.user.role` matches required role privileges before handler execution.
- **Frontend vs Backend Distinction:** While the frontend hides or disables UI buttons based on the user's role, the **backend strictly enforces authorization on every single route**. Even if an attacker manually calls `POST /api/doctor/upload-record` with a valid patient JWT, the backend returns `HTTP 403 Forbidden`.

---

## 6. QR Identification Architecture

- **Privacy-First Design:** The QR code encodes **only the safe patient identifier string** (e.g., `MC-PAT-2026-A1B2C3`). It does **not** encode patient name, date of birth, blood group, or clinical history.
- **Threat Mitigation:** If a patient loses a physical printout of their QR code, a finder scanning it with an ordinary smartphone camera sees only an opaque identifier string with zero clinical or personal value.
- **Resolution & Export:** Generated dynamically via `qrcode.react` (SVG) and rendered to a 1000x1000px high-resolution canvas using `html2canvas` for crisp physical printing.

---

## 7. Medical Document Encryption Architecture

MediChain implements **AES-256-GCM Envelope Encryption** ([backend/utils/encryption.js](file:///c:/Users/Rahil%20hassan/OneDrive/Desktop/Major%20project/MediChain/backend/utils/encryption.js)):

1. **Algorithm:** Advanced Encryption Standard in Galois/Counter Mode (AES-256-GCM).
   - Provides 256-bit symmetric confidentiality.
   - Provides 128-bit integrity authentication via a cryptographic authentication tag (`authTag`). If any byte of ciphertext is modified in transit or on IPFS, decryption fails immediately.
2. **Key Envelope Workflow:**
   - For every uploaded file, the backend generates a cryptographically random 32-byte data key ($K_{data}$) and a 16-byte initialization vector ($IV$).
   - The raw file buffer is encrypted with $K_{data}$ and $IV$, producing `encryptedBuffer` and `authTag`.
   - $K_{data}$ is then wrapped (encrypted) using the server's 256-bit `ENCRYPTION_MASTER_KEY` ($K_{master}$).
   - The resulting encrypted key bundle, $IV$, and $authTag$ are stored in MongoDB.
   - Only the encrypted ciphertext buffer is transmitted to IPFS.

---

## 8. IPFS & Content Identifiers (CID)

- **Decentralized Pinning:** Utilizes Pinata SDK with deterministic fallback to generate CIDv1 identifiers.
- **Tamper Evidence:** IPFS addresses files by their cryptographic hash (SHA-256 multihash).
  - Any alteration to the document content changes the hash and produces a completely different CID.
  - Comparing the recalculated hash of a downloaded document against the on-chain recorded CID provides mathematical proof of integrity.
- **Gateway Resilience:** [backend/utils/ipfs.js](file:///c:/Users/Rahil%20hassan/OneDrive/Desktop/Major%20project/MediChain/backend/utils/ipfs.js) implements multi-gateway fallback (`gateway.pinata.cloud`, `ipfs.io`, `cloudflare-ipfs.com`) with automated exponential backoff retries (3 attempts, 1000ms base delay).

---

## 9. Blockchain & Smart Contracts

- **Language & Compiler:** Solidity `0.8.19` compiled via Hardhat with optimizer enabled (200 runs).
- **Contract Name:** `MediChain.sol` (deployed on Sepolia at `0x54fb71438b6A79947BE43dFAfB72194619405004`).
- **Key State Variables & Mappings:**
  - `mapping(address => mapping(address => bool)) private _doctorAccess;`
  - `mapping(address => MedicalRecord[]) private _patientRecords;`
  - `mapping(address => mapping(address => uint256)) private _timedAccessExpires;`
  - `mapping(address => address) private _emergencyContacts;`
- **Core Functions:**
  - `registerPatient()`: Registers the caller wallet as a patient.
  - `grantDoctorAccess(address doctor)`: Enables clinical access for a specified doctor address; emits `DoctorAccessGranted`.
  - `revokeDoctorAccess(address doctor)`: Revokes clinical access; emits `DoctorAccessRevoked`.
  - `grantTimedDoctorAccess(address doctor, uint256 duration)`: Sets a timestamp-bounded access grant.
  - `grantEmergencyAccess(address patient, address doctor)`: Permitted only to the patient's registered emergency contact.
  - `addMedicalRecord(address patient, string cid, string url, string recordType, string notes)`: Callable only by an authorized doctor; anchors record metadata and emits `RecordAdded`.
  - `addPrescriptionValidation(address patient, string reportHash, uint8 score, string severity)`: Callable only by an authorized doctor; anchors the AI safety validation hash on-chain.
- **Test Coverage:** 46 passing unit tests verifying every modifier, access failure, and state transition.

---

## 10. AI / ML Clinical Decision Support (CDSS)

- **Microservice Framework:** Python Flask (v3.0.0) running on port 5001.
- **Model Registry:** Pre-trained, versioned machine learning models serialized via Joblib and Scikit-learn:
  - Gradient Boosting & XGBoost classifiers for:
    - Cardiovascular Disease Risk
    - Type 2 Diabetes Prediction
    - Stroke Probability
    - Chronic Kidney Disease (CKD)
    - Chronic Liver Disease
    - Medication Adherence Scoring
  - Multi-Model Ensemble Predictor: Soft-voting consensus combining XGBoost, LightGBM, and CatBoost.
- **Explainability:** Integrated SHAP (SHapley Additive exPlanations) values calculating feature importance weights for clinical transparency.
- **Non-Autonomous Clinical Disclaimer:** All AI responses explicitly state:
  > *"MediChain CDSS outputs represent clinical decision-support indicators generated by predictive models and do NOT constitute autonomous medical diagnoses. Licensed clinical review is required before treatment modification."*

---

## 11. Medication Normalization & Drug Interaction Engine

- **RxNorm Integration:** Connects to the National Library of Medicine (NLM) RxNorm REST API to normalize brand-name drugs into standard RxCUI concept identifiers.
- **Dual-Layer Interaction Detection:**
  1. *Online RxNorm Interaction API:* Queries live pharmacological conflict databases.
  2. *Offline Clinical Matrix Fallback:* Built-in 4-tier severity matrix (Critical, High, Moderate, Low) evaluating dangerous combinations (e.g., Warfarin + Aspirin $\rightarrow$ Critical Bleeding; ACE Inhibitors + Spironolactone $\rightarrow$ Severe Hyperkalemia).
- **Prescription Safety Score (0–100):**
  - Deducts penalty points for drug conflicts, contraindications, and patient allergies.
  - Prescriptions with `Critical` or `High` severity trigger `HTTP 422 Unprocessable Entity` blocking notifications in the doctor workflow.

---

## 12. Audit Logging & Compliance Architecture

- **Regulatory Alignment:** Implements technical controls corresponding to HIPAA Security Rule (§ 164.312(b) Audit Controls) and GDPR Article 30 (Records of Processing Activities).
- **Captured Attributes:** Timestamp, User ID, Role, Client IP Address, HTTP Method, Endpoint, User-Agent, Request ID, and Event Category (`RECORD_ACCESSED`, `CONSENT_GRANTED`, `CONSENT_REVOKED`, `UNAUTHORIZED`, `DATA_EXPORT`, `ACCOUNT_DELETED`).
- **Credential Protection:** Error handlers and loggers explicitly exclude `req.body.password`, authorization headers, and raw patient files from log streams.

---

## 13. Deployment Architecture

- **Frontend:** Deployed to Vercel global Edge CDN with automated HTTPS (`https://medichain-henna.vercel.app`).
- **Backend API:** Containerized Node.js service running on Render Cloud with automated health check probes (`/health`, `/ready`).
- **AI Microservice:** Python 3.11 environment hosted on Render (`https://medichain-ai.onrender.com`).
- **Database:** MongoDB Atlas M0 cluster with replica set high availability.
- **Blockchain:** Ethereum Sepolia Testnet (Chain ID: `11155111`) with local Hardhat EVM fallback (Chain ID: `31337`).

---

## 14. Error Handling & Graceful Degradation

- **Render Cold-Start Protection:** Axios clients in [frontend/src/utils/api.js](file:///c:/Users/Rahil%20hassan/OneDrive/Desktop/Major%20project/MediChain/frontend/src/utils/api.js) use a 60-second timeout with specific error message mapping to inform the user if the server is warming up.
- **AI Service Down Resilience:** If the AI microservice is unreachable, the backend catches the error, logs a warning, and allows medical document upload to proceed without failing the core transaction.
- **IPFS Unavailability Resilience:** If Pinata is unconfigured or unreachable, the system automatically falls back to computing a deterministic SHA-256 multihash CIDv1, preventing upload workflow abortion.
- **Decoupled Blockchain Provider:** If the user does not have MetaMask installed or is on the wrong network, the application displays an educational wallet connection modal rather than throwing unhandled promise rejections.

---

## 15. Security Boundaries

| Boundary | Threat Modeled | Security Mechanism |
|---|---|---|
| **Client $\rightarrow$ API** | Man-in-the-Middle (MitM) | TLS 1.3 encryption, Helmet Strict-Transport-Security (HSTS). |
| **API $\rightarrow$ Database** | NoSQL Injection | Express 5 recursive operator sanitization (`$` and `.` stripping). |
| **User Input $\rightarrow$ Browser** | Cross-Site Scripting (XSS) | Recursive HTML entity escaping, Content-Security-Policy headers. |
| **Public IPFS** | Data Breach / Snooping | AES-256-GCM envelope encryption before file transmission. |
| **Doctor $\rightarrow$ Patient Record** | Unauthorized Access | On-chain `hasAccess()` verification + DB `ConsentRecord` validation. |
| **API Endpoints** | Brute Force / DoS | Dual-tier IP rate limiting (100 general / 10 auth per 15 min). |
| **Blockchain Transactions** | Replay / Gas Limit | Nonce ordering, EIP-155 replay protection, optimized struct packing. |

---

## 16. Known Limitations

1. **Free-Tier Infrastructure Sleep Cycles:** Free cloud instances sleep after 15 minutes of inactivity; initial wake-up takes 30–50 seconds.
2. **Synthetic Training Data:** While AI architectures (XGBoost, LightGBM, CatBoost) are state-of-the-art, models were trained on synthetic and benchmark medical sets (MIMIC-III derivatives, UCI Health); they require clinical validation on institutional EHR data before real hospital deployment.
3. **EVM Gas Fees:** On-chain consent changes and record anchoring require small testnet ETH fees paid by the caller's wallet.

---

## 17. Future Improvements

1. **Zero-Knowledge Proofs (zk-SNARKs):** Enable verifiable clinical credential verification without disclosing the doctor's complete on-chain identity.
2. **Account Abstraction (ERC-4337):** Introduce gasless transactions where hospitals sponsor gas fees for low-income patients.
3. **FHIR / HL7 Interoperability:** Implement native Fast Healthcare Interoperability Resources (FHIR R4) JSON export converters.
4. **Decentralized Identifier (DID) Integration:** Align user authentication with W3C DID and Verifiable Credential standards.
