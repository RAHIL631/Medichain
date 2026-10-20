# MediChain — End-User Operational Guide

**Product:** MediChain — Patient-Controlled Healthcare Information Platform  
**Target Audience:** Patients, Healthcare Providers, and Clinic Operators  
**Document Purpose:** Non-technical operational guide explaining how to navigate and use MediChain features safely and effectively.

---

## 1. Getting Started: Creating Your Account

### Step 1: Sign Up
1. Navigate to the MediChain homepage and click **Get Started** or **Create Account**.
2. Select your account role:
   - **Patient:** For managing personal health history, sharing records with physicians, and generating a QR Health ID for identification (not automatic record access).
   - **Doctor:** For licensed clinicians reviewing records, uploading diagnostic documents, and performing AI prescription safety audits.
   - **Hospital / Lab:** For institutions managing healthcare facility profiles.
3. Enter your full name, email address, and a secure password (minimum 8 characters with at least one uppercase letter, one number, and one special character).
4. **Note on Crypto Wallets:** You do **not** need a cryptocurrency wallet (such as MetaMask) to create your account or view your dashboard. A wallet is only required if you choose to sign decentralized access changes on the Ethereum blockchain.

---

## 2. Patient Guide

### Viewing Your Health Dashboard
Upon logging in, the **Patient Dashboard** displays:
- **Total Health Records:** Number of verified prescriptions, lab reports, and imaging scans attached to your account.
- **Active Doctor Grants:** Number of healthcare providers currently authorized to access your records.
- **Your Health ID Badge:** A unique alphanumeric code (e.g. `MC-PAT-2026-A1B2C3`) assigned permanently to your account.

### Using Your QR Health ID
1. Click **My Health QR** in the left navigation sidebar or on the dashboard card.
2. Your dynamic QR code will be displayed on screen.
3. **What is encoded in the QR code?**
   - The QR code contains **strictly your alphanumeric Patient ID**.
   - It does **not** contain your diagnoses, medical history, or personal identity.
   - Scanning this code allows a healthcare provider to find your account; it does **not** give them permission to view your medical files.
4. **Downloading or Printing Your Card:**
   - Click **Download QR** to save a high-resolution 1000x1000px PNG card.
   - Click **Print ID** to generate a clean, physical wallet card you can show for identification.

### Authorizing a Doctor (Granting Access)
1. Go to **Manage Access** (`/access`).
2. Enter the licensed doctor's Ethereum wallet address (provided by the clinic).
3. Click **Grant Access**.
4. Confirm the transaction in MetaMask if your wallet is connected. Once confirmed, the doctor appears under **Authorized Providers**.

### Revoking Access
1. In **Manage Access**, locate the doctor you wish to remove.
2. Click **Revoke Access**.
3. Once revoked, that doctor will immediately receive an **Access Denied (HTTP 403)** error if they attempt to view or download any of your medical files.

---

## 3. Doctor Guide

### Identifying a Patient
1. In your **Clinical Dashboard**, click **Scan Patient QR** or use the **Patient Search** box.
2. Hold the patient's QR code in front of your camera or enter their wallet address / patient ID.
3. The system confirms if you have active consent. If authorized, the patient's record timeline opens.

### Uploading a Medical Record or Prescription
1. Open **Upload Prescription / Record**.
2. Select the record type (Prescription, Lab Report, Diagnosis, Imaging, Vaccination).
3. Enter clinical notes and prescribed medications (separated by commas, e.g., `Lisinopril, Metformin`).
4. Attach the digital document (PDF, JPG, or PNG under 10MB).
5. Click **Upload & Anchor Record**.
   - *Stage 1:* The backend automatically encrypts the file using AES-256-GCM.
   - *Stage 2:* The encrypted ciphertext is pinned to decentralized IPFS storage.
   - *Stage 3:* The cryptographic CID and metadata are saved to the patient's timeline and (if MetaMask is connected) anchored to the Ethereum Sepolia smart contract.

### Interpreting AI Decision Support Signals
When you enter medications during prescription creation or in the **AI Prescription Validator**:
- **Safety Score (0–100):** A composite score where higher numbers indicate lower conflict risk.
- **High / Critical Severity Alert (Red Banner):** Indicates a known adverse drug-drug interaction (e.g., Warfarin + Aspirin) or high dosage hazard. The upload will be paused to prevent accidental clinical harm.
- **Moderate / Low Severity Notice (Yellow/Blue Banner):** Informs the clinician of mild interactions or monitoring recommendations (e.g., periodic kidney function tests).
- **Important Clinical Notice:** All AI outputs represent **predictive decision support** and do not replace licensed clinical diagnosis or professional pharmacological judgment.

---

## 4. Understanding Data Security & Privacy

| Technology | What It Does | What It Does NOT Do |
|---|---|---|
| **AES-256-GCM Encryption** | Encrypts medical documents before they leave the server so nobody on IPFS can read them. | Does not eliminate the need for strong account passwords. |
| **IPFS Storage** | Distributes encrypted files across a resilient network without single-point database vulnerabilities. | IPFS is public storage; confidentiality is achieved through encryption, not the network itself. |
| **Ethereum Blockchain** | Records tamper-evident CIDs and enforces access permissions immutably. | Does not store raw patient medical records. |
| **QR Health ID** | Allows quick alphanumeric identification in physical clinic workflows. | Does not grant blanket access to clinical records without patient consent. |

---

## 5. Troubleshooting Common Issues

### "The server is taking too long to respond..."
- *Explanation:* MediChain's cloud staging environment is hosted on Render's free tier, which hibernates when inactive.
- *Solution:* Wait 30 seconds and click retry, or open `https://medichain-1-sjnc.onrender.com/ready` in a new tab to wake up the service.

### "Wrong Network" in MetaMask
- *Explanation:* MetaMask is connected to Ethereum Mainnet or a testnet other than Sepolia.
- *Solution:* Click the **Switch Network** button inside the top banner to automatically switch MetaMask to **Ethereum Sepolia (Chain ID 11155111)**.

### "Access Denied: You do not have active patient consent..."
- *Explanation:* The patient has not granted you access, or their previous grant has been revoked or expired.
- *Solution:* Ask the patient to open **Manage Access** on their dashboard and add your doctor wallet address.
