# MediChain — System Architecture
**Version:** 2.0  
**Date:** 2026-08-20

---

## 1. OVERVIEW

MediChain uses a microservices architecture with four primary services:

```
                        ┌─────────────────────────────────────────────┐
                        │              USERS                          │
                        │   Patient │ Doctor │ Hospital │ Admin       │
                        └────────────────────┬────────────────────────┘
                                             │ HTTPS
                                             ▼
                        ┌─────────────────────────────────────────────┐
                        │            REACT FRONTEND (Port 80)         │
                        │   Tailwind CSS │ Ethers.js │ React Router   │
                        └────────────────────┬────────────────────────┘
                                             │ REST API
                                             ▼
                        ┌─────────────────────────────────────────────┐
                        │         NODE.JS BACKEND (Port 5000)         │
                        │   Express 5 │ JWT Auth │ Mongoose │ Multer  │
                        └─────────┬──────────────────┬────────────────┘
                                  │                  │
               ┌──────────────────┘                  └──────────────────┐
               ▼                                                        ▼
┌──────────────────────────┐                        ┌───────────────────────────────┐
│  PYTHON AI SERVICE       │                        │   MONGODB (Port 27017)        │
│  Port 5001               │                        │   User │ MedicalRecord        │
│  Flask │ scikit-learn    │                        │   Hospital │ AuditLog         │
│  XGBoost │ SHAP │ OCR    │                        │   ConsentRecord               │
└──────────────────────────┘                        └───────────────────────────────┘
                                                             │
                                              ┌──────────────┘
                                              ▼
                                 ┌──────────────────────────┐
                                 │   REDIS (Port 6379)      │
                                 │   Session Cache │ Rate    │
                                 │   Limiting │ Temp Data   │
                                 └──────────────────────────┘

EXTERNAL SERVICES:
  Pinata IPFS → Medical file storage (encrypted files)
  Ethereum/Hardhat → Smart contract (MediChain.sol)
  RxNorm API (NLM) → Drug interaction data (free, no key)
```

---

## 2. BACKEND API SERVICE

**Technology:** Node.js, Express 5, Mongoose  
**Port:** 5000  
**Authentication:** JWT Bearer tokens

### Route Structure
```
/api/auth/            Registration, login, refresh, wallet linking
/api/patient/         Patient records, profile, consent
/api/doctor/          Record upload, patient lookup
/api/ai/              AI proxy routes → Python service
/api/prescription/    Prescription validation pipeline
/api/health-risk/     Health risk scoring
/api/ensemble-predict/ Multi-model ensemble prediction
/api/adherence-sys/   Medication adherence
/api/digital-twin/    Patient digital twin
/api/analytics/       Platform analytics
/api/knowledge-graph/ Medical knowledge graph
/api/hospital-recommendation/ Hospital and specialist recommendation
/api/timeline/        Medical timeline

/health               Health check
/ready                Readiness check (includes DB connectivity)
```

### Middleware Stack (ordered)
1. Helmet (security headers)
2. Morgan (HTTP logging — dev only)
3. CORS (configured origins)
4. Body parser (JSON, 10KB limit)
5. URL-encoded body parser
6. NoSQL injection sanitization
7. HTTP Parameter Pollution protection
8. Request ID middleware
9. Rate limiters (general + auth-specific)
10. Routes
11. Audit log middleware
12. 404 handler
13. Global error handler

---

## 3. AI MICROSERVICE

**Technology:** Python 3.x, Flask 3.1, Gunicorn  
**Port:** 5001  
**Framework:** Application factory pattern (create_app)

### CDSS Modules
```
cdss/
├── clinical_intelligence_engine.py  Core CDSS pipeline
├── disease_predictor.py             XGBoost disease risk prediction
├── dosage_checker.py                Dosage safety analysis
├── ensemble_predictor.py            Multi-model ensemble (XGB+LGB+CatBoost)
├── explainer.py                     SHAP feature importance
├── health_assistant.py              AI health assistant
├── interaction_engine.py            Drug-drug interaction matrix
├── ocr_extractor.py                 Prescription OCR
├── prescription_scorer.py           Safety scoring (0-100)
├── prescription_validator.py        Full validation pipeline
├── risk_scorer.py                   5-organ risk scoring
├── adherence_predictor.py           Medication adherence prediction
└── digital_twin_engine.py           Patient digital twin
```

### Model Registry
- Versioned model loading at startup
- Model metadata (version, features, training date)
- Loaded models served in-memory

---

## 4. BLOCKCHAIN LAYER

**Technology:** Solidity 0.8.19, Hardhat, Ethers.js  
**Networks:** Hardhat local (31337), Sepolia testnet (11155111)

