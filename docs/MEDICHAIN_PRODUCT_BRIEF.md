# MediChain Product Brief

**Product:** MediChain
**Product version:** `1.0.0` (root `package.json`)
**Product category:** Patient-controlled health-information and clinical decision-support prototype
**Audience:** Academic project evaluators

## Purpose

MediChain is a web application prototype for managing medical documents, identifying patients with a QR health ID, recording access grants, and presenting advisory clinical decision support. It explores combining conventional API/database services with encrypted document storage, content identifiers, and Ethereum smart-contract records.

MediChain is not a replacement for a hospital information system or a validated clinical product. This assessment does not establish clinical effectiveness, regulatory compliance, or commercial readiness.

## Problem Addressed

Medical information is often divided among providers and systems. Patients may have difficulty carrying records between providers, understanding who can access them, and checking whether a document has changed. Medication safety checks may also be fragmented. MediChain explores patient-oriented identification and sharing, integrity references, and decision-support surfaces for these challenges.

## Intended Users

- **Patients:** Manage profile and record views, present an identifier-only QR code, and use the access-management interface.
- **Doctors:** Identify patients, upload records, and use advisory medication and clinical decision-support features.
- **Hospital and clinic roles:** Use the implemented institution-facing routes and dashboard surfaces; operational completeness was not established in this acceptance pass.
- **Administrators:** Use the implemented administration surfaces; an admin workflow was not exercised in this acceptance pass.

## Implemented Capabilities

- Role-based registration, login, JWT authentication, and patient profile endpoints.
- Patient-issued identifier format and QR display; QR payload is the validated patient identifier, not a medical record or credential.
- Patient and doctor record-list and document-operation routes.
- AES-256-GCM document encryption with per-document data keys wrapped by an environment-provided master key.
- Pinata/IPFS upload and gateway retrieval code, with a synthetic CID fallback restricted to tests by the current candidate changes.
- Solidity contract methods for patient registration, doctor access grants/revocation, record references, timed/emergency access, and prescription validation hashes.
- Python Flask AI/CDSS endpoints and frontend decision-support surfaces with explicit advisory/not-diagnosis language.
- Audit logging, health/readiness routes, and non-destructive synthetic-data tests.

The presence of an implementation is not evidence that a full user workflow or external service integration passed.

## Architecture Summary

- **Frontend:** React 18 single-page application built with Create React App, React Router, and ethers.js for wallet/contract interactions.
- **API:** Node.js and Express 5 service; MongoDB/Mongoose for account, consent, record metadata, and audit data.
- **AI service:** Python Flask microservice with rule-based and model-backed decision-support functionality.
- **Document storage:** Application-side encryption followed by Pinata/IPFS storage when configured.
- **Blockchain:** Solidity `MediChain` contract tested on local Hardhat; project documentation also describes Sepolia use, which was not probed in this release assessment.

## Security and Privacy Approach

The application uses authenticated routes, role middleware, bcrypt password hashing, JWTs, audit events, and authenticated AES-256-GCM encryption for documents when configured. The data-encryption key is wrapped with a server-held master key supplied through environment configuration; this is not client-side or zero-knowledge encryption, and no HSM/KMS custody or key-rotation evidence was verified.

The patient QR component encodes only the patient identifier. The contract can store CIDs, gateway URLs, record types, uploader addresses, and notes. The current doctor upload UI submits an empty note field to the contract, but CID and related metadata may still be publicly observable and correlatable. Encryption protects document contents only when the production key is configured and managed securely.

A material access-control defect remains: doctor patient lookup returns sensitive profile fields without checking consent; doctor upload can create an active Mongo consent record without patient action; and record downloads use Mongo consent plus an original-uploader exception rather than enforcing the UI's on-chain revocation. This candidate is therefore blocked for a patient/doctor access demonstration.

## AI and Blockchain Roles

AI outputs are presented in the interface as advisory decision support, not diagnoses, and require clinician review. The automated AI tests passed locally, but the clinical validity, model provenance, deployed-service behavior, and end-to-end upload integration were not independently established.

The contract provides local-testable access-control and record-reference operations. The API does not currently use the same source of truth as the on-chain grant/revoke interface. No live transaction or Sepolia status was verified during this assessment.

## Verified Results

Fresh local checks against the current working tree:

- Backend: 65 tests passed across 5 Jest suites, using synthetic fixtures and MongoDB Memory Server.
- Solidity: 46 Hardhat tests passed on the local EVM.
- AI: 3 pytest tests passed; model deserialization compatibility warnings were emitted.
- Frontend: 1 app-title smoke test passed.
- Frontend production build: compiled successfully without ESLint warnings; stale Browserslist data and a Node deprecation warning remain.
- New regression checks cover production email fallback, missing encryption configuration, CDSS-unavailable prescription upload, and no database record on that AI failure.
- A missing-Pinata-credentials check confirmed the current code rejects upload outside test mode. No external IPFS, live database, deployed AI, deployed frontend, or public-chain workflow was tested.

See [MEDICHAIN_RELEASE_CANDIDATE.md](MEDICHAIN_RELEASE_CANDIDATE.md) and [MEDICHAIN_RELEASE_READINESS_REPORT.md](MEDICHAIN_RELEASE_READINESS_REPORT.md) for commands, limitations, and decision rationale.

## Known Limitations

- API, Mongo, and smart-contract consent states are not integrated into one enforceable access-control decision.
- Patient and doctor UI workflows were not run with dedicated synthetic accounts in a browser.
- Real Pinata persistence, authorized retrieval/decryption, audit-event persistence, deployed AI execution, and live transaction confirmation were not tested end to end.
- The API-managed encryption master key remains a high-value secret; enterprise key custody and rotation are not implemented or verified.
- AI model artifacts were produced with versions different from the local test environment; pytest emitted compatibility warnings.
- Mobile layout and camera QR scanning were not verified in this pass.
- No HIPAA, GDPR, FDA, CE, or other certification or clinical validation is claimed.

## Potential Future Development

1. Establish one authoritative consent policy for lookup, upload, and retrieval; ensure revocation invalidates API access and remove automatic consent creation and uploader bypasses.
2. Add end-to-end tests covering grant, patient/doctor identity, encrypted storage, authorized retrieval, revocation, denial, database persistence, and audit events with isolated synthetic services.
3. Validate real Pinata, MongoDB, AI, and testnet integrations in a dedicated non-production environment with synthetic data.
4. Pin and reproduce model-training/runtime dependency versions; document model provenance and validation limits.
5. Add managed key custody/rotation and a broader secret/logging review before any real-world deployment consideration.
6. Expand accessible browser and mobile regression coverage for the patient, doctor, and admin journeys.
