# MediChain — Production Audit Report
**Audit Date:** 2026-08-20  
**Auditor Role:** Principal Software Architect / Staff Full-Stack Engineer  
**Audit Scope:** Complete repository inspection  
**Status:** PRODUCTION BLOCKED — Critical issues identified

---

## 1. SYSTEM OVERVIEW

MediChain is a patient-centric digital healthcare platform prototype built with:

| Layer | Technology |
|---|---|
| Frontend | React 18, Tailwind CSS, Ethers.js |
| Backend API | Node.js / Express 5, MongoDB/Mongoose |
| AI Service | Python Flask, scikit-learn, XGBoost, LightGBM, CatBoost, SHAP |
| Blockchain | Solidity 0.8.19, Hardhat, Ethers.js |
| Storage | Pinata IPFS |
| Cache | Redis |
| Containerization | Docker / Docker Compose |

---

## 2. REPOSITORY STRUCTURE

```
MediChain/
├── backend/           Node.js Express API (port 5000)
│   ├── config/        db.js, neo4j.js
│   ├── middleware/    auth.js, auditLog.js, security.js, validate.js
│   ├── models/        User, MedicalRecord, Hospital, AuditLog, ConsentRecord, etc.
│   ├── routes/        auth, patient, doctor, ai, hospitalRecommendation, timeline, etc.
│   ├── services/      hospitalRecommender.js, knowledgeGraph.js
│   ├── utils/         ipfs.js, cache.js, auditLogger.js
│   └── tests/         api.test.js, integration.test.js
├── frontend/          React SPA (port 3000)
│   └── src/
│       ├── pages/     28 pages (dashboards, CDSS, QR, etc.)
│       ├── components/ 18 components
│       ├── context/   AuthContext
│       └── utils/
├── ai/                Python Flask microservice (port 5001)
│   ├── cdss/          17 CDSS modules
│   ├── models/        ML model files
│   ├── models_registry/ versioned model registry
│   ├── routes/        Flask blueprints
│   ├── services/      business logic
│   └── config/        settings
├── blockchain/        Hardhat + MediChain.sol
│   └── contracts/     MediChain.sol (1 contract)
├── docs/              Existing docs (stub level)
└── docker-compose.yml
```

---

## 3. CURRENT FEATURES ASSESSMENT

### Working Features (Likely Functional)
- User registration with role-based fields (patient, doctor, hospital, admin)
- JWT authentication (access + refresh tokens)
- Password hashing (bcrypt, 12 rounds)
- Role-based route protection (protect + authorize middleware)
- MongoDB audit logging via AuditLog model
- Consent record model and ConsentRecord.hasActiveConsent static
- Medical record upload to IPFS via Pinata
- Smart contract: patient registration, record add, access grant/revoke, timed access, emergency access
- Hospital recommendation engine with weighted scoring
- Drug interaction checking via RxNorm API (free, no key needed)
- CDSS pipeline: 17 modules including OCR, SHAP, dosage checker
- QR Health ID generation
- Patient dashboard, Doctor dashboard, Hospital dashboard, Admin dashboard
- Rate limiting (general + auth-specific)
- Helmet security headers
- MongoDB sanitization
- Redis caching
- Docker Compose for local dev

### Partially Implemented Features
- Audit logging: middleware exists but naming inconsistency between utils/auditLogger.js and middleware/auditLog.js
- Consent enforcement: ConsentRecord model exists but doctor routes do not verify consent
- Hospital verification workflow: isVerified field exists on Hospital model but no admin verification route
- Doctor verification: licenseNumber field exists but no professional verification workflow
- Emergency access: Smart contract has it but frontend workflow is partial
- Email verification: not implemented (register returns token immediately)
- Password reset: not implemented
- Neo4j knowledge graph: config/neo4j.js exists but Neo4j not in docker-compose

