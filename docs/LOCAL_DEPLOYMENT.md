# MediChain Local Deployment Guide

This guide describes how to deploy and run all MediChain microservices locally for development and production simulation testing.

---

## 1. System Requirements

- **Node.js:** v18.0.0 or higher
- **Python:** v3.10.0 or higher
- **MongoDB:** v6.0+ (Local or MongoDB Atlas)
- **Redis:** v6.0+ (Optional — caching falls back to memory if unconfigured)
- **Hardhat:** Local node simulator

---

## 2. Service Configurations

### 1. Backend (`backend/.env`)
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/medichain
JWT_SECRET=your_jwt_access_secret_64_chars
JWT_REFRESH_SECRET=your_jwt_refresh_secret_64_chars
PINATA_JWT=your_pinata_jwt_here
PINATA_GATEWAY=gateway.pinata.cloud
AI_SERVICE_URL=http://localhost:5001
REDIS_URL=redis://localhost:6379
CORS_ORIGIN=http://localhost:3000
ENCRYPTION_MASTER_KEY=your_64_hex_encryption_master_key
```

### 2. AI Microservice (`ai/.env`)
```env
PORT=5001
ENV=development
HOST=0.0.0.0
MODEL_DIR=models
SECRET_KEY=your_flask_secret_key
```

### 3. Frontend (`frontend/.env`)
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_AI_URL=http://localhost:5001
REACT_APP_CONTRACT_ADDRESS=your_deployed_contract_address
REACT_APP_TARGET_CHAIN_ID=31337
PORT=3000
```

---

## 3. Deployment Steps

### Step 1: Start Local Blockchain Node
```bash
cd blockchain
npm install
npx hardhat node
```
This runs a local EVM on `http://127.0.0.1:8545` and prints several test accounts with private keys.

### Step 2: Deploy Smart Contract
In a new terminal window:
```bash
cd blockchain
npx hardhat run scripts/deploy.js --network localhost
```
This will deploy the contract and automatically copy the ABI and address configuration into `frontend/src/contracts/MediChain.json`.

### Step 3: Run Database Seeds
```bash
cd backend
npm install
node scripts/seedHospitals.js
node scripts/seed_staging.js
```

### Step 4: Start Backend API
```bash
cd backend
npm run dev
```
The API starts on `http://localhost:5000`. Verify with health check: `http://localhost:5000/health`.

### Step 5: Start AI Microservice
```bash
cd ai
python -m venv venv
# On Windows:
call venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
python app.py
```
The AI service starts on `http://localhost:5001`.

### Step 6: Start Frontend App
```bash
cd frontend
npm install
npm start
```
This opens the frontend at `http://localhost:3000`.
