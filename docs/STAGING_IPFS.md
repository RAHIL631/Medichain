# IPFS Staging Protocol (Phase 7)

## 1. Gateway & Provider
*   **Provider:** Pinata IPFS Gateway
*   **Security:** AES-256-GCM encryption is actively enforced on all medical record uploads before they reach the IPFS network.

## 2. Testing Scenarios Validated
*   **PDF/Image Upload:** Validated `multer` parsing and Magic Byte validation.
*   **Encryption Integrity:** Files uploaded to IPFS are verified as encrypted ciphertext.
*   **Decryption Streaming:** Authenticated `GET /api/patient/records/:recordId/download` successfully proxies the CID, decrypts it in-memory, and returns the original plaintext file.
*   **Network Resilience:** Exponential backoff retry logic is enabled to handle Pinata rate limits.
*   **Failure Handling:** Unauthorized requests to the download endpoint are blocked (HTTP 403).

## 3. Deployment Configuration
*   Staging environment requires real or dedicated staging credentials:
    *   `PINATA_JWT`
    *   `PINATA_GATEWAY`
*   No unencrypted medical data is exposed on the public IPFS network.
