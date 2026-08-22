# MediChain — Stage 6 IPFS Storage & Secure Medical File Report

**Date:** 2026-08-22  
**Report Status:** ✅ SUCCESS  
**Prepared by:** Antigravity AI (Stage 6 IPFS & Storage Security Audit)  

---

## 1. Storage Architecture & IPFS Provider Specification

| Specification | Details |
|---|---|
| **Storage Provider** | Pinata IPFS (`@pinata/sdk` v2.1.0 & `pinata-web3` v0.5.4) |
| **Storage Topology** | Decentralized Content-Addressed Network with multi-node replication |
| **Addressing Scheme** | IPFS CIDv1 (base32 SHA-256 multihash `bafybeic...`) |
| **Gateway Endpoint** | `https://gateway.pinata.cloud/ipfs/` (configurable via `PINATA_GATEWAY`) |
| **Encryption Layer** | Client-Side Pre-Upload AES-256-GCM Envelope Encryption |
| **Metadata Indexing** | MongoDB `MedicalRecord` collection with on-chain Ethereum anchoring |

---

## 2. Secure Medical Storage Workflow

```mermaid
graph TD
    A[Client Submits Multipart Medical File] --> B[Magic Bytes & MIME Signature Validation]
    B --> C[Check File Size Cap <= 10MB]
    C --> D[Verify Active Patient Consent / Doctor Authorization]
    D --> E[Generate Unique 256-bit Data Key & 96-bit IV]
    E --> F[AES-256-GCM File Encryption]
    F --> G[Wrap Data Key with 256-bit Master Key]
    G --> H[Upload Ciphertext Buffer to Pinata IPFS]
    H --> I[Receive IPFS CIDv1]
    I --> J[Store Metadata & Key Bundle in MongoDB MedicalRecord]
    J --> K[Return CID & Record ID for Blockchain Anchoring]
```

---

## 3. Encryption & Cryptographic Confidentiality

- **Algorithm:** AES-256-GCM (Galois/Counter Mode) authenticated encryption.
- **Confidentiality Guarantee:** Medical documents are encrypted **in memory before transmission**. Only ciphertext bytes are pushed to IPFS. Public gateway visitors without the wrapped key bundle receive only undecipherable binary ciphertext.
- **Key Hierarchy (Envelope Encryption):**
  - `ENCRYPTION_MASTER_KEY`: 64-character (256-bit) hex key securely loaded from backend environment.
  - Per-Record Data Key: 32 cryptographically random bytes (`crypto.randomBytes(32)`), unique per document.
  - Wrapped Key Bundle: `[Key IV (16B) || Key Auth Tag (16B) || Encrypted Data Key (32B)]` stored in `MedicalRecord.encryptionMeta.encryptedKey`.
- **Integrity Tag:** 16-byte GCM authentication tag verifies ciphertext authenticity; any bit modification throws a fatal decryption error (`Unsupported state or unable to authenticate data`).

---

## 4. Supported Formats & File-Size Policy

### 4.1 Supported Medical File Formats
1. **PDF (`application/pdf`)**: Magic bytes `%PDF` (`0x25504446`).
2. **JPEG/JPG (`image/jpeg`, `image/jpg`)**: Magic bytes `0xFFD8FF`.
3. **PNG (`image/png`)**: Magic bytes `0x89504E470D0A1A0A`.

### 4.2 Malicious & Disguised File Rejection
- Magic bytes middleware (`backend/middleware/fileValidator.js`) inspects raw binary headers before processing.
- MIME type spoofing (e.g., shell scripts or executables renamed `.pdf`) is strictly rejected with `HTTP 400`.

### 4.3 File Size Policy
- **Hard Cap:** 10 MB (`10 * 1024 * 1024` bytes) enforced in Multer memory storage and upload routes.
- Small (5 KB), medium (2 MB), and large (8 MB) files are processed cleanly; requests exceeding 10 MB are rejected immediately.

---

## 5. Automated Validation & Test Suite Results

Total Smart Contract & Blockchain Tests: **46 passing**  
Backend Blockchain Integration Tests: **16 passing**  
IPFS, Encryption & Storage Security Tests: **18 passing**  
**Total Stage 5 & 6 Tests: 80 passing (100% success rate)**

