# MediChain UI and Functionality Matrix

## Scope and evidence rules

This matrix reflects the current workspace implementation and the checks run for this change. “Route exists” or “source verified” does not mean a complete user journey was exercised. No production services, public blockchain transactions, real patient records, or live IPFS objects were used.

| Evidence label | Meaning |
|---|---|
| **Automated** | Covered by the local Jest or React smoke-test run described below. |
| **Source verified** | Route/component and relevant request/authorization behavior were inspected, but no end-to-end browser workflow was run. |
| **Not verified** | Requires browser, external service, staging, clinical, or manual acceptance evidence that is not available in this pass. |
| **Intentionally restricted** | The UI/API currently denies or omits the capability by design to protect patient data. |

## Route and capability matrix

| User surface | UI route(s) | Current behavior and access boundary | Evidence and remaining verification |
|---|---|---|---|
| Public landing and help | `/`, `/help` | Public product information and help pages. | **Source verified** through route registration; visual, content, and responsive review not performed. |
| Sign-in and registration | `/login`, `/register` | Public routes redirect authenticated users to their role dashboard. Authentication API is JWT-backed. | **Automated** backend registration/login tests; frontend test only checks app-title rendering. Full browser journey, email delivery, and OTP delivery are **not verified**. |
| Patient dashboard | `/patient-dashboard` | Patient-only route. Dashboard no longer presents MongoDB consent counts as active on-chain access or fabricated record totals. | **Source verified**; no signed-in browser journey. |
| Patient profile and wallet | `/profile` | Profile is role-protected. Wallet linking requests a short-lived server challenge, signs it, and links only the recovered wallet. Legacy/unverified wallets need re-verification. | **Automated** signed-link success, invalid signer, and replay regression tests; MetaMask UX and live chain/network behavior **not verified**. |
| Patient Health ID and scanner | `/qr-id`, `/scan`, `/scan-qr` | Patient can present an identifier; doctor/hospital can identify a patient through the QR/ID workflow. Patient-directory browsing is disabled. | **Source verified**. Camera permissions, QR export/decode, and full scan-to-authorized-record flow **not verified**. |
| Patient record list and upload | `/records`, `/upload-report`, `/upload-prescription` | Patient-owned record endpoints scope reads and writes to the authenticated patient. | Backend route tests cover selected behavior; successful real IPFS upload/retrieval and browser file workflow **not verified**. |
| Patient access management | `/access` | Grant/revoke UI remains on-chain controlled and requires the connected wallet to match the verified profile wallet. | **Source verified**; no transaction against the configured network or full revoke acceptance flow run. |
| Doctor dashboard | `/doctor-dashboard` | Doctor/hospital roles only. Lookup errors are not replaced by fabricated “verified patient” data. Lookup, medication, record, upload, and download routes require current patient access. | **Automated** denied lookup, denied upload, RPC-failure, and uploader-bypass regression tests. Successful lookup/upload/download with a real chain grant **not verified**. |
| Doctor patient directory | `/registry`, `/patients` | Browsable directory is intentionally disabled. The UI directs staff to patient-shared QR/ID identification; API returns `403`. | **Automated**/source verified denial; authorized QR/ID workflow **not verified**. |
| Hospital dashboard | `/hospital-dashboard` | Hospital-only route. Dashboard metrics now load from `/analytics/stats` and are scoped to records uploaded by the authenticated organization account. Patient names and record details are not listed in the dashboard. | Backend metrics endpoint covered by tests; no browser or live-data dashboard verification. |
| Medical record upload | `/upload-report`, `/upload-prescription` | Patient, doctor, and hospital role routes. Doctor upload requires current on-chain access; it no longer creates implicit consent. Required prescription analysis failure blocks upload. | **Automated** no-grant upload denial and AI-unavailable upload regression tests; real IPFS, encryption-key custody, and successful upload workflow **not verified**. |
| Prescription validation | `/prescription-validator` | Doctor/hospital-only validation UI; reports are scoped to their authenticated patient/doctor participants. | **Source verified**; live AI service and PDF/report workflow **not verified**. |
| Clinical decision support | `/ai-dashboard` | Authenticated roles can access the CDSS UI. AI output is advisory and does not establish clinical validity. Record-bound persistence checks patient access. | Record-bound AI update denial is **automated**. Live inference, model quality, OCR, and clinical safety are **not verified**. |
| Health risk and ensemble prediction | `/health-risk`, `/ensemble-predict` | Authenticated routes; patient-specific assessment/history/trend endpoints enforce current access when another patient is targeted. | **Automated** denied-access regression checks; authorized predictions and model performance **not verified**. |
| Adherence and digital twin | `/adherence-prediction`, `/digital-twin` | Patient-specific reads/writes require patient ownership or verified current on-chain access for doctor/hospital users. | **Automated** denied-access checks for history/profile endpoints; successful prediction/simulation journeys **not verified**. |
| Health timeline | `/health-timeline` | Timeline and stats endpoints require patient access for patient-specific data. | **Automated** denial regression checks; authorized timeline content and pagination **not verified**. |
| Analytics | `/analytics` | Displays persisted database counts and record activity only. It no longer reports invented blockchain, IPFS, node, AI accuracy, transaction, or disease-prevalence telemetry. External service health is explicitly “not checked.” | **Automated** API test for actual saved-record counts; visual chart interaction and production-data accuracy **not verified**. |
| Admin dashboard and user registry | `/admin-dashboard` | Admin-only UI. Platform metrics and user registry APIs require the `admin` role. Dashboard no longer substitutes demo users/growth or claims all dependencies are operational. | **Automated** non-admin denial and persisted metrics checks; admin browser workflow and live service health checks **not verified**. |
| Hospital recommendations | `/hospital-recommendation` | Authenticated recommendations and listings; admin-only management routes remain role-restricted. | Route presence/source checked; live recommendation data and admin CRUD flow **not verified**. |
| Enterprise dashboard, assistant, predictive analytics | `/enterprise-dashboard`, `/ai-assistant`, `/predictive-analytics` | Authenticated role routes are registered. | **Source verified** only; external integration, accuracy, and complete user workflow **not verified**. |
| Not found | `*` | Unknown paths render the not-found page. | Route registration source verified; browser interaction not separately tested. |

