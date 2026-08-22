# MediChain Database Deployment and Configuration Guide

This document describes the database design, configuration, scaling, and migration strategies for MongoDB and Redis in the MediChain platform.

---

## 1. Architecture Overview

MediChain uses a hybrid data strategy:
- **Off-Chain Database (MongoDB):** Stores user profiles (patients, doctors, hospitals, admins), medical record metadata (CIDs, MIME types, file sizes, on-chain transaction hashes), consent records, audit logs, and CDSS safety reports.
- **In-Memory Cache & Lockout (Redis):** Handles session tokens, distributed locks, rate limiting, and brute-force account lockout tracking.

---

## 2. MongoDB Configuration

### Connection Pool & Scaling
Mongoose is configured in [`backend/config/db.js`](file:///c:/Users/Rahil%20hassan/OneDrive/Desktop/Major%20project/MediChain/backend/config/db.js) with production-ready connection options:
- **`maxPoolSize`:** `10` (default, supports up to 10 parallel connections per service instance. Increase to `50` or `100` for high-throughput production clusters).
- **`serverSelectionTimeoutMS`:** `5000` (Fails fast within 5 seconds if MongoDB is unreachable on startup, facilitating rapid container restarts).
- **`socketTimeoutMS`:** `45000` (Terminates idle sockets after 45 seconds to prevent connection leaks).

### Failover & Reconnection
- Mongoose automatically manages reconnections after the initial connection is established.
- Reconnection event listeners print alerts to structured logs (`pino-http`) on `disconnected`, `reconnected`, or `error` events.

---

## 3. Schema Indexes and Optimizations

All queries utilize appropriate indexes to ensure sub-second response times:

### User Collection (`User.js`)
- `email` (Unique, index: true) - Fast login lookup.
- `walletAddress` (Unique, sparse: true) - Required for Ethereum address resolution.

### MedicalRecord Collection (`MedicalRecord.js`)
- `patientId` (Index) - Fast loading of patient dashboards.
- `doctorId` (Index) - Fetching doctor upload histories.
- `patientWalletAddress` (Index) - Wallet lookup compatibility.
- `isActive` (Index) - Filter out deleted or archived records.

### ConsentRecord Collection (`ConsentRecord.js`)
- **Compound Indexes:**
  - `{ patientId: 1, granteeId: 1, status: 1 }` - Fast verification of active doctor consent.
  - `{ patientId: 1, status: 1, createdAt: -1 }` - Access history sorting.
- **TTL Index:**
  - `{ expiresAt: 1 }` with `expireAfterSeconds: 0` and `partialFilterExpression: { status: 'active' }`. Active consents automatically expire and transition to expired on-disk when they exceed `expiresAt`.

---

## 4. Database Security & Compliance

### Encryption at Rest
- In staging/production environments, MongoDB Atlas or self-hosted MongoDB Enterprise must have **WiredTiger Encryption at Rest** enabled using AES-256 keys.
- Sensitive text values (e.g. user details, patient logs) are protected.

### Field-Level Encryption
- For ultra-high compliance (HIPAA / GDPR), personal identifiers (PII) like names and emails should be encrypted before saving to the database using Mongoose middleware hooks or client-side field-level encryption.

---

## 5. Seed Strategy

To populate staging or local production-like environments:
1. **Hospital Directory Seed:**
   ```bash
   node backend/scripts/seedHospitals.js
   ```
2. **Staging / Test Data Setup:**
   ```bash
   node backend/scripts/seed_staging.js
   ```
