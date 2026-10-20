# MediChain — Final Project Review Viva Preparation (30 Q&As)

**Project:** MediChain — Decentralized Electronic Health Record System with Clinical Decision Support  
**Target:** Academic Oral Defense, External Technical Review & Viva Voce  
**Format:** Direct Question & Concise Spoken-Ready Answer  

---

### Q1: What is the core problem MediChain solves?
**Answer:** Traditional healthcare systems trap patient records inside proprietary, centralized hospital silos. This fragmentation prevents seamless sharing between doctors, exposes data to centralized breaches or tampering, and deprives patients of control over their own health history. MediChain solves this by creating a patient-controlled, decentralized ecosystem where patient consent is enforced on the Ethereum blockchain, files are stored off-chain in encrypted IPFS storage, and prescriptions are checked in real time by AI.

---

### Q2: Why did you choose a hybrid architecture rather than storing everything on the blockchain?
**Answer:** Storing large binary medical files (such as high-res scans or PDF lab reports) directly on the Ethereum blockchain is technically infeasible due to block gas limits, massive transaction costs, and public readability. In MediChain, we use a hybrid model:
1. **On-Chain:** Only lightweight cryptographic proofs, Content Identifiers (CIDs), and access permission state.
2. **Off-Chain:** Encrypted document binaries on decentralized IPFS, and queryable metadata in MongoDB.

---

### Q3: What is the tech stack and why did you choose it?
**Answer:**
- **Frontend:** React 18 with TailwindCSS and Ethers.js v6 for a reactive, component-driven Web3 user interface.
- **Backend API:** Node.js Express 5 for non-blocking I/O, rapid JSON API routing, and robust security middleware.
- **Smart Contracts:** Solidity 0.8.19 on Ethereum EVM for immutable access control and notarization.
- **Storage:** IPFS (via Pinata) for content-addressed decentralized storage.
- **Database:** MongoDB Atlas for flexible, schematized metadata indexing.
- **AI Microservice:** Python Flask with Scikit-learn, XGBoost, and LightGBM for clinical decision support.

---

### Q4: How does user authentication work in MediChain?
**Answer:** We implement stateless JSON Web Token (JWT) authentication. Upon login, the user's password is verified against the stored hash using `bcryptjs` with 12 salt rounds. The backend then issues a short-lived Access Token (24h) and a long-lived Refresh Token (7d). Protected endpoints use a `protect` middleware that validates the JWT signature, extracts the user ID and role, and checks a server-side token blocklist to invalidate logged-out sessions.

---

### Q5: How is Role-Based Access Control (RBAC) enforced?
**Answer:** RBAC is enforced on two levels:
1. **Frontend:** Conditional rendering hides unauthorized tabs and routes based on `user.role` (`patient`, `doctor`, `hospital`, `admin`).
2. **Backend:** Strict `authorize(...roles)` middleware protects API endpoints. For instance, `POST /api/doctor/upload-record` immediately rejects non-doctor tokens with HTTP 403 Forbidden, ensuring security cannot be bypassed by client manipulation.

---

### Q6: What prevents a stolen QR Health ID from exposing patient medical records?
**Answer:** Our QR code adheres to a zero-knowledge identifier design: it encodes **strictly the patient's unique alphanumeric ID** (`MC-PAT-YYYY-XXXXXX`) and contains **no Protected Health Information (PHI)** whatsoever. Possessing or scanning the QR code does not grant access to records; a scanning physician must still authenticate and possess an active, verifiable consent record on the blockchain to query the patient's records.

---

### Q7: Why did you choose AES-256-GCM for file encryption?
**Answer:** AES-256-GCM is an Authenticated Encryption with Associated Data (AEAD) algorithm:
1. **Confidentiality:** 256-bit symmetric encryption provides military-grade confidentiality.
2. **Authenticity & Integrity:** GCM computes a 128-bit authentication tag (`authTag`). If an attacker alters even a single bit of the encrypted file on IPFS, decryption fails immediately with an authentication error, guaranteeing tamper resistance.

---

### Q8: Explain MediChain's Envelope Encryption key hierarchy.
**Answer:** We use a two-tiered key hierarchy:
1. **Data Encryption Key ($K_{data}$):** A unique, cryptographically random 256-bit key is generated for every single file upload to encrypt the file buffer.
2. **Master Key ($K_{master}$):** Stored securely in server environment variables. $K_{master}$ encrypts the per-record $K_{data}$.
3. Only the encrypted $K_{data}$, IV, and Auth Tag are stored in MongoDB. The plaintext key is discarded from memory immediately after encryption.

---

### Q9: What is an IPFS CID and how does it guarantee document integrity?
**Answer:** A Content Identifier (CID) is a cryptographic multihash (SHA-256) of the file's content. In IPFS, files are content-addressed rather than location-addressed. If someone alters any byte of a document, its recalculated hash changes completely, yielding a different CID. By storing the original CID on the Ethereum blockchain, any tampering is mathematically detectable.

