# MediChain Final Demo Script

**Target duration:** 8-10 minutes  
**Current gate:** **NOT READY** for a live patient/doctor record-sharing demonstration  
**Audience:** Academic project evaluators  
**Evidence date:** October 20, 2026

## Before the Demo

Use this as an evidence-led product and engineering walkthrough, not as a successful end-to-end clinical workflow. The current API can disclose patient profile fields without consent, can create active MongoDB consent during doctor upload, and does not make downloads follow on-chain revocation. Do not sign in as a doctor, look up a patient, upload a record, download a record, or demonstrate revocation against any live or shared environment.

Use only an isolated local environment with synthetic data and separately provisioned test accounts. Account availability and manual browser workflows have not been verified. Do not use old credentials or Hardhat keys on any public network. Do not show secrets, real patient information, or production dashboards. Stage 7 documentation does not change the release gate.

## Timed Walkthrough

### 1. Product and honest status (0:00-0:50)

- **Say:** "MediChain is a healthcare-record prototype exploring patient identification, encrypted document storage, consent interfaces, and advisory medication-safety support. Today I will separate implemented components from workflows that have not passed end-to-end verification."
- **Open:** This script and [the readiness report](MEDICHAIN_RELEASE_READINESS_REPORT.md).
- **Do:** State that the release gate is blocked for patient/doctor record sharing. Set expectations before showing any interface.
- **Expected result:** Evaluators know that this is a prototype review, not a claim of clinical or production readiness.
- **Technical concept:** Product scope and evidence boundaries.
- **Evidence:** Current release report and fresh local test summary documented there.
- **If this step fails:** Do not soften or omit the blocked status; continue with the component-level walkthrough only.

### 2. Product surface and roles (0:50-1:45)

- **Say:** "The application has patient, doctor, hospital, and administrator surfaces. Authentication is application-level; an interface being present does not prove its complete workflow passed."
- **Open:** The local login page only if an isolated instance is already available; otherwise open `frontend/src/App.jsx` and [the product brief](MEDICHAIN_PRODUCT_BRIEF.md).
- **Do:** Show the login shell without entering credentials. Point out the implemented roles in the route configuration. Do not navigate into a patient or doctor account.
- **Expected result:** The audience sees the intended application boundary without exposing patient data or implying a verified journey.
- **Technical concept:** React single-page application, role-based routes, and separation from API authentication.
- **Evidence:** Route configuration and product brief. Manual login and role workflows are not verified.
- **If this step fails:** Use the source and product brief; state that the browser workflow was not verified.

### 3. QR Health ID design (1:45-2:40)

- **Say:** "The QR is an identifier, not a credential. The component puts only the database-assigned patient ID in the QR payload; possession of that ID must not grant record access."
- **Open:** `frontend/src/components/QRHealthID.jsx`.
- **Do:** Show the `qrPayload` assignment and validation. Only show a rendered QR if a previously verified synthetic patient session is available in an isolated environment; do not attempt a lookup with it.
- **Expected result:** The source shows an identifier-only payload, or the segment remains a source walkthrough.
- **Technical concept:** Identification versus authentication and authorization.
- **Evidence:** Source inspection recorded in the release report. Manual rendering, export, and camera scanning were not tested.
- **If this step fails:** Stay with source evidence and make no claim about live scanning or exported-card behavior.

### 4. Data and encryption architecture (2:40-3:55)

- **Say:** "The design keeps large files off-chain. The backend has AES-256-GCM envelope-encryption code; MongoDB holds application metadata and wrapped-key fields; the IPFS path is intended for encrypted bytes; the contract can record consent and references. These pieces are not yet verified as one working flow."
- **Open:** `backend/utils/encryption.js`, then [the technical explanation](MEDICHAIN_TECHNICAL_EXPLANATION.md).
- **Do:** Point to the generated per-file data key, GCM authentication tag, and master-key wrapping. Explain that the API manages the master key and no KMS/HSM or key-rotation workflow was verified.
- **Expected result:** The code demonstrates the implemented encryption primitive without implying a successful IPFS upload or retrieval.
- **Technical concept:** Envelope encryption and off-chain/on-chain separation.
- **Evidence:** Encryption unit tests pass; real IPFS persistence/retrieval and a full cross-system integrity check were not tested.
- **If this step fails:** Skip code navigation and describe the evidence boundary using the report. Never upload a real document to make the demo look complete.

### 5. Consent and the release blocker (3:55-5:25)

