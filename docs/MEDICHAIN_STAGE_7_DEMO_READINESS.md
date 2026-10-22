# MediChain Stage 7 Demo Readiness

**Assessment date:** October 20, 2026  
**Product version:** `1.0.0`  
**Branch baseline:** `59712931fa4c49856902e07c85f6b6b7e7851b89` (`main`)  
**Status:** **NOT READY**

## 1. Current Release Status

MediChain is **not ready** for a live patient/doctor record-sharing demonstration. The critical blocker is application authorization: doctor lookup returns sensitive profile fields without consent; doctor upload can create active MongoDB consent without a patient grant; and download authorization follows MongoDB consent plus an original-uploader exception rather than the UI-managed on-chain revocation state.

The product may be presented as a prototype through a source, architecture, and local-test evidence walkthrough. This does not clear the release gate. No production deployment, production data, commit, or push is authorized by this assessment.

## 2. Demonstration Sequence

Use [MEDICHAIN_FINAL_DEMO_SCRIPT.md](MEDICHAIN_FINAL_DEMO_SCRIPT.md) for an 8-10 minute, evidence-only walkthrough:

1. Explain the product and state the NOT READY gate.
2. Show the application surface without signing in.
3. Explain the identifier-only QR payload from source.
4. Show encryption and storage architecture without claiming an upload succeeded.
5. Explain the consent defect from current API code; do not call patient lookup or record routes.
6. Explain AI/CDSS boundaries and actual metric limitations.
7. Present local test counts with their environment and scope.
8. Close with the remaining blockers and next acceptance gate.

## 3. Verified Workflows

| Area | Evidence | Current conclusion |
|---|---|---|
| Backend API and synthetic fixtures | 65 Jest tests; MongoDB Memory Server | Component/API tests pass; no browser login journey verified. |
| Smart contract | 46 Hardhat tests on local EVM | Contract methods pass in isolation; no public testnet transaction verified. |
| AI service | 3 pytest tests | Local tests pass; deployed service and clinical validity not established. |
| Frontend | 1 title-render smoke test and successful build | Compilation passes; user routes and mobile/browser behavior not verified. |
| QR payload | Source inspection of `QRHealthID.jsx` | The QR value is the validated patient ID only; rendered/exported/scanned workflow not manually tested. |
| Encryption | Unit tests for AES-GCM roundtrip and tamper rejection | Crypto component tested; no full upload/retrieve workflow or production key custody verification. |
| Patient/doctor consent | Current source inspection and regression evidence | **Fail:** lookup disclosure, implicit upload consent, and revoke mismatch remain. |

## 4. Evidence Available

- Recorded local results in [MEDICHAIN_RELEASE_READINESS_REPORT.md](MEDICHAIN_RELEASE_READINESS_REPORT.md): backend 65/65, contracts 46/46, AI 3/3, frontend smoke test 1/1, production frontend build compiled.
- Current implementation in `backend/routes/doctor.js`, `backend/models/ConsentRecord.js`, `frontend/src/components/AccessManager.jsx`, `frontend/src/components/QRHealthID.jsx`, and `backend/utils/encryption.js`.
- Model metadata in `ai/models_registry/version_manifest.json`. Some recorded metrics are poor; the stroke artifact lists AUC 0.5346 and zero recall/F1.
- Local test results are not proof of deployed-service behavior. The reviewed workspace contains no tracked research-paper file; paper-specific experimental claims were not independently checked.

## 5. Known Limitations

- Consent state is split between the contract/UI and MongoDB/API without verified authoritative enforcement.
- No full patient grant -> doctor lookup -> upload -> retrieval -> revoke -> denial acceptance run exists.
- Real Pinata/IPFS persistence and retrieval, deployed AI, public-chain submission/confirmation, database persistence, and audit-event persistence were not verified in this pass.
- Dedicated synthetic patient/doctor accounts and manual patient, doctor, or admin browser workflows were not verified.
- AI model artifacts have runtime-version compatibility warnings; no clinical validation is established.
- The application-managed encryption master key has no verified KMS/HSM or rotation workflow.
- FHIR mapping is not implemented; no formal certification, regulatory approval, or hospital deployment is claimed.

## 6. Potential Presentation Risks

- Historical demo and viva documents contain claims that conflict with current source. The Stage 7 script and Q&A supersede those claims; do not quote old transaction, authorization, IPFS, clinical-performance, test-count, or compliance statements.
- A successful local contract test can be mistaken for a live wallet transaction. State the environment each time.
- A synthetic CID or mocked/test fallback can be mistaken for a real IPFS object. Label it accurately or omit it.
- Model accuracy can hide poor recall. Do not present a single metric as proof of clinical performance.
- Patient lookup or download could expose sensitive data in a connected environment. Do not execute those steps.

## 7. Recovery Procedures

Use [MEDICHAIN_DEMO_RECOVERY_CHECKLIST.md](MEDICHAIN_DEMO_RECOVERY_CHECKLIST.md) for frontend/backend outage, login/OTP failure, AI/IPFS failure, wallet/network errors, pending/rejected transactions, and internet interruption. Default to skipping the step and continuing with non-sensitive source/test evidence. Never bypass security checks to recover the demo.

## 8. Remaining Blockers

1. Require valid patient authorization before any lookup returns sensitive fields.
2. Remove automatic consent creation during doctor upload.
3. Remove uploader-based authorization bypass where patient consent is required.
4. Make download authorization fail closed against the same authoritative grant/revoke state shown in the UI.
5. Add isolated tests for grant, lookup denial/allow, upload, retrieval, revoke, post-revoke denial, and audit persistence.
6. Verify the complete browser workflow with dedicated synthetic accounts in isolated staging, then rerun the required suites and integrations.

## 9. Recommended Final Action

Keep the candidate **NOT READY** for the patient/doctor workflow. Use the [final demo script](MEDICHAIN_FINAL_DEMO_SCRIPT.md) only for a bounded source-and-evidence walkthrough. Do not freeze, tag, push, or deploy this as a release based on the current evidence. Resolve the authorization blockers, validate the full synthetic workflow in isolated staging, and obtain a fresh readiness decision afterward.

Stage 7 documentation improves presentation clarity; it does not remediate application defects or change the release status.