# MediChain — Production Roadmap
**Version:** 1.0  
**Date:** 2026-08-20

---

## Phase 1 — Critical Fixes (Week 1–2) 🔴

**Goal:** Resolve all P0 production blockers. Nothing else proceeds until this phase is complete.

### 1.1 Credential Rotation (Day 1 — IMMEDIATE)
- [ ] Revoke exposed Pinata credentials at https://app.pinata.cloud/keys
- [ ] Generate new Pinata JWT and API keys
- [ ] Generate new JWT_SECRET (64-char hex): `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
- [ ] Generate new JWT_REFRESH_SECRET (different from JWT_SECRET)
- [ ] Update backend/.env with new credentials
- [ ] Verify no credentials remain in git history (`git log -p --all | grep PINATA_JWT`)
- [ ] Consider git history rewrite if secrets still present

### 1.2 Code Bugs Fixed (Already Applied)
- [x] Fixed dead code in `routes/auth.js` register handler — audit event now fires, refreshToken included
- [x] Added request ID middleware to server.js
- [x] Added `/ready` endpoint to server.js
- [x] Removed `req.body` from error handler logs (credential leak fix)
- [x] Added `onlyAuthorizedDoctor` modifier to `addPrescriptionValidation()` in MediChain.sol
- [x] Added pagination to `GET /api/patient/records`
- [x] Created `ai/.env` file

### 1.3 Authorization Fixes
- [ ] Add ConsentRecord verification in `routes/doctor.js` before record access
- [ ] Add magic byte validation for file uploads (alongside MIME type check)
- [ ] Add `JWT_REFRESH_SECRET` to all environment configurations

### 1.4 Environment Hardening
- [x] Hardened `.gitignore` to explicitly exclude all .env files
- [x] Updated `backend/.env` to remove live credentials
- [x] Created `backend/.env.example` with safe documentation
- [x] Updated `docker-compose.yml` with health checks for all services

---

## Phase 2 — Security Hardening (Week 2–3) 🔴

**Goal:** Address all P1 security issues

### 2.1 Authentication Security
- [ ] Implement email verification on registration (send verification link)
- [ ] Implement account lockout after 5 failed login attempts (Redis-based counter)
- [ ] Implement password reset via email (time-limited reset tokens)
- [ ] Add server-side token blocklist for proper logout (Redis-based)
- [ ] Activate `xss-clean` middleware in server.js

### 2.2 File Security
- [ ] Implement magic byte validation for uploaded files
- [ ] Implement AES-256-GCM encryption before IPFS upload
- [ ] Store encryption key reference securely (not in IPFS metadata)
- [ ] Implement file integrity hash verification on retrieval

### 2.3 Access Control
- [ ] Implement ConsentRecord verification in doctor routes
- [ ] Add admin route registration in server.js
- [ ] Test RBAC boundary conditions

---

## Phase 3 — Reliability (Week 3–4) 🟡

**Goal:** Graceful degradation for all external dependencies

### 3.1 External Service Resilience
- [ ] AI service down: return cached or fallback response, not 500 error
- [ ] IPFS/Pinata down: queue upload for retry, return 202 Accepted
- [ ] Blockchain unavailable: allow record management, skip on-chain step, retry later
- [ ] RxNorm API down: return cached interaction data or "service temporarily unavailable"

### 3.2 Retry Logic
- [ ] Implement exponential backoff for Pinata uploads
- [ ] Implement retry for AI service calls with timeout
- [ ] Dead-letter log for failed IPFS uploads

### 3.3 Neo4j
- [ ] Decision: Add Neo4j to docker-compose OR remove all Neo4j references from codebase
- [ ] Remove `config/neo4j.js` and `services/knowledgeGraph.js` if Neo4j is not being deployed

---

## Phase 4 — Data Governance (Week 4–5) 🔴

**Goal:** Address data privacy and governance gaps

### 4.1 IPFS Encryption (Critical)
- [ ] Implement AES-256-GCM encryption in `utils/ipfs.js` before upload
- [ ] Generate per-record encryption key
- [ ] Store key securely (consider AWS KMS, Azure Key Vault, or similar)
- [ ] Implement decryption on retrieval
- [ ] Test integrity verification

### 4.2 Patient Data Rights
- [ ] Implement `GET /api/patient/export` — export all patient data as JSON/PDF
- [ ] Implement `DELETE /api/patient/account` — account deletion workflow
- [ ] Document blockchain limitation (on-chain data cannot be deleted)
- [ ] Remove userEmail from AuditLog (use userId reference only)

### 4.3 Hospital Data Governance
- [ ] Add `lastVerifiedAt` field to Hospital model
- [ ] Add admin endpoint to mark hospital data as verified
- [ ] Implement staleness warning (>90 days since verification)
- [ ] Document all hospital data sources

---

## Phase 5 — AI Hardening (Week 5–6) 🟡

**Goal:** Production-grade AI with governance and disclaimers

### 5.1 Model Governance
- [ ] Record training data source, size, and date for each model
- [ ] Record evaluation metrics (accuracy, AUC, F1, etc.) in model registry
- [ ] Add model version to all AI API responses
- [ ] Add explicit clinical disclaimer to all CDSS outputs

### 5.2 Drug Interaction Safety
- [ ] Cache RxNorm interaction data to reduce API calls
- [ ] Implement fallback for RxNorm API unavailability
- [ ] Add evidence source version to all drug interaction responses
- [ ] Add timestamp of last database/API update to responses

### 5.3 AI Safety Labels
- [ ] Ensure every AI response includes: disclaimer, model version, confidence level
- [ ] Add "This is decision support, not a diagnosis" to all risk prediction outputs
- [ ] Review health assistant responses for diagnostic-sounding language

---

## Phase 6 — Blockchain Hardening (Week 6) 🟡

**Goal:** Production-safe smart contract

### 6.1 Contract Improvements
- [x] Fixed `addPrescriptionValidation()` authorization
- [ ] Implement off-chain patient list or pagination for `getAllPatients()`
- [ ] Evaluate upgradeable proxy pattern (OpenZeppelin Transparent Proxy)
- [ ] Add emergency access reason as an off-chain event log

### 6.2 Formal Audit
- [ ] Run automated security analysis (Slither, Mythril)
- [ ] Fix any findings
- [ ] Engage third-party smart contract auditing firm before mainnet

---

## Phase 7 — Testing (Week 7–8) 🟡

**Goal:** 80%+ test coverage on critical paths

### 7.1 Backend Tests
- [ ] Auth: registration, login, refresh, wallet linking
- [ ] Patient: records CRUD, profile, consent
- [ ] Doctor: upload, patient lookup, access control
- [ ] Hospital recommendation: scoring algorithm
- [ ] AI proxy: timeout handling, error handling
- [ ] Security: injection, IDOR, privilege escalation

### 7.2 Smart Contract Tests
- [ ] Patient registration
- [ ] Access grant/revoke/timed
- [ ] Emergency access workflow
- [ ] Prescription validation authorization
- [ ] getAllPatients() gas limit test

### 7.3 AI Service Tests
- [ ] CDSS pipeline smoke tests
- [ ] Drug interaction API timeout fallback
- [ ] Model loading failure handling

### 7.4 End-to-End Tests
- [ ] Patient registration → QR generation → Doctor scan → Record access
- [ ] Doctor upload → IPFS → Blockchain → Patient view
- [ ] Consent grant → Doctor access → Revoke → Access denied

---

## Phase 8 — Deployment (Week 8–9) 🟡

**Goal:** Production-ready deployment configuration

### 8.1 Environments
- [ ] Create separate dev/staging/production docker-compose files
- [ ] Configure staging environment with real (non-production) data
- [ ] Never use production secrets in development

### 8.2 CI/CD Pipeline
- [ ] Create GitHub Actions workflow
- [ ] Lint check (ESLint, Pylint)
- [ ] Unit tests
- [ ] Integration tests
- [ ] Security audit (npm audit, pip-audit, Slither)
- [ ] Build verification
- [ ] Deploy to staging on merge to main
- [ ] Manual approval gate for production

### 8.3 Secret Management
- [ ] Move all secrets from .env files to a secret manager (AWS Secrets Manager, HashiCorp Vault, or similar)
- [ ] Inject secrets at runtime, not build time

### 8.4 TLS/HTTPS
- [ ] Configure TLS certificates (Let's Encrypt or commercial CA)
- [ ] Configure Nginx/reverse proxy with TLS termination
- [ ] Configure HSTS headers
- [ ] Enforce HTTPS redirect

---

## Phase 9 — Monitoring (Week 9–10) 🟡

**Goal:** Full observability of production system

### 9.1 Structured Logging
- [ ] Replace console.log with Winston/Pino (JSON format)
- [ ] Add log correlation via request ID
- [ ] Ship logs to centralized logging (Elasticsearch/CloudWatch/Datadog)

### 9.2 Metrics
- [ ] API latency (P50, P95, P99)
- [ ] Error rates by endpoint
- [ ] Database query latency
- [ ] AI service latency
- [ ] IPFS upload latency
- [ ] Active users, records created, AI predictions run

### 9.3 Alerts
- [ ] PagerDuty/email alert on: API error rate >5%, DB connection failures, AI service down
- [ ] Security alert on: repeated failed logins, rate limit violations, unusual access patterns

---

## Phase 10 — Launch Preparation 🟢

**Goal:** Final production readiness verification

### 10.1 Pre-Launch Checklist
- [ ] All P0 and P1 issues resolved
- [ ] Security penetration test completed
- [ ] Data Protection Impact Assessment completed
- [ ] Legal review of regulatory positioning
- [ ] Privacy notice published
- [ ] Terms of service published
- [ ] All test suites passing
- [ ] CI/CD pipeline operational
- [ ] Monitoring and alerting operational
- [ ] Backup and restore tested
- [ ] Disaster recovery procedure documented and tested
- [ ] Incident response plan in place
- [ ] On-call rotation defined

### 10.2 Soft Launch
- [ ] Deploy to staging with synthetic data
- [ ] Invite small group of beta users
- [ ] Monitor all metrics for 2 weeks
- [ ] Fix any issues found

### 10.3 Production Launch
- [ ] Deploy to production
- [ ] Monitor closely for 48 hours post-launch
- [ ] Activate full monitoring and alerting
- [ ] Brief on-call team

---

## Timeline Summary

| Phase | Timeline | Priority |
|---|---|---|
| Phase 1: Critical Fixes | Week 1–2 | P0 |
| Phase 2: Security Hardening | Week 2–3 | P0/P1 |
| Phase 3: Reliability | Week 3–4 | P1 |
| Phase 4: Data Governance | Week 4–5 | P0/P1 |
| Phase 5: AI Hardening | Week 5–6 | P1 |
| Phase 6: Blockchain Hardening | Week 6 | P1 |
| Phase 7: Testing | Week 7–8 | P1 |
| Phase 8: Deployment | Week 8–9 | P1 |
| Phase 9: Monitoring | Week 9–10 | P1 |
| Phase 10: Launch | Week 10–12 | P2 |

**Estimated total timeline to production-ready:** 10–12 weeks of focused engineering effort
