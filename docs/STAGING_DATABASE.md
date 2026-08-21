# Staging Database Strategy (Phase 5)

## Overview
The staging environment must use a dedicated MongoDB instance (`medichain-mongodb`) that is entirely isolated from production. It must **never** contain real patient Protected Health Information (PHI) or Personally Identifiable Information (PII).

## Data Requirements
*   **Hospitals:** Real-world matching locations for testing geospatial queries, but marked clearly as `[STAGING TEST]` if necessary to distinguish from prod data.
*   **Users (Patients/Doctors):** Must use synthetic profiles.
*   **Records:** Must use safe, non-sensitive sample files (e.g. dummy PDFs).
*   **AI Analytics:** Pre-populated synthetic insights to test dashboard rendering without requiring heavy active AI loads initially.

## Seeding Strategy
A `seed_staging.js` script is provided to safely initialize the staging database with:
1.  A default Admin user.
2.  A verified Hospital in a major metro area.
3.  A verified Doctor linked to that hospital.
4.  A synthetic Patient profile.

## Verification Checklist
- [x] Staging MongoDB is containerized and uses a discrete Docker volume (`mongodb_data`).
- [x] `MONGO_URI` is correctly parameterized.
- [x] No production dump scripts are accidentally mapped to staging init volumes.
