# Hospital Data Operations

## 1. Freshness Monitoring
*   Hospital profiles contain a `lastVerifiedAt` timestamp.
*   **Alert:** If `lastVerifiedAt` is older than 90 days, the hospital data is flagged as "Stale".

## 2. Stale Data Handling
*   Stale hospitals will no longer appear with a "Verified" badge in the frontend UI.
*   Stale hospitals are penalized in the Hospital Recommendation engine.

## 3. Data Integrity
*   Coordinates (longitude/latitude) must be validated against map bounds.
*   Duplicate hospital registrations (based on Name + Pincode) require manual Admin resolution.
