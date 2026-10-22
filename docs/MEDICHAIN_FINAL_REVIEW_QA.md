# MediChain Final Review Q&A

Answers are bounded to the current source, test report, and product documentation. They describe a prototype, not a clinically validated or production healthcare system. The research paper mentioned in the Stage 7 request was not present among the tracked workspace files reviewed; no paper-specific method or result is attributed here.

## Architecture and Security

### Why use blockchain?

The prototype explores smart-contract consent state and record-reference transactions. Local Hardhat tests show contract methods in isolation. The current API does not consistently consult that chain state, so blockchain use does not currently guarantee application-level consent enforcement or revocation.

### Why store medical documents off-chain?

Large files are costly and unsuitable to store directly in EVM contract state. The design encrypts file bytes in the backend and stores those bytes through an IPFS integration when configured. Real IPFS persistence and retrieval were not verified in the current assessment.

### What role does IPFS play?

IPFS is the intended content-addressed store for encrypted document bytes; MongoDB stores account and record metadata. The current evidence does not prove a successful Pinata pin, gateway retrieval, or complete on-chain-to-file integrity check. A test-only synthetic CID is not evidence of an IPFS object.

### How is document integrity verified?

AES-GCM authenticates ciphertext during decryption using its authentication tag. Content addressing can also identify changed bytes, but the current assessment did not verify a persisted CID against a chain record during retrieval. Do not claim end-to-end blockchain integrity verification.

### What does AES-256-GCM provide?

It provides symmetric encryption and an authentication tag that detects ciphertext modification when decryption is attempted with the right key and metadata. The code generates a per-file data key and wraps it with a server-managed master key. This does not provide client-side/zero-knowledge encryption, safe key custody, key rotation, or protection if the server key is compromised. No KMS/HSM was verified.

### How does patient consent work?

There is a smart contract grant/revoke interface and a separate MongoDB consent model. They are not one consistently enforced authorization source: lookup returns sensitive profile fields without a consent check, upload can create active Mongo consent automatically, and download can authorize the original uploader without checking chain state. This is a critical blocker.

### What happens after consent is revoked?

The contract has a revoke method, but the current API download route checks MongoDB consent or an original-uploader exception, not the UI-managed chain revocation. Therefore, do not promise that a chain revoke immediately denies API retrieval. The application-level revocation path needs correction and end-to-end tests.

### Why is QR identification not authentication?

The QR payload contains only the patient identifier. An identifier tells the application which profile is being referenced; it does not prove who is presenting it, grant consent, authenticate a user, or authorize record access.

### Why is MetaMask separate from application login?

Application login authenticates an account to the API using its authentication flow. MetaMask manages an Ethereum wallet and signs blockchain transactions for that wallet. A wallet address alone does not establish the user's application role or patient identity, and an application login does not itself authorize a chain transaction.

### What is MongoDB used for?

MongoDB stores application accounts/profiles, record metadata and encryption metadata, consent records, and audit data. Its consent data is currently used by API authorization but is not synchronized with or overridden by the UI's on-chain revoke state. No deployed database workflow was verified in this assessment.

## AI and Data

### How does the AI service work?

The Flask service exposes a CDSS analysis route that can orchestrate medication-interaction checks, dosage checks, a safety score, and explanations; optional input may include a file for OCR. The interaction engine uses the RxNorm service with a curated local fallback. Local AI tests passed, but deployed-service integration and clinical validity were not established. Outputs are advisory only and require qualified clinician review.

### What is RxNorm used for?

The code calls the U.S. National Library of Medicine RxNorm REST service to resolve drug names/RxCUIs and support interaction analysis. It also has local aliases and curated fallback interaction pairs. This does not establish complete drug coverage or clinical correctness, and remote RxNorm availability was not tested in the release pass.

### What do the model metrics mean?

ROC-AUC measures how well a score ranks positive cases above negative cases across thresholds; it is not a calibration or clinical-benefit measure. Precision is the fraction of predicted positives that are positive; recall is the fraction of actual positives detected; F1 is their harmonic mean. Accuracy alone can mislead on imbalanced data. The checked-in manifest includes weak examples: the stroke model lists ROC-AUC 0.5346, recall 0, and F1 0. The values are artifact metadata, not independent clinical validation.

### What are the limitations of the datasets?

The training code contains synthetic-data generators, with labels derived from hand-written probability formulas. Existing product documents mention public benchmark data, but the reviewed workspace does not include a tracked research paper or verified dataset provenance sufficient to substantiate those broader claims. The model artifacts also have runtime-version compatibility warnings in the test report. No model should be presented as clinically validated.

## Interoperability and Deployment

### Is MediChain formally FHIR-compliant?

No. The regulatory assessment says the current record format is a proprietary MongoDB schema and FHIR mapping is not implemented. There is no evidence of formal conformance testing or certification.

### What are the current scalability limitations?

No current load-test result or production capacity measurement was established in this acceptance pass. The architecture depends on API/database availability, external storage/gateway behavior, AI service capacity, and wallet/RPC access. Transaction cost and latency, data growth, key operations, and multi-service failure handling need measured testing before making scale claims.

### What additional work is needed before clinical deployment?

At minimum: fix consent checks and revocation at the API boundary; remove automatic consent creation and uploader bypass; run synthetic end-to-end and security tests in isolated staging; verify real storage and retrieval; establish key management, audit and operational controls; validate AI models with appropriate clinical oversight; complete interoperability and regulatory assessment; and obtain independent security and clinical review. No certification, hospital deployment, or regulatory approval is claimed.

## Evidence and Release

### What has been tested?

The release report records 65 backend tests, 46 local Hardhat contract tests, 3 AI tests, 1 frontend title smoke test, and a successful frontend production build. These are local/component-level results. They do not establish a full browser workflow, live IPFS persistence, public testnet transaction, deployed AI operation, or safe consent enforcement.

### What is the current recommendation?

**NOT READY** for a patient/doctor record-sharing demo. Present only the bounded component, source, and recorded test evidence in the [final demo script](MEDICHAIN_FINAL_DEMO_SCRIPT.md). Keep the release candidate blocked until the consent defects are fixed and the full grant-to-revocation workflow passes isolated acceptance testing.

See the [Stage 7 readiness decision](MEDICHAIN_STAGE_7_DEMO_READINESS.md) and [recovery checklist](MEDICHAIN_DEMO_RECOVERY_CHECKLIST.md).