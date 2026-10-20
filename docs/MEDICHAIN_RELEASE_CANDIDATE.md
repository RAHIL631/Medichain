# MediChain — Release Candidate Checklist

**Project:** MediChain — Decentralized EHR & Clinical Decision Support System
**Release Candidate ID:** `RC-1.0.0-academic`
**Product version:** `1.0.0` (root `package.json`; no separate release version scheme found)
**Candidate label:** `RC-1.0.0-academic` (existing project label)
**Base commit:** `06eaec5543abe6d6b875cdd7a5bd4852942fd0ed` on `main`
**Assessment date:** October 20, 2026
**Candidate state:** Local, uncommitted changes; no tag, push, merge, or deployment performed
**Decision:** **BLOCKED** for patient/doctor workflow demonstration until access-control defects are corrected.

---

## 1. Release Candidate Scope & Working Tree State

The base commit is the Stage 5 productization commit. This checklist supersedes the older checklist based on commit `5b9559a`; its live-integration passes are not current evidence. Current candidate changes are local and uncommitted:

- `backend/server.js`: Authorization-header redaction in request logs.
- `backend/services/emailService.js`: Production email fallback now fails closed instead of logging verification codes.
- `backend/routes/doctor.js` and `backend/routes/patient.js`: Production uploads reject missing encryption configuration; doctor prescription persistence waits for successful required CDSS analysis.
- `backend/utils/ipfs.js`: Synthetic CID fallback restricted to test mode.
- `backend/tests/api.test.js`: Synthetic regression coverage for email, encryption, and AI failure paths.
- `frontend/src/pages/DoctorDashboard.jsx`: Medication check requirement, distinct chain/API statuses, and no clinical notes sent to the public contract.
- `frontend/src/components/Navbar.jsx`: Removed unused icon import reported by the production build.

These changes have not been committed and are not included in the base commit.

---

## 2. Release Candidate Quality Gates

| Gate | Check | Result | Evidence / caveat |
|---|---|---|---|
| Backend tests | `Push-Location backend; npm test -- --runInBand` | **PASS: 65 tests / 5 suites** | Memory MongoDB and synthetic fixtures; not a production DB test. |
| Contract tests | `Push-Location blockchain; npx hardhat test` | **PASS: 46 tests** | Local Hardhat only; no Sepolia transaction submitted. |
| AI tests | `Push-Location ai; python -m pytest tests` | **PASS: 3 tests** | XGBoost/scikit-learn artifact-version warnings; live integration not run. |
| Frontend test | `Push-Location frontend; $env:CI='true'; npm test -- --watchAll=false --runInBand` | **PASS: 1 test** | App title smoke test only; React Router future-flag warnings. |
| Frontend build | `Push-Location frontend; npm run build` | **PASS** | Compiled successfully without ESLint warnings; old Browserslist data and Node deprecation warning remain. |
| Authorization log redaction | Inspect backend Jest output | **PASS after change** | Captured authorization fields show `[REDACTED]`. |
| Missing Pinata credentials | Isolated synthetic Node check | **PASS after change** | Upload rejects outside test mode; no external request made. |
| Missing production encryption key | Synthetic API test | **PASS after change** | Patient upload returns 503 before persistence. |
| CDSS failure on prescription upload | Synthetic API test | **PASS after change** | 503 and no MedicalRecord; IPFS write follows analysis. |
| Live backend/AI/frontend/Sepolia | Live probes | **NOT TESTED** | Earlier report claims are not current evidence. |
| UI patient/doctor/admin journeys | Manual browser acceptance | **NOT TESTED** | No dedicated account session or live external service was used. |
| Cross-system consent and revocation | UI -> API -> record download | **FAIL / BLOCKING** | Chain state is not the API's Mongo consent source of truth. |

---

## 3. Acceptance Workflow Summary

| Workflow | Preconditions / action | Expected outcome | Actual outcome / evidence | Status |
|---|---|---|---|---|
| Patient authentication/profile | Synthetic patient; local API suite | Authenticate and read/update own profile | Registration, login, profile, wallet-link API tests pass against memory DB; browser journey not run. | **PARTIAL** |
| Patient QR | Backend-issued patient ID; inspect component | QR contains only ID, not records/credentials | `QRHealthID.jsx` uses validated patient ID only; scan/export not manually tested. | **PARTIAL** |
| Patient access grant/revoke | Wallet on target chain; grant then revoke | API access reflects consent and revocation | Contract unit tests pass separately; API reads Mongo consent records. | **FAIL** |
| Patient document operations | Synthetic data; encryption/storage config | Upload, persist, retrieve and decrypt own record | AES roundtrip/tamper tests pass; external IPFS and patient download were not end-to-end tested. | **PARTIAL** |
| Doctor lookup | Synthetic patient/doctor | Identify patient without unauthorized clinical disclosure | API route returns allergies and chronic conditions without consent check. | **FAIL** |
| Doctor record access | Active consent | Retrieval allowed only while permission active | Consent helper tests and contract tests pass separately; downloader trusts Mongo and exempts original uploader from consent. | **FAIL** |
| Doctor prescription upload | Synthetic file/medications; available services | Analyze before persistence and report true chain/storage status | Mock AI failure returns 503 without DB record; live AI/IPFS/DB/chain flow not run. | **PARTIAL** |
| Admin functionality | Admin account and routes | Admin tasks authorized and operational | No administrator workflow tested. | **NOT TESTED** |

## 4. Preservation and Governance

- The candidate is the current local working tree based on commit `06eaec5`; it is not committed.
- Preserve the last committed version and all user work. No commit, tag, push, merge, deployment, production-data change, or secret change was performed.
- Use synthetic identities and medical files for any further testing.
- Do not call this candidate ready until API authorization has a single enforced source of truth, patient lookup is consent-gated, revocation invalidates API reads, and a full isolated grant/upload/revoke/download-denial workflow passes.
