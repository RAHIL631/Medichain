# MediChain — Master Bug Fix & Resolution Report

### Summary of Issues Diagnosed and Resolved

---

### Issue 1: QR Scanner Camera Stream Lifecycle Timing
- **ID**: `FIX-01`
- **Severity**: `P1` (High)
- **Component**: `frontend/src/components/QRScanner.jsx`
- **Root Cause**: React conditionally rendered `<video ref={videoRef}>` only when `status === 'active'`. During `startCamera()`, ZXing's `decodeFromConstraints` was called immediately before React mounted the `<video>` element, leaving `videoRef.current` as `null` and failing to display live camera preview.
- **Fix**: Rendered `<video ref={videoRef}>` continuously across `requesting`, `active`, and `verifying` states, attached `stream` to `videoRef.current.srcObject`, verified `videoWidth > 0 && videoHeight > 0`, and then initiated continuous decoding with `reader.decodeFromVideoElementContinuously`.
- **Retest Result**: **PASS** — Live preview displays on mobile and desktop webcams; camera tracks cleanly terminate on unmount/cancel.

---

### Issue 2: AI Microservice Root Route Missing (`GET / 404`)
- **ID**: `FIX-02`
- **Severity**: `P2` (Medium)
- **Component**: `ai/routes/health.py`
- **Root Cause**: Cloud health checkers and uptime monitors sending `GET /` received HTTP 404 because the Flask app only registered `/health`, `/readiness`, and specific CDSS endpoints.
- **Fix**: Added `@health_bp.route('/', methods=['GET'])` endpoint returning HTTP 200 with service metadata and online status.
- **Retest Result**: **PASS** — Returns HTTP 200 OK (`status: 'online'`).

---

### Issue 3: Backend Blockchain Test Provider Polling
- **ID**: `FIX-03`
- **Severity**: `P2` (Medium)
- **Component**: `backend/tests/blockchain.test.js`
- **Root Cause**: Ethers v6 `JsonRpcProvider` instantiated without `staticNetwork: true` initiated background `detectNetwork` retry loops when running in offline/mock test mode, causing test runners to hang.
- **Fix**: Configured `new ethers.JsonRpcProvider(url, undefined, { staticNetwork: true })` in test suites.
- **Retest Result**: **PASS** — 5/5 test suites completed and exited cleanly.
