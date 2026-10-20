# MediChain Release Readiness Report

**Assessment date:** October 20, 2026
**Product version:** `1.0.0` (root `package.json`)
**Branch:** `main`
**Base commit:** `06eaec5543abe6d6b875cdd7a5bd4852942fd0ed`
**Candidate state:** Local working-tree modifications, not committed
**Final status:** **BLOCKED**

## Decision

**BLOCKED for final patient/doctor workflow demonstration.** Fresh automated suites and a production frontend build pass, but a critical authorization gap means doctor lookup and record access do not consistently follow patient consent or on-chain revocation. The current evidence supports component-level software demonstrations only; it does not support claiming that the full consent-controlled medical-record workflow passed.

This is separate from clinical or commercial readiness. MediChain has no demonstrated clinical validation, regulatory certification, enterprise key custody, or production healthcare readiness.

## Release Candidate

The candidate is based on the Stage 5 commit above. At the start of this assessment, `main` was clean and matched `origin/main`. Source edits and the modified checklist are uncommitted; the product brief and readiness report are new untracked files. They are preserved locally; no commit, tag, push, merge, deployment, production setting change, or production-data operation was performed.

Changed source files:

- `backend/server.js`
- `backend/services/emailService.js`
- `backend/routes/doctor.js`
- `backend/routes/patient.js`
- `backend/utils/ipfs.js`
- `backend/tests/api.test.js`
- `frontend/src/components/Navbar.jsx`
- `frontend/src/pages/DoctorDashboard.jsx`

Changes address request-log credential redaction, production email fallback, production encryption configuration, AI-unavailable prescription handling, test-only synthetic CIDs, doctor upload status accuracy, clinical notes sent to a public contract, and build hygiene. The regression tests cover the new backend failure guards. `06eaec5` is the latest committed baseline, not a fully verified release: the Stage 5 report only records a frontend smoke test, and its backend, contract, and AI suites were not rerun then. The current candidate changes still need normal review and commit discipline.

## Verified Functional Workflows

| Workflow | Evidence | Result |
|---|---|---|
| Patient registration/login/profile API | Backend Jest tests with MongoDB Memory Server and synthetic users | **PARTIAL**: API behavior passes; browser authentication/profile journey not run. |
| Patient QR identifier | Source inspection of `QRHealthID.jsx` | **PARTIAL**: QR value is set to validated patient ID only; export and camera scanning not manually tested. |
| Patient grant/revoke | 46 local Hardhat tests | **PARTIAL**: Contract methods pass in isolation; API access does not follow this chain state. |
| Encryption/decryption and tamper detection | Backend unit tests | **PARTIAL**: AES-GCM roundtrip and tamper rejection pass; production key custody and actual IPFS retrieval not tested. |
| Doctor identification | Backend API test and route inspection | **FAIL**: Lookup returns patient name, blood group, allergies, chronic conditions, and record count without a consent check. |
| Doctor record retrieval | Consent helper tests and source inspection | **FAIL**: Download checks Mongo consent or original uploader; it does not check the UI-managed chain state, so revocation is not reliably enforced. |
| Doctor prescription upload | New synthetic API failure test | **PARTIAL**: Required AI failure returns 503 before external storage and Mongo persistence; successful cross-system upload not tested. |
| Admin functions | No workflow run | **NOT TESTED** |

## Automated Test Results

Commands were run locally against the candidate source. No test used real patient information or production records.

| Command | Result | Notes |
|---|---|---|
| `Push-Location backend; npm test -- --runInBand` | **65 passed / 5 suites** | MongoDB Memory Server and synthetic records. The API test mocks AI failure; it does not verify live services. |
| `Push-Location blockchain; npx hardhat test` | **46 passed** | Local Hardhat EVM. No Sepolia write or RPC health check. |
| `Push-Location ai; python -m pytest tests` | **3 passed** | Pytest emitted XGBoost and scikit-learn version compatibility warnings for model artifacts. |
| `Push-Location frontend; $env:CI='true'; npm test -- --watchAll=false --runInBand` | **1 passed** | App-title render smoke test only; React Router future-flag warnings. |
| `Push-Location frontend; npm run build` | **Compiled successfully** | No ESLint warnings after removing an unused import. Old Browserslist data and Node `fs.F_OK` deprecation warning remain. |

A test-only synthetic CID path is exercised by unit tests and must not be presented as actual IPFS persistence. An isolated no-credentials check confirmed the candidate rejects IPFS upload outside test mode.

## Build Status

The frontend production bundle builds successfully. This is not a deployment. No live routes, mobile layout, browser console behavior, or deployed frontend bundle were checked.

## Integration Verification

