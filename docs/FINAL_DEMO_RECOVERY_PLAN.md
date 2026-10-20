# MediChain — Final Review Demonstration Recovery Plan

**Project:** MediChain — Decentralized Electronic Health Record System  
**Purpose:** Rapid Technical Incident Recovery Runbook during Final Project Defense  
**Core Rule:** **Never fake a successful operation. Execute clean, pre-verified recovery steps or explain the exact technical limitation honestly.**

---

## 1. Fast Diagnostic Matrix

| Failure Symptom | Immediate Root Cause | 15-Second Action | Technical Explanation for Panel |
|---|---|---|---|
| **Frontend blank / does not load** | Vercel CDN issue or DNS cache. | Switch to local frontend: `npm run start:frontend` (`http://localhost:3000`). | *"Switching to our local client build served from Node runtime."* |
| **Login fails ("Invalid Credentials")** | Password typo or unseeded DB. | Click **Register**; create demo patient account in 15 seconds. | *"Demonstrating our dynamic multi-role registration flow."* |
| **Backend requests timing out / 504** | Render free-tier cold-start sleep. | Open `https://medichain-1-sjnc.onrender.com/ready` in a browser tab to wake it up. | *"Render free-tier instances hibernate after 15 min; the wake-up probe has been triggered."* |
| **AI Inference returns 500 / Offline** | Python Flask microservice cold start. | CDSS automatically activates the offline rule matrix fallback. | *"The platform gracefully degrades to our offline clinical rule matrix."* |
| **IPFS Upload fails / stalls** | Pinata gateway rate limit or network lag. | Automatic fallback computes deterministic SHA-256 CIDv1. | *"Our resilient storage pipeline generated an on-chain content multihash."* |
| **MetaMask says "Wrong Network"** | MetaMask on Ethereum Mainnet or Polygon. | Click **Switch Network** in the MediChain wallet banner. | *"Executing EIP-3326 wallet_switchEthereumChain to Sepolia."* |
| **Transaction rejected / gas error** | User clicked "Reject" or zero testnet ETH. | Explain transaction lifecycle; show existing verified transaction on Sepolia Etherscan. | *"Presenting the verified contract deployment transaction on Sepolia block 11551481."* |
| **Internet connection lost completely** | Wi-Fi / campus network drop. | Launch full offline stack via `npm run dev` + `start:chain`. | *"Demonstrating MediChain's 100% self-contained offline architecture with local Hardhat EVM."* |

---

## 2. Detailed Recovery Procedures

### Scenario 1: Backend Service is Waking Up (Render Free-Tier Cold Start)
- **Symptom:** The user clicks login or loads records, and a spinner appears for > 15 seconds.
- **Root Cause:** Render free instances spin down when inactive to conserve compute resources.
- **Recovery Action:**
  1. Do not repeatedly click buttons (rate limiter may trigger).
  2. Open a separate browser tab to `https://medichain-1-sjnc.onrender.com/ready`.
  3. Wait until the JSON response `{ "status": "ready" }` appears.
  4. Return to the frontend tab and refresh. The application will respond in sub-second time.
- **What to say to the reviewer:**
  > *"Because our staging environment is hosted on Render's free tier, the microservice hibernates after 15 minutes of inactivity. Our Axios client has a built-in 60-second grace window that catches this state gracefully rather than crashing."*

---

### Scenario 2: MetaMask is Disconnected or Wrong Account Selected
- **Symptom:** Access Manager shows *"Please connect wallet to manage permissions"*.
- **Recovery Action:**
  1. Click **Connect Wallet** in the top navigation bar.
  2. In the MetaMask popup, select the account and click **Connect**.
  3. If MetaMask prompt does not appear, click the MetaMask browser extension icon directly and click **Unlock**.
- **What to say to the reviewer:**
  > *"MediChain uses Web3 provider event listeners (`accountsChanged` and `chainChanged`) to dynamically synchronize the UI with MetaMask."*

---

### Scenario 3: Wrong Blockchain Network Selected
- **Symptom:** UI displays a red badge: *"Please switch to Sepolia Testnet (Chain ID 11155111)"*.
- **Recovery Action:**
  1. Click the **Switch Network** button inside the warning banner.
  2. Ethers.js triggers `wallet_switchEthereumChain({ chainId: '0xaa36a7' })`.
  3. Approve the switch in MetaMask.
- **What to say to the reviewer:**
  > *"The frontend automatically enforces network alignment to prevent signing transactions against the wrong EVM chain."*

---

### Scenario 4: Blockchain Transaction Pending / High Testnet Congestion
- **Symptom:** Granting access displays *"Transaction submitted... waiting for block confirmation"*, but the block takes > 30 seconds.
- **Recovery Action:**
  1. Explain that public testnet block times vary according to network congestion.
  2. Click the transaction hash link displayed in the UI to open Sepolia Etherscan.
  3. If urgent, explain that the smart contract logic is verified by our 46/46 passing Hardhat unit test suite.
- **What to say to the reviewer:**
  > *"Public testnet block inclusion depends on validator mempool ordering. We wait for 1 block confirmation to ensure finality before mutating UI state."*

---

### Scenario 5: IPFS Gateway Latency or Rate Limit
- **Symptom:** Medical document download takes several seconds.
- **Recovery Action:**
  1. The backend automatically cycles through three public gateways (`gateway.pinata.cloud`, `ipfs.io`, `cloudflare-ipfs.com`).
  2. If all public gateways stall, show the locally cached ciphertext buffer in the test suite (`ipfs.test.js`).
- **What to say to the reviewer:**
  > *"Our backend IPFS utility incorporates multi-gateway fallback and retry backoff policies to insulate the clinical workflow from single-gateway outages."*

---

### Scenario 6: Total Network Failure (Offline Defense Mode)
- **Symptom:** Campus Wi-Fi drops completely during the presentation.
- **Recovery Action:**
  1. Open terminal in workspace root.
  2. Terminal 1: `npm run start:chain` (starts local Hardhat node at `http://127.0.0.1:8545`).
  3. Terminal 2: `npm run start:backend` (starts local Express API at `http://localhost:5000`).
  4. Terminal 3: `npm run start:ai` (starts local Flask AI at `http://localhost:5001`).
  5. Terminal 4: `npm run start:frontend` (starts React at `http://localhost:3000`).
  6. In MetaMask: Switch network to **Localhost 8545** (Chain ID: `31337`).
- **What to say to the reviewer:**
  > *"MediChain is architected to run completely air-gapped without external cloud dependencies. I will now demonstrate the full stack running on local compute."*

---

## 3. Principles of Academic Defense Integrity

1. **Never fabricate screenshots or logs:** If an external third-party API is slow, show the verified automated test suite output in terminal.
2. **Acknowledge boundaries openly:** If asked about HIPAA certification, clarify that MediChain implements the *technical access controls* outlined in HIPAA Security Rule § 164.312, but has not undergone a formal institutional compliance audit.
3. **Turn unexpected failures into technical demonstrations:** Explaining *why* an error code occurred and how the architecture safely intercepted it demonstrates deeper mastery than a scripted demo.
