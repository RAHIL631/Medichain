# MediChain Staging Audit (Phase 0)

**Date:** 2026-08-20  
**Target:** v1.0.0-rc1 Staging Release  

## 1. Architecture Overview
*   **Frontend Framework:** React 18 (Create React App) + Tailwind CSS, Ethers.js
*   **Backend Framework:** Node.js (Express), Mongoose, Redis, Pino (JSON logging)
*   **Database:** MongoDB 6.0
*   **Caching/Session:** Redis 7.0
*   **AI Framework:** Python (Flask), Scikit-learn, XGBoost, LightGBM, CatBoost, SHAP
*   **Blockchain Framework:** Hardhat (Ethereum EVM)
*   **Smart Contract Framework:** Solidity (`MediChain.sol`)
*   **IPFS Provider:** Pinata (AES-256-GCM encryption enabled)
*   **Deployment Configuration:** `docker-compose.yml` (multi-container)
*   **Testing Setup:** Jest (Backend), React Testing Library (Frontend), Hardhat/Chai (Blockchain)

## 2. Current Deployment Status
*   The system uses `docker-compose.yml` defining `mongodb`, `redis`, `ai`, `backend`, and `frontend` services.
*   Production-like settings are applied (`NODE_ENV=production`, JSON logging, XSS sanitization, rate limiting).
*   Health check endpoints (`/health`) exist and are integrated into Docker compose dependencies.

## 3. Environment Variable Requirements
A staging environment requires the following secret categories (currently partially mocked or absent):
*   **Databases:** `MONGO_URI`, `REDIS_URL`
*   **Auth:** `JWT_SECRET`, `JWT_REFRESH_SECRET`
*   **Blockchain:** `BLOCKCHAIN_RPC_URL` (local or testnet), `PRIVATE_KEY`, `CONTRACT_ADDRESS`
*   **Encryption:** `ENCRYPTION_MASTER_KEY` (AES-256-GCM)
*   **IPFS:** `PINATA_JWT` or `PINATA_API_KEY`/`PINATA_SECRET_KEY`
*   **Email:** `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`

## 4. Security Risks & Mitigation Status
*   **IPFS File Security:** Resolved (AES-256-GCM encryption implemented).
*   **File Magic Byte Check:** Resolved.
*   **Smart Contract Gas Limit:** Resolved (Pagination added).
*   **XSS & Brute Force:** Resolved (`xss-clean` and account lockout via Redis).
*   **Secret Management:** Secrets must not be committed to Git. A secure injection method or `.env.staging` is required.

## 5. Deployment Blockers
*   **Blockchain State:** The smart contract must be deployed to the local/staging network, and the resulting `CONTRACT_ADDRESS` must be injected into the backend and frontend configurations at build/run time.
*   **Email Gateway:** Staging requires a functioning SMTP server or a local trap (e.g. MailHog) to test registration workflows.
*   **Pinata Keys:** Staging requires valid Pinata credentials for IPFS integration.
*   **Database Seeding:** A synthetic database seed script is required to populate Hospitals, test Doctors, and synthetic Patients without using real PII.

## 6. Testing Blockers
*   No automated E2E testing framework (e.g. Cypress or Playwright) is currently configured in `package.json`. End-to-end testing must be performed manually according to Phase 12, or a testing harness must be introduced.
*   We need to verify that `npm test` successfully executes the Jest suites across all packages.
