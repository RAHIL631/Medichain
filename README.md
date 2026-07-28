# 🏥 MediChain
### Blockchain-Based Electronic Health Record System with AI-Assisted Medical Insights

[![Solidity](https://img.shields.io/badge/Solidity-0.8.19-363636?logo=solidity)](https://soliditylang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-Express%205-339933?logo=node.js)](https://expressjs.com/)
[![Python](https://img.shields.io/badge/Python-Flask-3776AB?logo=python)](https://flask.palletsprojects.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb)](https://www.mongodb.com/atlas)
[![IPFS](https://img.shields.io/badge/IPFS-Pinata-65C2CB?logo=ipfs)](https://www.pinata.cloud/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> **VTU Final Year Project | IEEE Publication Ready | Hackathon-Grade Architecture**

MediChain is a production-quality decentralised EHR platform where patients own their medical records on Ethereum, doctors get patient-controlled access, and an AI ensemble (XGBoost + LightGBM + CatBoost) provides clinical decision support.

---

## 📚 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Tech Stack](#tech-stack)
3. [Key Features](#key-features)
4. [Prerequisites](#prerequisites)
5. [Installation & Setup](#installation--setup)
6. [Environment Variables](#environment-variables)
7. [Running the Project](#running-the-project)
8. [Smart Contract API](#smart-contract-api)
9. [Backend API Reference](#backend-api-reference)
10. [AI Microservice API](#ai-microservice-api)
11. [Security](#security)
12. [Project Structure](#project-structure)
13. [Contributing](#contributing)

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│               Patient / Doctor / Hospital            │
│                   React Frontend (5173)              │
└──────────┬──────────────────────┬───────────────────┘
           │ REST / Axios          │ ethers.js / MetaMask
           ▼                      ▼
┌─────────────────┐   ┌──────────────────────────────┐
│  Express API    │   │   Ethereum Smart Contract     │
│  Node.js :5000  │   │   (Sepolia / Hardhat Local)   │
└────┬────────────┘   └──────────────────────────────┘
     │                         ↑ IPFS CID anchored on-chain
     ├── MongoDB Atlas (off-chain metadata)
     ├── Pinata / IPFS (encrypted file storage)
     │
     ▼
┌─────────────────────────────────────────┐
│   Python AI Microservice Flask :5001    │
│   XGBoost + LightGBM + CatBoost        │
│   SHAP Explainability + CDSS Engine    │
└─────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, TailwindCSS, Recharts, ethers.js v6 |
| **Backend** | Node.js, Express 5, Mongoose, JWT |
| **Blockchain** | Solidity 0.8.19, Hardhat, ethers.js |
| **Storage** | MongoDB Atlas, IPFS via Pinata SDK |
| **AI/ML** | Python, Flask, XGBoost, LightGBM, CatBoost, SHAP |
| **Security** | Helmet.js, bcrypt, express-rate-limit, AES-256 |
| **DevOps** | Docker, Hardhat Local, dotenv |

---

## ✨ Key Features

### 🔒 Blockchain Layer
- **Patient-Controlled Access**: `grantDoctorAccess()` / `revokeDoctorAccess()` on-chain
- **Time-Limited Access**: `grantTimedDoctorAccess(doctor, durationSeconds)` — NEW v2.0
- **Emergency Access**: Emergency contacts can grant 24h access — NEW v2.0
- **IPFS CID Anchoring**: Medical files stored on IPFS; only CID on-chain
- **Prescription Validation**: On-chain SHA-256 hash anchoring — NEW v2.0
- **Soft Delete**: `deactivateRecord()` — records are never permanently deleted

### 🤖 AI Clinical Decision Support (CDSS)
- **Drug Interaction Detection**: RxNorm-based interaction checking
- **Ensemble Risk Prediction**: XGBoost + LightGBM + CatBoost
- **SHAP Explainability**: Feature importance visualisation
- **Disease Prediction**: Heart disease, diabetes, Parkinson's, stroke
- **Medication Adherence**: ML-based adherence prediction
- **Digital Twin**: Virtual patient simulation

### 🏥 Multi-Role Dashboard
- **Patient**: Records, QR Health ID, Access management, AI insights
- **Doctor**: Patient registry, Upload prescriptions, CDSS, QR Scanner
- **Hospital**: Institutional portal, Upload reports, Analytics
- **Admin**: Platform-wide analytics, User registry, System health *(NEW)*

### 🔐 Security
- OWASP-compliant middleware stack
- NoSQL injection prevention (manual, Express 5 compatible)
- JWT access + refresh token rotation *(NEW)*
- Audit logging for all security events *(NEW)*
- XSS input sanitization (escape on input, CSP header)
- Rate limiting (100 req / 15min)

---

## 📋 Prerequisites

- **Node.js** ≥ 18.0.0
- **Python** ≥ 3.9
- **MetaMask** browser extension
- **MongoDB Atlas** account (free tier)
- **Pinata** account (free tier, 1GB)
- Git

---

## 🚀 Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/MediChain.git
cd MediChain
```

### 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your credentials (see Environment Variables below)
npm run dev
```

### 3. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

### 4. AI Microservice Setup

```bash
cd ai
pip install -r requirements.txt
python app.py
```

### 5. Blockchain Setup

```bash
cd blockchain
npm install
# Start local Hardhat node
npx hardhat node
# In a new terminal, deploy contracts
npx hardhat run scripts/deploy.js --network localhost
```

---

## 🔑 Environment Variables

### Backend (`backend/.env`)

```env
# Database
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/medichain

# JWT Secrets (generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
JWT_SECRET=your-256-bit-secret-here
JWT_REFRESH_SECRET=your-256-bit-refresh-secret-here

# IPFS (Pinata)
PINATA_API_KEY=your-pinata-api-key
PINATA_SECRET_KEY=your-pinata-secret-key
PINATA_GATEWAY=https://gateway.pinata.cloud/ipfs/

# Blockchain
PRIVATE_KEY=0xyour-deployer-private-key
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/your-infura-project-id
CONTRACT_ADDRESS=0x...deployed-contract-address

# App
PORT=5000
NODE_ENV=development

# AI Service
AI_SERVICE_URL=http://localhost:5001

# Redis (optional — for caching)
REDIS_URL=redis://localhost:6379
```

### Frontend (`frontend/.env`)

```env
REACT_APP_API_URL=http://localhost:5000
REACT_APP_AI_URL=http://localhost:5001
REACT_APP_CONTRACT_ADDRESS=0x...your-contract-address
REACT_APP_NETWORK_ID=11155111  # Sepolia
```

### AI Microservice (`ai/.env`)

```env
SECRET_KEY=your-flask-secret-key
PORT=5001
```

---

## ▶️ Running the Project

### Development (all services)

Open 4 terminal windows:

```bash
# Terminal 1 — Backend API
cd backend && npm run dev

# Terminal 2 — Frontend
cd frontend && npm run dev

# Terminal 3 — AI Microservice
cd ai && python app.py

# Terminal 4 — Hardhat Node (local blockchain)
cd blockchain && npx hardhat node
```

### Docker (Recommended)

```bash
docker-compose up --build
```

---

## 📜 Smart Contract API

**Contract:** `MediChain.sol` | **Version:** 2.0.0 | **Network:** Sepolia / Local

### Patient Functions

| Function | Parameters | Description |
|----------|-----------|-------------|
| `registerPatient()` | — | Register the caller as a patient (one-time) |
| `setEmergencyContact(addr)` | contactAddr | Set trusted emergency contact |
| `grantDoctorAccess(addr)` | doctorAddr | Grant permanent access |
| `grantTimedDoctorAccess(addr, secs)` | doctorAddr, durationSeconds | Grant time-limited access |
| `revokeDoctorAccess(addr)` | doctorAddr | Revoke doctor access |
| `deactivateRecord(patient, idx)` | patientAddr, index | Soft-delete a record |

### Doctor / Hospital Functions

| Function | Parameters | Description |
|----------|-----------|-------------|
| `addMedicalRecord(...)` | patientAddr, ipfsCID, ipfsURL, recordType, notes | Add IPFS-backed record |
| `getMedicalRecords(patient)` | patientAddr | Get all records (authorised) |
| `getRecordCount(patient)` | patientAddr | Get record count |
| `getPatientRecordsByType(patient, type)` | patientAddr, recordType | Filter by type |

### Emergency Access (NEW v2.0)

| Function | Parameters | Description |
|----------|-----------|-------------|
| `grantEmergencyAccess(patient, doctor)` | patientAddr, doctorAddr | Emergency contact grants 24h access |
| `getEmergencyContact(patient)` | patientAddr | Get patient's emergency contact |

### Prescription Validation (NEW v2.0)

| Function | Parameters | Description |
|----------|-----------|-------------|
| `addPrescriptionValidation(...)` | patientAddr, reportHash, safetyScore, severity | Anchor prescription hash on-chain |
| `verifyPrescriptionHash(patient, hash)` | patientAddr, reportHash | Verify a prescription hash |

---

## 🔗 Backend API Reference

**Base URL:** `http://localhost:5000/api`

### Auth (`/auth`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | — | Register new user |
| POST | `/auth/login` | — | Login, returns access + refresh token |
| GET | `/auth/me` | JWT | Get current user profile |
| POST | `/auth/logout` | — | Logout (client-side token removal) |
| POST | `/auth/refresh` | — | Exchange refresh token for new access token |
| PATCH | `/auth/wallet` | JWT | Link MetaMask wallet |
| PATCH | `/auth/blockchain-registered` | JWT | Confirm on-chain registration |

### Patient (`/patient`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/patient/records` | JWT (patient) | Get all patient records |
| GET | `/patient/records/:id` | JWT (patient) | Get single record |
| GET | `/patient/profile` | JWT (patient) | Get patient profile |
| GET | `/patient/access-list` | JWT (patient) | List authorised doctors |

### Doctor (`/doctor`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/doctor/patients` | JWT (doctor) | Get all accessible patients |
| GET | `/doctor/patient/:id/records` | JWT (doctor) | Get patient records |
| POST | `/doctor/upload` | JWT (doctor/hospital) | Upload medical file to IPFS + MongoDB |
| GET | `/doctor/recent-uploads` | JWT (doctor/hospital) | Get recent upload activity |

### Analytics (`/analytics`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/analytics/summary` | JWT | Full platform analytics |
| GET | `/analytics/stats` | JWT | Hospital dashboard stats |
| GET | `/analytics/platform-stats` | JWT | Admin platform stats |
| GET | `/analytics/users` | JWT | User registry (admin) |

### AI (`/ai` and `/cdss`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/cdss/analyze` | JWT | Drug interaction + clinical analysis |
| POST | `/cdss/dosage-safety` | JWT | Single drug dosage ML prediction |
| POST | `/cdss/dosage-safety/batch` | JWT | Batch dosage safety for prescription |
| POST | `/predict/disease` | JWT | Disease risk prediction |
| POST | `/predict/ensemble` | JWT | Ensemble risk scoring (XGB+LGB+CAT) |

---

## 🤖 AI Microservice API

**Base URL:** `http://localhost:5001`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/cdss/analyze` | Full CDSS analysis with interactions + SHAP |
| POST | `/cdss/dosage-safety` | Single drug dosage ML prediction |
| POST | `/predict/disease` | Disease risk score |
| POST | `/predict/ensemble` | Ensemble prediction (3 models) |
| POST | `/predict/adherence` | Medication adherence prediction |
| POST | `/predict/digital-twin` | Digital twin simulation |
| GET | `/health` | Health check |

---

## 🔐 Security

MediChain implements a comprehensive OWASP-compliant security stack:

| Security Control | Implementation |
|-----------------|----------------|
| Authentication | JWT (24h access + 30d refresh) |
| Password Hashing | bcrypt (12 rounds) |
| Security Headers | Helmet.js (CSP, HSTS, XSS, etc.) |
| Rate Limiting | 100 req / 15min per IP |
| NoSQL Injection | Manual body sanitizer (Express 5 compatible) |
| HTTP Param Pollution | Manual last-value normalizer |
| Input Validation | express-validator v7 with XSS escaping |
| Audit Logging | `utils/auditLogger.js` for all auth events |
| CORS | Allowlist-based origin enforcement |
| Blockchain | Patient-controlled access via smart contract |
| File Storage | IPFS with AES-256 encryption |

---

## 📁 Project Structure

```
MediChain/
├── backend/
│   ├── middleware/
│   │   ├── auth.js              # JWT protect + role authorize
│   │   └── validate.js          # express-validator v7 chains
│   ├── models/
│   │   ├── User.js              # Patient / Doctor / Hospital / Admin
│   │   └── MedicalRecord.js     # IPFS + blockchain proof schema
│   ├── routes/
│   │   ├── auth.js              # Register, Login, Refresh, Wallet
│   │   ├── patient.js           # Patient-scoped record access
│   │   ├── doctor.js            # Doctor upload + patient access
│   │   ├── analytics.js         # Stats, platform, users endpoints
│   │   ├── ensemblePredict.js   # Proxy to Flask AI service
│   │   └── prescriptionValidator.js
│   └── utils/
│       ├── cache.js             # Redis-based route cache
│       └── auditLogger.js       # OWASP audit event logger (NEW)
│
├── blockchain/
│   ├── contracts/
│   │   └── MediChain.sol        # v2.0 smart contract
│   ├── scripts/
│   │   └── deploy.js
│   └── test/
│       └── MediChain.test.js
│
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── DashboardLayout.jsx
│       │   ├── GlassCard.jsx
│       │   ├── FuturisticButton.jsx
│       │   ├── MedicalTimeline.jsx  # NEW
│       │   └── NetworkGuard.jsx
│       ├── context/
│       │   └── AuthContext.jsx
│       ├── pages/
│       │   ├── LandingPage.jsx      # Rebuilt (was broken)
│       │   ├── PatientDashboard.jsx
│       │   ├── DoctorDashboard.jsx
│       │   ├── HospitalDashboard.jsx # Rebuilt (was stub)
│       │   ├── AdminDashboard.jsx    # NEW
│       │   └── NotFoundPage.jsx      # NEW
│       └── utils/
│           └── api.js              # Fixed port 5005→5000, added aiApi
│
└── ai/
    ├── app.py                   # Flask factory
    ├── cdss/
    │   ├── drug_interaction_engine.py
    │   ├── ensemble_predictor.py
    │   └── disease_predictor.py
    └── models/                  # Pre-trained ML model files
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit: `git commit -m "feat: add your feature"`
4. Push: `git push origin feature/your-feature-name`
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

---

## 👨‍💻 Authors

Built with ❤️ as a VTU Final Year Major Project. Suitable for IEEE publication submission and hackathon demos.

---

## ⭐ Acknowledgements

- Ethereum Foundation for Solidity tooling
- Hardhat team for smart contract development toolkit
- Pinata for IPFS pinning infrastructure
- Open-source ML libraries: XGBoost, LightGBM, CatBoost, SHAP