```text
  MediChain Stage 6 — IPFS Secure Storage & Medical File Tests
    1. File Type & Magic Bytes Validation
      √ 1.1 Accepts valid PDF file with %PDF magic bytes
      √ 1.2 Accepts valid JPEG file with FFD8FF magic bytes
      √ 1.3 Accepts valid PNG file with 89504E470D0A1A0A magic bytes
      √ 1.4 Rejects executable/script file disguised as PDF (MIME spoofing)
      √ 1.5 Rejects empty or corrupt buffers
    2. AES-256-GCM Encryption Architecture
      √ 2.1 Encrypts and decrypts medical file buffer correctly
      √ 2.2 Detects tampering in encrypted ciphertext via GCM authTag
      √ 2.3 Generates unique IVs and distinct ciphertexts for identical files
    3. IPFS Upload & Content Addressing
      √ 3.1 Computes deterministic CID from encrypted buffer
      √ 3.2 uploadToIPFS returns valid CID, URL, and size metadata
      √ 3.3 getIPFSUrl builds compliant gateway URLs
    4. End-to-End Database Metadata & Access Control
      √ 4.1 Verifies MongoDB schema does not store raw plaintext medical files
      √ 4.2 Authorized doctor with active consent has valid access
      √ 4.3 Unauthorized doctor without consent is rejected
      √ 4.4 Revoking patient consent immediately denies doctor access
    5. File Size Limits & Boundary Validation
      √ 5.1 Valid small file (5 KB) passes limits
      √ 5.2 Valid medium file (2 MB) passes limits
      √ 5.3 Oversized file (11 MB) exceeds 10MB limit

  18 passing (18s)
```

---

## 6. Access Control & Authorization Matrix

| User Role | Target Resource | Authorization Check | Outcome |
|---|---|---|---|
| **Patient** | Own Medical Record Download | `patientId === req.user._id` | ✅ **200 OK** (Decrypted & Delivered) |
| **Doctor (Authorized)** | Patient Record Download | Active `ConsentRecord` or original uploader | ✅ **200 OK** (Decrypted & Delivered) |
| **Doctor (Revoked)** | Patient Record Download | `ConsentRecord.hasActiveConsent === false` | ❌ **403 Forbidden** (`Access denied`) |
| **Doctor (Unconsented)** | Unconsented Patient Record | No consent record | ❌ **403 Forbidden** (`Access denied`) |
| **Anonymous / Unauth** | Any Medical Record | Missing JWT | ❌ **401 Unauthorized** |

---

## 7. Fault Tolerance, Retries & Error Handling

1. **Transient Network Retries:**
   - Exponential backoff retry policy (3 attempts at 1s, 2s, 4s delays) prevents transient upload failures from aborting clinical workflows.
2. **Graceful Degradation:**
   - If the IPFS provider is temporarily unreachable, the upload endpoint returns `HTTP 500` with a controlled error message.
   - Transactions are **never** logged as confirmed or sent to blockchain if the IPFS pinning fails.
3. **Audit Trails:**
   - Every file upload, access grant, successful retrieval, and unauthorized access attempt is logged via `backend/utils/auditLogger.js` with caller IP, user ID, and timestamp.

---

## 8. Data Retention & Immutability Assessment

- **IPFS Storage:** Files pinned on Pinata remain replicated across distributed nodes. Unpinning (`unpinFromIPFS`) is supported for GDPR/HIPAA compliance requests (removes provider pinning; network caches eventually expire).
- **Blockchain Storage:** On-chain CIDs and transaction hashes are permanently immutable.
- **MongoDB Storage:** Supports soft deactivation (`isActive: false`) and audit log TTL auto-expiration (default: 365 days). Plaintext binaries are never stored in MongoDB.

---

## 9. Security Checklist

- [x] **IPFS credentials kept secret in `.env` (ignored by Git)**
- [x] **No live secrets or API tokens committed in repository**
- [x] **All medical files encrypted with AES-256-GCM before storage**
- [x] **Magic byte inspection validates authentic binary types (PDF, JPEG, PNG)**
- [x] **10 MB upload hard cap enforced**
- [x] **Strict consent authorization enforced prior to document decryption**
- [x] **CID presence alone does not grant access (requires decryption master key)**
- [x] **No raw medical PHI stored on-chain or in database**
- [x] **Audit logging captures all access attempts without logging sensitive file data**
- [x] **Bounded exponential backoff handles provider timeouts cleanly**

---

## Conclusion

The IPFS storage layer is securely deployed, hardened with AES-256-GCM envelope encryption, integrated with patient consent enforcement and blockchain anchoring, and validated through comprehensive automated tests.

### READY FOR STAGE 7
