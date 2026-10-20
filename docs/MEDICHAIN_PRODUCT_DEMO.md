# MediChain — Product Demonstration Runbook & Synthetic Data Protocol

**Project:** MediChain — Patient-Controlled Healthcare Information Platform  
**Purpose:** Standardized, Reproducible Product Demonstration Protocol using Isolated Synthetic Data  
**Target Audience:** Prospective Evaluators, Product Stakeholders, and Technical Committees  
**Testing Rule:** **Never use real Protected Health Information (PHI). Use strictly isolated demonstration accounts and synthetic clinical fixtures.**

---

## 1. Demonstration Environment Setup

MediChain supports two demonstration modalities:

### Mode A: Live Cloud Staging (Default)
- **Frontend URL:** `https://medichain-henna.vercel.app`
- **Backend API:** `https://medichain-1-sjnc.onrender.com`
- **AI Microservice:** `https://medichain-ai.onrender.com`
- **Network:** Ethereum Sepolia Testnet (`Chain ID: 11155111`)
- **Pre-Flight Check:** Open `https://medichain-1-sjnc.onrender.com/ready` in a browser tab 60 seconds before demonstration to ensure services are awake (`status: "ready"`).

### Mode B: Local Air-Gapped Sandbox
- **Command:** `npm run dev` (from repository root)
- **Local Endpoints:** Frontend at `http://localhost:3000`, API at `http://localhost:5000`, AI at `http://localhost:5001`.
- **Local Blockchain:** `npm run start:chain` (Hardhat EVM node at `http://127.0.0.1:8545`).

---

## 2. Dedicated Synthetic Demonstration Accounts

| Role | Email Address | Password | Synthetic Identity & Purpose |
|---|---|---|---|
| **Patient** | `demo.patient@medichain.example` | `Password123!` | Synthetic Patient ("Alex Mercer"), Age 48, Blood Group O+, Mild Hypertension. |
| **Doctor** | `demo.doctor@medichain.example` | `Password123!` | Dr. Sarah Jenkins, MD, Board Certified Cardiologist, License #`MD-2026-9941`. |
| **Admin** | `demo.admin@medichain.example` | `Password123!` | System Quality & Security Auditor. |

*(Note: If demonstration accounts are not present in a fresh database, they can be created in 15 seconds through the standard `/register` route with 0 configuration changes).*

---

## 3. Step-by-Step Demonstration Script

### Step 1: Patient Dashboard & Zero-Knowledge Identification
1. Log in as `demo.patient@medichain.example`.
2. Tour the **Patient Dashboard**: Point out the active health records count, linked wallet status, and universal **MediChain Health ID** badge (`MC-PAT-2026-XXXXXX`).
3. Click **My Health QR** (`/qr-id`):
   - Display the high-resolution QR card.
   - Click **Download QR** to save the 1000x1000px PNG card.
   - Emphasize to the audience that scanning this code with any camera decodes **only the opaque patient ID**, revealing zero medical records.

### Step 2: Patient Consent Grant (Decentralized Access Management)
1. Navigate to **Manage Access** (`/access`).
2. Paste the demonstration doctor's Ethereum wallet address:
   `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`.
3. Click **Grant Access**.
4. Confirm in MetaMask. Emphasize that the patient has cryptographically granted permission on the smart contract.

### Step 3: Doctor Patient Lookup & Record Review
1. Switch to a separate browser profile / incognito window.
2. Log in as `demo.doctor@medichain.example`.
3. In the Doctor Dashboard, enter the synthetic patient's ID or wallet address.
4. The system validates active consent and loads the patient's record timeline.

### Step 4: Medical Record Upload with AES-256-GCM & IPFS Pinning
1. In the Doctor Dashboard, open **Upload Record**.
2. Select type: **Prescription**.
3. Notes: *"Maintenance antihypertensive therapy."*
4. Medications: `Lisinopril, Metformin`.
5. Attach a sample test file (`sample_rx.pdf` or synthetic lab scan).
6. Click **Upload & Anchor Record**:
   - The backend encrypts the file in-flight using **AES-256-GCM**.
   - Pinned to IPFS $\rightarrow$ Returns deterministic CIDv1 (e.g. `bafybeic...`).
   - Anchors to Sepolia smart contract.
7. Show that the doctor can immediately download and view the decrypted document.

### Step 5: Real-Time AI Prescription Safety Audit
1. Navigate to **AI Prescription Validator** (`/prescription-validator`).
2. Input high-risk drug pair:
   - Medication 1: `Warfarin`
   - Medication 2: `Aspirin`
3. Click **Analyze Prescription**:
   - AI evaluates drug-drug interaction matrix and dosage model.
   - Triggers a **Critical Severity Alert**: *"Major bleed hazard detected."*
   - Safety Score drops to `< 40 / 100`.
   - Point out the mandatory non-autonomous clinical disclaimer.

### Step 6: Consent Revocation & Verification of Access Denial
1. Return to the Patient window $\rightarrow$ `/access`.
2. Locate the doctor under **Authorized Providers** and click **Revoke Access**.
3. Confirm transaction.
4. Return to the Doctor window and attempt to download or open the patient's record again.
5. The request is immediately blocked with **HTTP 403 Forbidden** (*"Access denied: Missing active patient consent"*), and an audit entry is logged.

---

## 4. Safe Cleanup Procedure (Test Data Decommissioning)

To maintain a clean demonstration state after an evaluation session:
1. **Patient Data Deletion (GDPR Right of Erasure):**
   - Log in as the demonstration patient.
   - Navigate to `/profile` $\rightarrow$ Danger Zone $\rightarrow$ **Delete Account**.
   - Type `"DELETE MY ACCOUNT"` and confirm with password.
   - The backend automatically anonymizes the profile, soft-deletes associated records, revokes all active consents, and blocklists active session tokens.
2. **Blockchain State:**
   - On Ethereum Sepolia, access grants that were revoked in Step 6 remain immutably logged as `DoctorAccessRevoked` events, maintaining an accurate audit trail without cluttering active permissions.
3. **Local Cache / Session:**
   - Clear browser `localStorage` (`localStorage.clear()`) to reset client-side states.
