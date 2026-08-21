# MediChain Release Candidate Report (v1.0.0-rc1)

## 1. Release Summary
**Version:** v1.0.0-rc1
**Date:** 2026-08-20
**Status:** **APPROVED FOR STAGING DEPLOYMENT**

The MediChain platform has successfully cleared all pre-deployment validation gates. The system integrates secure Electronic Health Records on MongoDB, IPFS AES-256-GCM decentralized storage, and Ethereum-based RBAC via smart contracts, bolstered by an AI Clinical Decision Support System.

## 2. Validation Gates Cleared
- [x] **Smart Contract Audit:** Pagination bugs fixed (`getPatientsPaginated`). 100% test pass rate.
- [x] **Security Scans:** XSS filters, NoSQL injection prevention, and Rate Limiting verified.
- [x] **IPFS Storage:** End-to-end AES-256-GCM encryption pipeline verified.
- [x] **AI Services:** XGBoost, LightGBM, and CatBoost APIs respond within SLA (<500ms).
- [x] **Performance Load Test:** Passed simulated 250 concurrent user spike test.
- [x] **Disaster Recovery:** `mongodump` simulated backup and restore validated (RTO < 2m).
- [x] **Frontend Build:** Optimized React production build generated cleanly without fatal ESLint errors.

## 3. Known Limitations (To be addressed in RC2/GA)
1.  **AI Latency under extreme load:** The Python Flask server runs in synchronous mode natively. We recommend running `gunicorn` with multiple workers in the final production cluster.
2.  **Pinata Rate Limits:** Heavy bursts of concurrent IPFS uploads may hit Pinata API limits. Exponential backoff handles this gracefully, but users may experience delayed uploads.

## 4. Deployment Instructions
The operations team should execute the following command sequence on the staging server:

```bash
git checkout staging
docker-compose --env-file ./backend/.env up -d --build
```
