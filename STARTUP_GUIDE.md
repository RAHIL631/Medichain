# MediChain Local Development Startup Guide

## Pre-requisites Check
Before starting, verify these are installed on your system:
- **Node.js**: Run `node --version` (needs to be v18+)
- **Python**: Run `python --version` (needs to be 3.9+)
- **MetaMask**: Extension installed in Chrome/Firefox/Brave
- **MongoDB Atlas**: Account created and cloud cluster running

---

## TERMINAL 1 — Hardhat Local Blockchain
First, spin up the local Ethereum network.

```bash
cd medichain/blockchain
npx hardhat node
```

**Expected output:**
```text
Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/

Available Accounts
==================
(0) 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000.0 ETH)
(1) 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 (10000.0 ETH)
... [18 more accounts]

Private Keys
==================
(0) 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
(1) 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
... [18 more keys]

WARNING: These accounts, and their private keys, are publicly known.
Any funds sent to them on Mainnet or any other live network WILL BE LOST.
```

---

## TERMINAL 2 — Deploy Smart Contract
Keep Terminal 1 running in the background. Open a **new terminal** to deploy the smart contract to your local network.

```bash
cd medichain/blockchain
npx hardhat run scripts/deploy.js --network localhost
```

**Expected output:**
```text
Deploying contracts with the account: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
MediChain deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3
ABI exported to deployedContract.json
ABI copied to frontend/src/contracts/MediChain.json
```
*(Note: Keep track of the deployed address, it will be needed by the frontend!)*

---

## TERMINAL 3 — Python AI Microservice
Open a **new terminal** to start the Flask AI service for drug-interaction checks and emergency risk assessment.

```bash
cd medichain/ai
source venv/bin/activate      # On Mac/Linux
venv\Scripts\activate         # On Windows
python train_model.py         # FIRST TIME ONLY: trains and saves models
python app.py
```

**Expected output:**
```text
[INFO] Models loaded: heart ✓ diabetes ✓ stroke ✓
 * Serving Flask app 'app'
 * Debug mode: on
WARNING: This is a development server. Do not use it in a production deployment.
 * Running on http://0.0.0.0:5001
```

---

## TERMINAL 4 — Node.js Backend
Open a **new terminal** to start the main Express API server.

```bash
cd medichain/backend
cp .env.example .env
```
*(Open `.env` and configure your real MongoDB URI, Pinata API keys, and JWT secrets)*

```bash
nodemon server.js
```

**Expected output:**
```text
MediChain Backend running on port 5000
✅  MongoDB connected to cluster.mongodb.net
✅  Pinata authentication: OK
```

---

## TERMINAL 5 — React Frontend
Open a **new terminal** to start the frontend application.

```bash
cd medichain/frontend
cp .env.example .env.local
```
*(Ensure `.env.local` has `REACT_APP_API_URL=http://localhost:5000`)*

```bash
npm start
```

**Expected output:**
```text
Compiled successfully!

You can now view medichain-frontend in the browser.
  Local:            http://localhost:3000
```
*(Your default web browser should automatically open to `http://localhost:3000`)*

---

## MetaMask Setup (Step-by-Step)
You need to configure MetaMask to talk to your Terminal 1 Hardhat network.

1. **Add Hardhat Network:**
   - Click the Network Dropdown (top left of MetaMask) → **Add Network** → **Add a network manually**
   - **Network Name:** Hardhat Local
   - **New RPC URL:** http://127.0.0.1:8545
   - **Chain ID:** 31337
   - **Currency Symbol:** ETH
   - Click **Save**.

2. **Import Patient Account (Account #0):**
   - Click your account avatar (top right) → **Add account or hardware wallet** → **Import account**
   - Copy the **Account #0 Private Key** from Terminal 1 (usually `0xac09...`) and paste it in.
   - Click **Import**. You should now see 10,000 ETH in this account.

3. **Import Doctor Account (Account #1):**
   - Click your account avatar → **Add account or hardware wallet** → **Import account**
   - Copy the **Account #1 Private Key** from Terminal 1 (usually `0x59c6...`) and paste it in.
   - Click **Import**.

---

## Verify Everything Is Working
Run through this checklist to confirm the whole stack is talking correctly:

- [ ] **Frontend:** Open `http://localhost:3000` → You see the MediChain Login page.
- [ ] **Backend:** Open `http://localhost:5000/api/auth` → You see a `Cannot GET` or `404` error (this proves the Express server is alive).
- [ ] **AI Service:** Open `http://localhost:5001/health` → You see `{"status":"ok"}`.
- [ ] **Blockchain:** MetaMask shows 10,000 ETH on the "Hardhat Local" network.