---

### Q10: How does MediChain verify whether a downloaded document has been altered?
**Answer:** When a document is retrieved from IPFS, the system recomputes the SHA-256 multihash of the received ciphertext and compares it against the `ipfsCID` permanently recorded in the smart contract. If the two match, the document is mathematically proven unchanged. If they mismatch, the system halts and raises an integrity alert.

---

### Q11: What smart contract functions did you write in Solidity?
**Answer:** Key functions in `MediChain.sol` include:
- `registerPatient()`: Registers caller address.
- `grantDoctorAccess(address)` & `revokeDoctorAccess(address)`: Controls doctor access permissions and emits audit events.
- `grantTimedDoctorAccess(address, uint256)`: Grants access with an automated timestamp expiration.
- `grantEmergencyAccess(patient, doctor)`: Allows designated emergency contacts to grant access in critical situations.
- `addMedicalRecord(...)`: Allows only authorized doctors to anchor new record metadata and IPFS CIDs on-chain.
- `addPrescriptionValidation(...)`: Anchors AI safety verification scores and report hashes on-chain.

---

### Q12: Which Ethereum network is MediChain deployed to, and why?
**Answer:** MediChain is deployed on the **Ethereum Sepolia Testnet** (Chain ID: `11155111`) at address `0x54fb71438b6A79947BE43dFAfB72194619405004`. Sepolia provides an authentic proof-of-stake EVM execution environment without incurring real monetary gas fees, perfectly mimicking Ethereum Mainnet behavior.

---

### Q13: How does MetaMask communicate with the frontend?
**Answer:** MetaMask injects an EIP-1193 Ethereum provider into the browser window (`window.ethereum`). Our React application wraps this provider using Ethers.js v6 `BrowserProvider`. When a patient grants access, Ethers.js creates a transaction payload, prompts the user to sign it via MetaMask, broadcasts it to the Sepolia RPC endpoint, and awaits 1 block confirmation before updating the UI.

---

### Q14: What is stored in MongoDB vs what is stored on the Blockchain?
**Answer:**
- **On Blockchain:** Access permissions (`_doctorAccess`), Timed grants (`_timedAccessExpires`), Emergency contact bindings, and immutable IPFS CIDs.
- **In MongoDB:** User account profiles (email, hashed passwords), cached record metadata (file name, MIME type, file size), encrypted key bundles (`encryptionMeta`), and compliance audit logs (`AuditLog`).

---

### Q15: How does the Express backend communicate with the Python AI microservice?
**Answer:** Communication occurs over internal HTTP REST calls. When a doctor uploads a prescription, the Express server formats a JSON payload containing medications, patient age, and clinical conditions, and sends an asynchronous `POST` request to `http://localhost:5001/cdss/analyze` (or the deployed Render AI URL). The AI service returns safety scores and conflict alerts, which Express embeds into the database record.

---

### Q16: What machine learning models are used in your CDSS?
**Answer:** We employ an ensemble of supervised learning classifiers:
1. **Gradient Boosting & XGBoost:** For cardiovascular disease, stroke, and diabetes risk classification.
2. **LightGBM & CatBoost:** For tabular chronic condition analysis (kidney and liver function).
3. **Consensus Ensemble:** Combines probability predictions using soft voting to reduce individual model variance.

---

### Q17: What is RxNorm and how does MediChain use it?
**Answer:** RxNorm is a standardized clinical drug terminology catalog provided by the U.S. National Library of Medicine. In MediChain, we use RxNorm to normalize entered drug names (brand names and generics) into standardized RxCUI concept identifiers, enabling reliable cross-referencing against our drug-drug interaction matrix.

---

### Q18: What evaluation metrics did you use for the AI models?
**Answer:** Because clinical datasets exhibit class imbalance, accuracy alone is misleading. We evaluated our models using:
- **ROC-AUC (Receiver Operating Characteristic - Area Under Curve):** Measuring discrimination capability across thresholds.
- **F1-Score:** Harmonic mean of precision and recall to ensure low false-negative rates.
- **Sensitivity / Recall:** Prioritizing catching high-risk clinical conditions over specificity.

---

### Q19: What are the limitations of the training data used for your AI models?
**Answer:** The AI models were trained on public benchmark healthcare datasets (including MIMIC-III derivatives and UCI Machine Learning repository clinical sets). While effective for demonstrating clinical decision support workflows, these models cannot be deployed in production hospitals without institutional retraining and clinical trial validation on localized patient demographics.

---

### Q20: Are the AI outputs considered medical diagnoses?
**Answer:** No. MediChain CDSS outputs are strictly **clinical decision-support signals** designed to assist physicians by highlighting drug conflicts, contraindications, and statistical risks. Every AI response includes a non-autonomous disclaimer stating that human medical review is mandatory before clinical decisions are made.

