# Incident Response Plan

## 1. Data Breach / Unauthorized Access
*   **Detect:** WAF alerts, unusual database export spikes, unauthorized logins.
*   **Contain:** Instantly revoke all active JWTs by cycling `JWT_SECRET`. Rotate database credentials.
*   **Recover:** Patch vulnerability. Force password resets for affected users.
*   **Document:** File regulatory reports (HIPAA/DPDPA) within 72 hours.

## 2. Blockchain / Smart Contract Outage
*   **Detect:** High RPC latency, failed transaction logs, contract reverts.
*   **Contain:** Temporarily disable blockchain-dependent routes (Consent management, Uploads) on the backend via feature flags.
*   **Recover:** Switch to fallback RPC provider. If contract is compromised, pause contract (if pausable) and migrate state.
*   **Verify:** Run reconciliation script between MongoDB and Blockchain state.

## 3. IPFS Outage (Pinata)
*   **Detect:** High latency on PDF uploads/downloads, 5xx errors from Pinata.
*   **Contain:** Activate "Degraded Mode" for medical records. Inform users that files are temporarily unavailable. Do NOT claim records are deleted.
*   **Recover:** Await Pinata resolution or fallback to secondary IPFS pinning service (e.g., Infura).

## 4. AI Service Outage
*   **Detect:** `/api/health-risk/predict` returns 500 or times out.
*   **Contain:** Backend gracefully catches error and returns `null` for predictions. Frontend hides AI charts and shows "AI Insights Currently Unavailable".
*   **Recover:** Restart Python containers or scale up resources.