- **Say:** "This is the main unresolved issue. The contract has grant/revoke methods, but the API does not consistently enforce that state. A doctor lookup can return allergies and chronic conditions without checking consent, upload can create Mongo consent automatically, and download relies on Mongo consent plus an uploader exception."
- **Open:** `backend/routes/doctor.js` and [the release readiness report](MEDICHAIN_RELEASE_READINESS_REPORT.md).
- **Do:** Show the lookup/resolve response fields, automatic `ConsentRecord.create` block, and download authorization branch. Do not call these routes with patient identifiers.
- **Expected result:** The evaluator sees why the full consent-controlled workflow is blocked, rather than being shown a misleading success path.
- **Technical concept:** Server-side authorization, consent source of truth, and revocation semantics.
- **Evidence:** Current route source and the release report's security gate.
- **If this step fails:** Read the report's three critical findings. Do not try a live patient lookup as a substitute.

### 6. AI-assisted decision support (5:25-6:35)

- **Say:** "The AI service exposes an analysis pipeline for interactions, dosage checks, a score, and explanations. It is advisory prototype software, not a diagnosis or treatment recommendation."
- **Open:** `ai/routes/cdss_routes.py`, `ai/cdss/interaction_engine.py`, and `ai/models_registry/version_manifest.json`.
- **Do:** Explain that the interaction path uses RxNorm with a local curated fallback. Point to the recorded model metrics and note that some entries are weak; for example the stroke artifact has ROC-AUC 0.5346 and zero recall/F1 in the manifest. Do not invent a particular live output.
- **Expected result:** The audience sees the software boundary and why reported model metrics do not establish clinical utility.
- **Technical concept:** Rule/API-assisted checks versus predictive models, and limitations of retrospective metrics.
- **Evidence:** Three local AI tests passed; deployed AI behavior and clinical validity were not verified. Training source includes synthetic-data generators.
- **If this step fails:** Use the manifest and source only. Do not enter real or sensitive health data.

### 7. Local test evidence and blockchain boundary (6:35-8:10)

- **Say:** "The tests establish component behavior in local test environments, not a deployed, integrated patient workflow."
- **Open:** [the release readiness report](MEDICHAIN_RELEASE_READINESS_REPORT.md), especially its test and integration tables.
- **Do:** Summarize the recorded results: backend 65 tests, local Hardhat 46 tests, AI 3 tests, frontend 1 smoke test, and a successful production frontend build. Clarify that the contract tests ran on a local EVM and no public testnet transaction was verified.
- **Expected result:** Test counts are presented with their environment and limitations, not as an end-to-end pass.
- **Technical concept:** Unit/integration test scope and blockchain transaction lifecycle.
- **Evidence:** Stage 6 local command results captured in the report; no live transaction or audit persistence was established.
- **If this step fails:** Use the written report as evidence; do not rerun commands against a live deployment or imply that local tests are live transactions.

### 8. Close and next gate (8:10-9:00)

- **Say:** "The prototype demonstrates several technical components, but the patient/doctor sharing workflow is not ready to demonstrate as secure. The next gate is to fix authorization and revocation, then verify the complete workflow with synthetic accounts in isolated staging."
- **Open:** [the Stage 7 readiness decision](MEDICHAIN_STAGE_7_DEMO_READINESS.md).
- **Do:** State the recommendation: keep the candidate blocked; do not tag, push, or deploy it as a release based on this demo.
- **Expected result:** Evaluators leave with an accurate understanding of the product, evidence, limitations, and required work.
- **Technical concept:** Release gating and evidence-based acceptance.
- **Evidence:** Readiness report and Stage 7 readiness record.
- **If this step fails:** Return to the three critical consent findings and keep the decision **NOT READY**.

## Claims Not to Make

- Do not claim a successful patient grant -> doctor lookup -> upload -> retrieval -> revoke -> denial workflow.
- Do not claim real IPFS persistence, retrieval-time CID verification against a chain record, live Sepolia confirmation, or persisted access-audit evidence.
- Do not describe the API as following on-chain revocation; current authorization code does not.
- Do not describe QR as login, consent, or access authorization.
- Do not claim that AI is clinically validated, that a displayed score is a diagnosis, or that model metrics demonstrate safe clinical performance.
- Do not claim formal FHIR compatibility, HIPAA/GDPR certification, hospital deployment, or regulatory approval.
- Do not display test credentials, keys, tokens, real patient data, or a synthetic IPFS CID as a live persisted file.

## Related Guides

- [Demo recovery checklist](MEDICHAIN_DEMO_RECOVERY_CHECKLIST.md)
- [Evaluator Q&A](MEDICHAIN_FINAL_REVIEW_QA.md)
- [Stage 7 readiness decision](MEDICHAIN_STAGE_7_DEMO_READINESS.md)