---

### Q21: What happens if a patient revokes a doctor's access?
**Answer:** Two coordinated actions occur:
1. **On-Chain:** The patient executes `revokeDoctorAccess(doctorAddress)`, setting `hasAccess = false` on the smart contract.
2. **Database:** The active `ConsentRecord` status is set to `revoked`.
If the doctor subsequently calls `GET /api/doctor/record/:id/download`, the backend verifies active consent, detects the revocation, halts immediately, returns **HTTP 403 Forbidden**, and writes an `UNAUTHORIZED` event to the audit log.

---

### Q22: How does MediChain prevent NoSQL injection attacks?
**Answer:** In Express 5, we implement a recursive sanitization middleware on incoming requests that scans `req.body`, `req.params`, and query strings, stripping any object keys containing MongoDB operators (such as `$gt`, `$ne`, or `$regex`) or path dots (`.`). This prevents attackers from manipulating MongoDB query semantics.

---

### Q23: How does MediChain prevent Cross-Site Scripting (XSS)?
**Answer:** XSS is mitigated through defense-in-depth:
1. **Input Sanitization:** A custom recursive middleware entity-encodes dangerous characters (`<, >, ", '`) before handlers process the input.
2. **HTTP Headers:** Helmet configures strict Content Security Policies (CSP) and `X-Content-Type-Options: nosniff`.
3. **React Auto-Escaping:** React’s JSX engine treats data inside `{variables}` as strings, preventing script injection in DOM nodes.

---

### Q24: What rate limiting policies are in place?
**Answer:** We configure two levels using `express-rate-limit`:
1. **Global API Limiter:** 100 requests per 15-minute window per IP for general endpoints.
2. **Auth Limiter:** 10 requests per 15-minute window per IP on `/api/auth/*` routes, preventing brute-force dictionary attacks against user logins.

---

### Q25: How does MediChain comply with GDPR and patient privacy laws?
**Answer:**
1. **Right of Access (Article 15) & Data Portability (Article 20):** `GET /api/account/export` provides a complete JSON archive of the patient's profile, medical records, and audit history.
2. **Right to Erasure (Article 17):** `DELETE /api/account` anonymizes user personal data, deactivates medical records, and revokes all consents (while retaining legally mandated immutable audit logs).
3. **Confidentiality:** Zero raw medical data is stored on public IPFS or the public blockchain.

---

### Q26: What automated tests have you implemented and what were the results?
**Answer:** We implemented **111 automated tests** across three independent testing frameworks:
1. **Solidity / Hardhat:** 46/46 unit tests passing (contract deployment, access modifiers, timed access, prescription hashes).
2. **Node.js / Jest:** 62/62 integration tests passing (API routes, authentication, IPFS encryption roundtrips, RBAC, consent revocation).
3. **Python / Pytest:** 3/3 test suites passing (clinical intelligence endpoints, predictive analytics models).
All 111 tests pass with a 100% success rate and zero failures.

---

### Q27: How does the system handle Render free-tier cold starts?
**Answer:** Free instances on Render hibernate after 15 minutes of inactivity, taking 30–50 seconds to boot on the first incoming request. In [frontend/src/utils/api.js](file:///c:/Users/Rahil%20hassan/OneDrive/Desktop/Major%20project/MediChain/frontend/src/utils/api.js), our Axios interceptor sets a 60-second timeout and detects `ECONNABORTED`, presenting a friendly alert informing the user that the backend is waking up, rather than throwing an unexplained application crash.

---

### Q28: What is MediChain's measured performance?
**Answer:**
- In Jest integration tests, backend API request handling averaged sub-2 milliseconds for in-memory operations.
- The AES-256-GCM envelope encryption processed standard medical documents in sub-10 milliseconds.
- The React production bundle was optimized to 188.8 kB (gzipped) for rapid mobile browser rendering.

---

### Q29: What are the main technical limitations of the current implementation?
**Answer:**
1. **Cold Start Latency:** Free-tier cloud instances have an initial spin-up delay.
2. **Gas Dependency:** Patients require Sepolia testnet ETH to trigger on-chain state updates.
3. **Model Retraining:** AI models are static serialized pipelines rather than continuous learning models.

---

### Q30: What future enhancements would you prioritize next?
**Answer:**
1. **Zero-Knowledge Proofs (zk-SNARKs):** To allow doctors to prove they are board-certified without disclosing their identity or wallet history publicly on-chain.
2. **Account Abstraction (ERC-4337):** Introducing smart contract paymasters so healthcare clinics can sponsor gas fees for patients.
3. **FHIR R4 Interoperability:** Standardizing medical records export into HL7/FHIR JSON format for plug-and-play integration with commercial hospital systems like Epic or Cerner.