### Broken / Missing Features
- CRITICAL BUG: routes/auth.js register handler has dead code after return (lines 127-133): auditLog call and second return res.json() are unreachable. Register response does NOT include refreshToken; audit event NOT fired.
- CRITICAL BUG: JWT_REFRESH_SECRET missing from .env - refresh tokens fall back to JWT_SECRET + '_refresh', making the secret predictable.
- CRITICAL: Real Pinata JWT and API keys are committed to backend/.env in the repository. This is a live credential exposure.
- Password reset flow: not implemented
- Email verification on registration: not implemented
- Account lockout after failed logins: not implemented
- Doctor consent verification before record access: not implemented in doctor.js routes
- Admin routes for user/doctor/hospital management: AdminDashboard.jsx exists but backend admin routes not found in server.js
- Neo4j is in services but not in docker-compose (fails silently at runtime)
- AI .env file is missing (only .env.example exists in ai/)
- backend/middleware/security.js exists but not imported in server.js
- xss-clean listed in package.json but not used in server.js
- Morgan logging only in development - no structured production logging
- No /ready endpoint (only /health)
- No request ID tracking
- MIME type validation in multer only checks file.mimetype (can be spoofed - no magic byte check)
- No file virus/malware scanning
- No encryption of IPFS files before upload (raw files uploaded)
- Hospital data: isVerified always false by default, no verified data source
- No pagination on GET /api/patient/records (can return unlimited records)
- Blockchain dependency: entire record write flow fails if MetaMask is unavailable

---

## 4. SECURITY VULNERABILITIES

### P0 - Critical (Production Blockers)

| ID | Vulnerability | Location |
|---|---|---|
| SEC-001 | Live secrets committed to git | backend/.env lines 13, 19, 22, 23 |
| SEC-002 | Predictable refresh token secret | routes/auth.js line 41 |
| SEC-003 | MIME type spoofing possible | routes/doctor.js line 39 |
| SEC-004 | No file encryption before IPFS upload | utils/ipfs.js |
| SEC-005 | Dead code in register route - audit not fired, refreshToken not returned | routes/auth.js lines 127-133 |
| SEC-006 | No consent verification in doctor routes | routes/doctor.js |

### P1 - Production Blockers

| ID | Vulnerability | Location |
|---|---|---|
| SEC-007 | No email verification on registration | routes/auth.js |
| SEC-008 | No account lockout on repeated failed logins | routes/auth.js |
| SEC-009 | No password reset mechanism | Not implemented |
| SEC-010 | security.js middleware not applied | server.js |
| SEC-011 | xss-clean dependency unused | server.js |
| SEC-012 | req.body logged in error handler - may leak credentials | server.js line 210 |
| SEC-013 | No server-side token blocklist for logout | routes/auth.js line 227 |
| SEC-014 | No request ID for tracing | server.js |

---

## 5. PRIVACY PROBLEMS

| ID | Issue | Severity |
|---|---|---|
| PRI-001 | Raw medical files stored on public IPFS without encryption | Critical |
| PRI-002 | userEmail stored in every AuditLog record | Medium |
| PRI-003 | req.body logged in error handler (may contain passwords) | High |
| PRI-004 | No data export mechanism for patients | Medium |
| PRI-005 | No account deletion workflow | Medium |
| PRI-006 | Hospital successRates fields could contain fabricated data | Medium |
| PRI-007 | No data flow map or privacy notice | Medium |
| PRI-008 | Pinata IPFS: CID is public - anyone knowing the CID can access the file | High |

---

## 6. PERFORMANCE BOTTLENECKS

| ID | Issue | Location |
|---|---|---|
| PERF-001 | No pagination on GET /api/patient/records | routes/patient.js line 22 |
| PERF-002 | Drug interaction API calls are sequential (0.5s sleep between each) | drug_checker.py line 139 |
| PERF-003 | AI inference timeout too short for complex CDSS (15s) | routes/ai.js line 30 |
| PERF-004 | No database connection pool configuration shown | config/db.js |
| PERF-005 | OCR pipeline runs synchronously in request thread | cdss/ocr_extractor.py |
| PERF-006 | getAllPatients() in smart contract loads entire patient array - gas unbounded | MediChain.sol line 126 |