### Smart Contract: MediChain.sol v2.0
- Patient registration and registry
- Medical record anchoring (IPFS CID on-chain)
- Doctor access control (permanent + time-limited)
- Emergency access (24h via registered emergency contact)
- Prescription validation hash anchoring

### Frontend Integration
- Ethers.js for wallet connection (MetaMask)
- Contract ABI from deployedContract.json
- Transactions require MetaMask signature

---

## 5. STORAGE ARCHITECTURE

### MongoDB (Primary Database)
- **User** — accounts, profiles, roles
- **MedicalRecord** — IPFS CID references + metadata + AI analysis
- **Hospital** — hospital profiles and capabilities
- **AuditLog** — immutable API access log (TTL: 365 days)
- **ConsentRecord** — patient-to-doctor access consents
- **Additional:** HealthRiskReport, PrescriptionReport, AdherenceLog, etc.

### IPFS (File Storage)
- Medical documents stored on Pinata-managed IPFS nodes
- CID = SHA-256 hash of file content (tamper-proof)
- CID stored both in MongoDB and on blockchain
- **REQUIRED:** Files must be AES-256-GCM encrypted before upload

### Redis (Cache)
- Rate limiting counters
- Session data
- Temporary computation results

---

## 6. DATA FLOW: MEDICAL RECORD UPLOAD

```
Doctor fills form → Frontend validates
  → POST /api/doctor/upload-record (multipart)
  → ConsentRecord check (patient must have active consent for doctor)
  → Multer: validate MIME type + size
  → uploadToIPFS(fileBuffer) → Pinata → CID returned
  → AI CDSS analysis (if prescription + medications provided)
  → If CRITICAL/HIGH severity → 422 BLOCKED
  → MongoDB: MedicalRecord created (CID + URL + AI analysis)
  → Response to frontend
  → Frontend: MetaMask prompt → addMedicalRecord(CID) on-chain
  → PATCH /api/doctor/record/:id/txhash → TX hash stored in MongoDB
```

---

## 7. AUTHENTICATION FLOW

```
Registration:
  POST /api/auth/register → Validate → bcrypt hash password
    → MongoDB User.create() → Return JWT + refreshToken

Login:
  POST /api/auth/login → Find user → comparePassword (bcrypt)
    → Return JWT (24h) + refreshToken (30d)

Protected Request:
  Bearer token in Authorization header
  → protect middleware → jwt.verify() → User.findById()
  → attach req.user → next()

Token Refresh:
  POST /api/auth/refresh (refreshToken) → jwt.verify(refreshSecret)
    → return new access token
```

---

## 8. ENVIRONMENT CONFIGURATION

| Variable | Service | Purpose |
|---|---|---|
| PORT | Backend | API server port |
| NODE_ENV | Backend | Environment mode |
| MONGO_URI | Backend | MongoDB connection string |
| JWT_SECRET | Backend | Access token signing (64-char hex) |
| JWT_REFRESH_SECRET | Backend | Refresh token signing (different 64-char hex) |
| PINATA_JWT | Backend | Pinata IPFS API authentication |
| PINATA_GATEWAY | Backend | IPFS gateway hostname |
| AI_SERVICE_URL | Backend | AI microservice URL |
| REDIS_URL | Backend | Redis connection string |
| CORS_ORIGIN | Backend | Allowed frontend origin |
| ENV | AI | Flask environment |
| PORT | AI | AI service port |
| SECRET_KEY | AI | Flask secret key |

---

## 9. DEPLOYMENT ARCHITECTURE (TARGET)

```
Internet
  → Cloudflare (CDN + DDoS protection)
  → Load Balancer (TLS termination)
  → Docker Swarm / Kubernetes
      ├── Frontend container (Nginx, static React build)
      ├── Backend containers (Node.js, multiple replicas)
      ├── AI container (Gunicorn, resource-limited)
      ├── MongoDB (managed Atlas or replica set)
      ├── Redis (managed ElastiCache or Redis Cloud)
      └── Monitoring (Prometheus + Grafana)

External:
  ├── Pinata IPFS (dedicated gateway)
  ├── Ethereum node (Infura/Alchemy for mainnet)
  └── Email service (SES/SendGrid for notifications)

Secrets:
  └── AWS Secrets Manager / HashiCorp Vault
```

---

## 10. SCALABILITY DESIGN

| Component | Scaling Strategy |
|---|---|
| Backend | Horizontal (stateless JWT, multiple replicas) |
| AI Service | Vertical (CPU/memory for ML inference) + queue-based |
| MongoDB | Replica set + Atlas auto-scaling |
| Redis | Redis Cluster |
| Frontend | CDN-distributed static assets |
| IPFS | Pinata manages distribution |
