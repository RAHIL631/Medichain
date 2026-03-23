# MediChain

> **Blockchain-based Electronic Health Record System**

A decentralised, tamper-proof medical record platform with patient-controlled access, IPFS storage, and AI-powered drug interaction detection.

---

## 🎯 Five Project Objectives

1. **Secure Blockchain EHR** — Ethereum + Solidity smart contracts for immutable health records
2. **Tamper-Proof Storage** — IPFS via Pinata SDK; only CID stored on-chain
3. **Instant Access via QR Health ID** — QR code encodes patient wallet address for quick record retrieval
4. **AI Drug Interaction Detection** — Python + Flask + scikit-learn + RxNorm API (free, no key)
5. **Patient-Controlled Permissions** — Smart contract access control; patient grants/revokes doctor access

---

## 🛠 Tech Stack

| Layer        | Technology                                              |
|--------------|---------------------------------------------------------|
| Frontend     | React.js · Tailwind CSS · ethers.js · MetaMask          |
| Backend      | Node.js · Express.js · MongoDB Atlas · Mongoose         |
| Blockchain   | Ethereum · Solidity ^0.8.19 · Hardhat · ethers.js v6   |
| Storage      | IPFS via Pinata SDK                                     |
| AI           | Python · Flask · scikit-learn · RxNorm API              |
| Auth         | JWT tokens · bcrypt                                     |
| Identity     | qrcode.react (generate) · react-qr-reader (scan)       |

---

## 👥 User Roles

| Role         | Capabilities                                                        |
|--------------|---------------------------------------------------------------------|
| Patient      | Register, get QR Health ID, view records, grant/revoke doctor access|
| Doctor       | Scan patient QR, view history, upload prescriptions (AI drug check) |
| Hospital/Lab | Upload test reports and diagnosis files                             |

---

## 🚀 How to Run (4 Terminals)

### Prerequisites
- Node.js ≥ 18, Python ≥ 3.9, MetaMask browser extension
- MongoDB Atlas connection string
- Pinata account (free tier)

### Terminal 1 — Blockchain (Hardhat local node)
```bash
cd blockchain
npm install
npx hardhat node
```

### Terminal 2 — Deploy Smart Contracts
```bash
cd blockchain
npx hardhat run scripts/deploy.js --network localhost
```

### Terminal 3 — Backend API
```bash
cd backend
npm install
cp .env.example .env   # fill in your secrets
nodemon server.js
```

### Terminal 4 — AI Microservice
```bash
cd ai
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux
pip install -r requirements.txt
python app.py
```

### Terminal 5 — Frontend
```bash
cd frontend
npm install
npm start
```

### Root-level convenience scripts
```bash
npm run start:chain      # Hardhat local node
npm run deploy:local     # Deploy contracts to localhost
npm run start:backend    # nodemon server.js
npm run start:ai         # python app.py
npm run start:frontend   # React dev server
npm run test:chain       # Hardhat tests
npm run test:backend     # Backend tests
```

---

## 📁 Folder Structure

```
medichain/
├── frontend/        # React app  (port 3000)
├── backend/         # Express API (port 5000)
├── blockchain/      # Hardhat + Solidity contracts
└── ai/              # Python Flask AI service (port 5001)
```

---

## 📜 License
MIT