---

## 7. RELIABILITY PROBLEMS

| ID | Issue |
|---|---|
| REL-001 | No graceful degradation when AI service is down |
| REL-002 | No graceful degradation when IPFS/Pinata is down |
| REL-003 | No graceful degradation when blockchain node is unreachable |
| REL-004 | Neo4j referenced in services but not in docker-compose - likely silent failures |
| REL-005 | No retry logic for Pinata uploads |
| REL-006 | No dead-letter handling for failed operations |
| REL-007 | Drug checker makes live external API calls per request - no fallback |

---

## 8. DEPLOYMENT PROBLEMS

| ID | Issue |
|---|---|
| DEP-001 | ai/.env file missing - AI service may fail to start |
| DEP-002 | docker-compose.yml has no health checks for backend or AI services |
| DEP-003 | No CI/CD pipeline |
| DEP-004 | No production environment configuration separate from development |
| DEP-005 | No database migration strategy |
| DEP-006 | No TLS/HTTPS configuration in docker-compose |
| DEP-007 | Frontend build args expose API URL at build time - not runtime configurable |
| DEP-008 | No secrets management beyond .env files |

---

## 9. AI LIMITATIONS

| ID | Issue |
|---|---|
| AI-001 | Training data source not documented |
| AI-002 | Model evaluation metrics not stored in registry format |
| AI-003 | No model drift monitoring |
| AI-004 | Drug checker makes live API calls - no offline fallback |
| AI-005 | CDSS outputs not always tagged with model version and confidence |
| AI-006 | No explicit disclaimer that AI outputs are decision-support only in all responses |
| AI-007 | Health assistant may generate responses resembling diagnoses |

---

## 10. BLOCKCHAIN LIMITATIONS

| ID | Issue |
|---|---|
| BC-001 | getAllPatients() returns unbounded array - could exceed gas limit |
| BC-002 | No upgradeable proxy pattern - contract cannot be updated after deployment |
| BC-003 | addPrescriptionValidation() has no caller authorization check |
| BC-004 | Emergency access grants 24h full access with no reason logging on-chain |
| BC-005 | Medical record CIDs stored on public testnet/mainnet |
| BC-006 | No gas estimation or error handling in frontend wallet calls |

---

## 11. TECHNICAL DEBT

| ID | Item |
|---|---|
| TD-001 | Both App.js and App.jsx exist in frontend/src/ - likely conflict |
| TD-002 | security.js middleware created but never imported |
| TD-003 | xss-clean dependency installed but never used |
| TD-004 | Dead code in routes/auth.js register handler (lines 127-133) |
| TD-005 | venvmvenv directory in frontend/ - accidental Python venv |
| TD-006 | Root-level node_modules and package.json with no clear purpose |
| TD-007 | morgan only logs in development - no structured production logging |
| TD-008 | console.error/log used throughout - no structured logger |
| TD-009 | AI .env.example exists but no .env created for AI service |

---

## 12. PRODUCTION BLOCKERS SUMMARY

The following issues MUST be resolved before production:

1. SEC-001: Live secrets in git repository - rotate ALL credentials immediately
2. SEC-005: Dead code bug in register route - fix immediately
3. SEC-002: Predictable refresh token secret - add JWT_REFRESH_SECRET to env
4. SEC-004: No IPFS file encryption - implement before storing real patient data
5. SEC-006: No consent verification in doctor routes - implement immediately
6. SEC-003: MIME type spoofing possible - add magic byte validation
7. DEP-001: AI .env missing - service will fail to start
8. BC-003: Prescription validation has no authorization - any caller can add
9. PERF-001: No pagination on records - DoS risk
10. SEC-007: No email verification - accounts not validated

---

*This audit was produced by systematic inspection of the MediChain repository on 2026-08-20. All findings are based on actual code review.*