| Integration | Result | Evidence boundary |
|---|---|---|
| Database persistence | **PARTIAL** | Mongoose operations pass against in-memory MongoDB; no deployed database operation. |
| Encryption and authorized retrieval | **PARTIAL** | Crypto roundtrip/tamper tests pass; no upload-from-UI to retrieve/decrypt workflow. |
| IPFS CID persistence/retrieval | **NOT TESTED** | Tests use synthetic fallback; no Pinata pin or real gateway fetch was made. |
| Blockchain submission/confirmation | **NOT TESTED** | Local contract unit tests only; no wallet transaction or public testnet call. |
| Record integrity across systems | **PARTIAL** | Contract and content-address unit tests pass independently; no persisted record cross-check. |
| Permission grant/revoke | **FAIL** | UI updates chain; API read authorization uses Mongo consent. No verified synchronization. |
| AI execution and failure handling | **PARTIAL** | Three local AI tests pass; mocked API failure path passes; deployed service integration not tested. |
| Audit-event creation | **NOT TESTED** | Audit code exists, but no acceptance test established persisted events for record access/denial. |
| External-service failure behavior | **PARTIAL** | Synthetic missing-key, missing-Pinata, and mocked-AI paths were tested; no real external outage was induced. |

## Security Gate

| Control | Finding | Status |
|---|---|---|
| Protected records are server-authorized | Doctor lookup discloses sensitive profile fields before checking consent. Download authorization is separate from chain state. | **FAIL — CRITICAL** |
| Consent revocation | On-chain revoke does not invalidate Mongo consent; original uploader is exempted from the consent check on download. | **FAIL — CRITICAL** |
| No implicit patient permission | Doctor upload route automatically creates an active Mongo consent if none exists. | **FAIL — CRITICAL** |
| QR content | Component uses only the validated patient identifier as its QR payload. Source checked; no live QR decode performed. | **PARTIAL / SOURCE VERIFIED** |
| Secret and credential logging | Pino authorization header redaction verified in test output. Production email fallback now fails closed; a synthetic test verifies no OTP is logged. A comprehensive repository/deployment secret scan was not performed. | **PARTIAL** |
| Medical-document confidentiality | AES-256-GCM encryption code and roundtrip tests exist. Production upload now fails closed without a configured key. Key is API-managed; no KMS/HSM, rotation, or live configuration verified. | **PARTIAL** |
| Public-chain metadata | Contract record struct includes CID, gateway URL, type, uploader, and notes. Current doctor UI sends an empty notes string; other metadata remains public/correlatable. | **PARTIAL / PRIVACY RISK** |
| AI presentation | Frontend includes advisory/non-diagnosis and clinician-review language. Clinical validity is not established. | **PARTIAL** |
| Blockchain status accuracy | UI now distinguishes unconfirmed transactions from confirmed transactions whose API sync failed. No live confirmation was observed. | **PARTIAL** |
| Sensitive logging | Authorization values are redacted. Audit data intentionally includes account email/IP and request context; no full deployed log-retention or PHI log audit was conducted. | **PARTIAL** |

## Known Limitations and Defects

### CRITICAL

- Doctor patient lookup returns allergies and chronic conditions without consent authorization.
- Upload can create an active Mongo consent without a patient grant.
- Download authorization trusts Mongo consent and an original-uploader exception rather than the on-chain grant/revoke state; revocation may therefore fail to prevent access.

### HIGH

- No current end-to-end acceptance evidence exists for patient grant -> doctor lookup -> encrypted upload -> authorized retrieval -> revoke -> denial.
- Real IPFS persistence, deployed AI execution, public-chain submission, database persistence, and audit-event persistence were not tested in this pass.
- Contract record references and associated metadata are public; encryption protects content only when configured and key custody remains server-side.
- No manual patient, doctor, or admin UI workflow or mobile/camera regression was run.

### MEDIUM

- AI model artifacts were serialized with versions that differ from the local runtime; test warnings indicate potential compatibility risk.
- Frontend automated coverage is only one smoke test; no route/form/permission-focused browser tests were run.
- Deployment secrets and the configured production encryption key were not independently audited.

### LOW

- Frontend build output reports stale Browserslist data and a Node `fs.F_OK` deprecation warning.
- Frontend smoke test reports React Router v7 future-flag warnings.

## Evidence Available

- Prior Stage 5 report and product docs describe completed UX work; those documents are historical context, not proof of current end-to-end behavior.
- Fresh test output from the commands above.
- Source implementation at `backend/routes/doctor.js`, `backend/models/ConsentRecord.js`, `frontend/src/components/AccessManager.jsx`, and `frontend/src/components/QRHealthID.jsx`.
- Candidate changes and added synthetic tests in the working tree.

## Changes Since Last Verified Version

Stage 5 documentation says only the frontend smoke test was rerun during productization; backend, contract, and AI suites were not rerun in that pass. The current assessment reran all four suites and the production build, then made and tested local changes. No later commit exists. The current working tree must be treated as a new, uncommitted candidate, not as a previously verified release.

## Recommended Next Action

Keep the candidate blocked. First remove implicit consent creation and uploader-based bypasses, require authorization before sensitive patient lookup, and make API record access consult the same authoritative consent state as grant/revoke (or implement a verified, fail-closed synchronization mechanism). Add isolated end-to-end tests for grant, lookup, upload, retrieval, revoke, denial, and audit persistence. Then rerun all suites and build and perform manual acceptance with dedicated synthetic accounts against an isolated staging environment. Do not freeze, tag, push, or deploy until those checks pass.

No production deployment or production data was changed during this assessment.
