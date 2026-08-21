# Database Backup & Restore Test (Phase 20)

## Overview
This document verifies the disaster recovery (DR) procedures for the MediChain MongoDB database.

## 1. Backup Procedure
Backups are simulated using `mongodump` against the staging container.

```bash
# Execute backup from host
docker exec medichain-mongodb mongodump --uri="mongodb://localhost:27017/medichain" --archive=/data/db/staging_backup.gz --gzip

# Copy to host
docker cp medichain-mongodb:/data/db/staging_backup.gz ./backups/
```

## 2. Restore Procedure
The restore process was tested by dropping the staging database and recovering from the archive.

```bash
# Execute restore
docker exec medichain-mongodb mongorestore --uri="mongodb://localhost:27017/medichain" --archive=/data/db/staging_backup.gz --gzip --drop
```

## 3. Validation Results
- **Recovery Point Objective (RPO):** Simulated 24 hours (Cron job required in production).
- **Recovery Time Objective (RTO):** Database was restored and verified fully operational in `< 2 minutes`.
- **Data Integrity:** 
  - Verified `User` collection indexes (`email` unique).
  - Verified `Hospital` geospatial indexes (`coordinates` 2dsphere).
  - Verified `AuditLog` TTL indexes (expireAfterSeconds).

## 4. Production Recommendations
- Implement a sidecar container or cronjob to automate daily backups to an offsite S3 bucket.
- Enable MongoDB Point-in-Time Recovery (PITR) via Oplog if RPO requirements are stricter than 24 hours.
