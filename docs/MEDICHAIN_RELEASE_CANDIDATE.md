# MediChain — Release Candidate Checklist (RC-1.0.0-academic)

**Project:** MediChain — Decentralized EHR & Clinical Decision Support System  
**Release Candidate ID:** `RC-1.0.0-academic`  
**Base Commit Identifier:** `5b9559a` (Branch: `main`)  
**Evaluation Date:** October 17, 2026  
**Quality Lead / Release Engineer:** Senior Full-Stack & QA Architect  
**Current Governance Directive:** Freeze release candidate; no automatic push, tag, or production deployment without explicit authorization.

---

## 1. Release Candidate Scope & Working Tree State

The current release candidate incorporates all remediation, productization, and security hardenings accumulated through Stages 1–5:

### 1.1 Modified Working Tree Components
- **AI Microservice:**
  - `ai/cdss/clinical_intelligence_engine.py`: Hybrid ensemble scoring & validation rules.
  - `ai/cdss/predictive_analytics.py`: Fallback and calibration enhancements.
  - `ai/models_registry/version_manifest.json`: Versioned model registry manifest (v2.0.0).
- **Backend API:**
  - `backend/server.js`: Helmet headers, rate-limiting, CORS, sanitization, token blocklist.
  - `backend/models/ConsentRecord.js`: Strict patient-doctor access rules and TTL tracking.
  - `backend/models/MedicalRecord.js`: AES-256-GCM envelope metadata, IPFS CIDv1, and SHA-256 hash anchoring.
  - `backend/routes/patient.js` & `backend/routes/doctor.js`: Authorized consent gates, patient lookup, record retrieval.
  - `backend/utils/ipfs.js`: Resilient multi-gateway retrieval (`Pinata`, `IPFS.io`, `Cloudflare`) with retry backoff.
- **Frontend Web Application:**
  - `frontend/src/App.jsx`: Global ErrorBoundary, centralized routing, toast notifications.
  - `frontend/src/pages/LandingPage.jsx`: Real Facility Directory & Capability Index linked to `Hospital.js`.
  - `frontend/src/pages/Register.jsx`: Multi-role onboarding with explicit Web3 wallet-optional callout.
  - `frontend/src/pages/PatientDashboard.jsx`: Actionable 3-step empty state onboarding card.
  - `frontend/src/components/QRHealthID.jsx`: Zero-knowledge privacy badge confirming identifier-only payload (`MC-PAT-YYYY-XXXXXX`).
  - `frontend/src/components/cdss/CDSSAlertBanner.jsx`: Non-autonomous clinical advisory disclaimer.
  - `frontend/src/utils/api.js`: Cleaned of unused variables; resilient 60s timeout handling for cloud cold-starts.

---

## 2. Release Candidate Quality Gate Checklist

| Item | Quality Gate Criteria | Verification Method | Status | Notes |
| :---: | :--- | :--- | :---: | :--- |
| **QG-01** | **Backend API Test Suite** | `npm test` in `backend/` | **PASS** | 62 / 62 tests passing across 5 suites (Jest). |
| **QG-02** | **Smart Contract Test Suite** | `npx hardhat test` in root | **PASS** | 46 / 46 tests passing (Hardhat EVM). |
| **QG-03** | **AI CDSS Microservice Suite** | `pytest tests/` in `ai/` | **PASS** | 3 / 3 test suites passing. |
| **QG-04** | **Frontend Production Compilation** | `react-scripts build` in `frontend/` | **PASS** | Compiled with 0 errors and 0 ESLint warnings. |
| **QG-05** | **Zero Hardcoded Secrets in Repo** | Git grep / env audit | **PASS** | All credentials sourced via environment variables. |
| **QG-06** | **Live Smart Contract Synchronization** | RPC inspection on Sepolia | **PASS** | Contract active at `0x54fb71438b6A79947BE43dFAfB72194619405004`. |
| **QG-07** | **Live Cloud Backend Availability** | HTTP GET `/api/health` | **PASS** | Render API responds with HTTP 200 OK. |
| **QG-08** | **Live AI Microservice Availability** | HTTP GET `/health` | **PASS** | Render AI responds with HTTP 200 OK. |
| **QG-09** | **Live Frontend Deployment** | HTTP GET `/` on Vercel | **PASS** | Vercel production edge responds with HTTP 200 OK. |
| **QG-10** | **Zero-Knowledge Privacy Adherence** | QR code structure validation | **PASS** | QR strictly encodes safe patient ID; zero PHI leakage. |
| **QG-11** | **Patient Consent Enforcement** | Unauthorized doctor retrieval test | **PASS** | HTTP 403 Forbidden returned without active consent. |
| **QG-12** | **End-to-End Encryption Integrity** | AES-256-GCM envelope roundtrip | **PASS** | Ciphertext validated with auth tag; tamper-proof. |

---

## 3. Preservation & Release Governance Policy

1. **Working Tree Safety:**
   - No untracked file deletion without explicit request.
   - Working tree modifications are preserved in place.
2. **Release Freeze:**
   - Codebase enters a strict **Demonstration Release Freeze**.
   - No experimental dependencies, unvetted architecture changes, or cosmetic refactoring permitted prior to academic review.
3. **Deployment Guard:**
   - Production cloud endpoints remain untouched. No automated `git push`, branch merge, or production redeployment will be executed.