## Authorization and data-integrity invariants

- A patient may access their own patient-bound data.
- Doctor/hospital access to another patient's data requires both wallets to be server-verified and the current configured contract to report access.
- Missing access returns `403`; an unavailable chain check returns `503` rather than being treated as an allow or ordinary denial.
- Wallet addresses are not trusted from a client-supplied field alone. Linking requires a one-time signed challenge that expires after five minutes.
- Record upload does not create consent, and the original uploader is not exempt from current access checks for protected record retrieval.
- AI endpoints that persist analysis to a `recordId` now load the record's patient and enforce the same access check before analysis or persistence.
- Blockchain consent is broad access; the current contract does not expose distinct read, write, upload, or AI scopes.

## Automated evidence in this pass

- Backend: `Push-Location backend; npm test -- --runInBand` — **5 suites, 73 tests passed**.
- Frontend: `Push-Location frontend; $env:CI='true'; npm test -- --watchAll=false --runInBand` — **1 suite, 1 test passed**. The test verifies only that the app title renders.
- Frontend production build: `Push-Location frontend; npm run build` — **compiled successfully**. The build reports stale Browserslist data and a Node `fs.F_OK` deprecation warning.
- `node --check` passed for the modified backend route/test files. `git diff --check` passed after removing trailing whitespace.
- Browser-based visual checks, screen-reader/accessibility audit, mobile viewport checks, full end-to-end patient/doctor workflow, contract tests, public RPC checks, real IPFS persistence/retrieval, and deployed AI service checks were **not run**.
