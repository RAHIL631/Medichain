# Backup Policy

## 1. Database Backups (MongoDB)
*   **RPO (Recovery Point Objective):** 6 hours.
*   **RTO (Recovery Time Objective):** 15 minutes.
*   **Strategy:** 
    *   Incremental backups every 6 hours via MongoDB Atlas or custom `mongodump` cron.
    *   Full snapshot every 24 hours.
*   **Retention:** 30 days hot storage, 7 years cold storage (encrypted Glacier) for compliance.

## 2. Key Management Backups
*   **Encryption Master Key:** Backed up in a geographically isolated physical vault (Hardware Security Module) in split-key format. If this key is lost, all IPFS medical records are permanently inaccessible.

## 3. Blockchain State
*   Blockchain state is decentralized and immutable. However, the backend's synced indexing of transactions (if any) can be rebuilt from the chain by replaying blocks.
