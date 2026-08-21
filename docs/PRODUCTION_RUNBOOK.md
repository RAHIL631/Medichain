# MediChain Production Runbook

## Overview
This runbook details daily operational tasks, deployment procedures, and maintenance instructions for the MediChain platform.

## 1. Daily Health Checks
*   **API Ping:** Verify `GET /health` and `GET /ready` return 200 OK.
*   **Error Logs:** Review Pino JSON logs aggregated in Datadog/ELK for `level: "error"`.
*   **Security Alerts:** Check XSS/Rate limit trigger counts in Redis.
*   **Database Uptime:** Verify MongoDB replica set status (`rs.status()`).

## 2. Weekly Maintenance
*   **Dependency Audit:** Run `npm audit` on backend and frontend. Flag critical CVEs.
*   **Backup Verification:** Ensure automated S3 backups are running and within correct byte sizes.
*   **AI Inference Drift:** Review `AI_OPERATIONS.md` anomaly detection reports.

## 3. Safe Deployment Procedure (Zero Downtime)
1.  Verify tests pass on CI/CD (GitHub Actions).
2.  Build new Docker images and tag with semantic version (`v1.0.x`).
3.  Deploy to Staging. Run smoke tests.
4.  Execute Blue/Green deployment on production cluster.
5.  Wait for Health Checks to clear before draining connections from Blue instances.

## 4. Emergency Halt
If a critical breach or data corruption is detected:
1.  Take the frontend offline (Serve 503 Maintenance Page via CDN/WAF).
2.  Block all writes to MongoDB.
3.  Revoke compromised JWT secrets in `.env.prod`.
4.  Initiate `INCIDENT_RESPONSE.md` protocol.
