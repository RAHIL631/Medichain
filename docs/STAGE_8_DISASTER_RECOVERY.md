# MediChain — Stage 8 Disaster Recovery Plan

**Date:** 2026-08-22  
**Classification:** Operational Security & High Availability  

---

## 1. Disaster Scenarios & Recovery Runbooks

### Scenario A: Primary Backend Server Failure (Node.js Process Crash / VM Failure)
1. **Automated Recovery:** PM2 / Systemd process supervisor automatically restarts the Express instance within 2 seconds.
2. **Cluster Health Check:** Load balancer reroutes incoming traffic to healthy instances if using multi-instance cluster.
3. **Log Analysis:** Query centralized logs / `winston` logs for unhandled exceptions.

### Scenario B: Database Outage / MongoDB Connection Loss
1. **Graceful Fail-Open / Reconnect:** Mongoose driver automatically retries connection (`config/db.js` reconnection listeners).
2. **Readiness Probe:** `/ready` endpoint immediately reports `503 Service Unavailable` to upstream gateways, preventing corrupt writes.
3. **Database Restore:** Restore from the latest hourly dump (`mongorestore`) if unrecoverable data corruption occurs.

### Scenario C: AI Microservice Down / Network Partition
1. **Fallback Behavior:** Backend routes proxying to `/api/ai` return structured fallback responses with clear user-facing notices that AI features are temporarily offline.
2. **Core Medical Functions Unaffected:** Patient registration, QR verification, record upload/download, and access control operate independently of the AI microservice.

### Scenario D: Ethereum RPC Provider Failure
1. **Fail-Open Read Mitigation:** `blockchainService.js` catches RPC disconnects and serves off-chain verified metadata from MongoDB.
2. **Transaction Queueing:** Web3 client alerts the user to retry when RPC returns or allows switching to alternative RPC node.

### Scenario E: IPFS Gateway Degraded / Unreachable
1. **Retry Mechanism:** Pinata SDK retries up to 3 times with exponential backoff (1s, 2s, 4s).
2. **Controlled Failure:** Upload route safely rolls back without saving invalid CIDs to MongoDB or blockchain.

---

## 2. Emergency Contacts & Escalation Matrix

| Role | Responsibility | Escalation Path |
|---|---|---|
| **DevOps / SRE Lead** | Infrastructure & PM2 / Docker Orchestration | Level 1 Alert (PagerDuty / Slack) |
| **Database Administrator** | MongoDB Backups & Replication Clusters | Level 2 Alert |
| **Security Officer** | Key Rotation & Breach Investigation | Emergency Hot-line |
