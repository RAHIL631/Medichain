# MediChain Fast-Access Performance Report

**Outcome:** OPTIMIZED WITH LIMITATIONS
**Scope:** Patient dashboard first view: recent records and the active-record count.

## Summary

The patient dashboard previously made separate, concurrent requests for its recent-record list and its record-count statistics. The records endpoint already returns a paginated list and the matching total, so the second request duplicated dashboard data retrieval. The dashboard now requests at most five records once and uses the response's `total` for its count tile.

In a local synthetic test (100 records, 30 loads), the number of API calls per dashboard load fell from two to one. Measured flow latency fell by 43.6% at p50, 45.4% at p95, and 18.0% at p99. This is evidence of improvement for that local test flow only, not a production or browser-performance result.

## What changed

- The patient dashboard uses one `GET /api/patient/records?limit=5` request for the visible recent records and total count.
- The list remains limited to five; all-record navigation remains available.
- A request failure is shown explicitly. The count is shown as unavailable instead of a false zero, and the recent-record panel does not present the failure as an empty account.
- The patient route's existing pagination, authorization, and response shape were reused. No authorization policy, database schema, index, or external-service behavior was changed.
- Added frontend and backend regression coverage for the one-request behavior, returned total, pagination, and error display.

## Before and after

| Metric | Baseline | Optimized | Difference |
|---|---:|---:|---:|
| API requests per dashboard load | 2 | 1 | 50% fewer |
| Dashboard flow p50, 30 samples | 38.2621 ms | 21.5966 ms | -43.6% |
| Dashboard flow p95, 30 samples | 78.7576 ms | 43.0398 ms | -45.4% |
| Dashboard flow p99, 30 samples | 86.5836 ms | 71.0186 ms | -18.0% |
| Production entry bundle | 190.5 kB gzip | 190.5 kB gzip | Effectively unchanged |

### Test setup

The flow measurements ran locally against the Express application using Supertest and MongoMemoryServer with 100 synthetic records. Each flow measurement represents 30 sequential measured loads; the baseline made two concurrent endpoint requests per load and the optimized version made one. The measurements are from separate runs, not a controlled simultaneous comparison. No live users or patient information were used.

The local patient-record query explain used an index, examined five keys and five documents, did not require an in-memory sort, and reported 4 ms execution time. Existing compound indexes already covered the query; no index change was warranted.

## Validation

- Backend: 5 Jest suites and 74 tests passed.
- Frontend: 2 Jest suites and 3 tests passed.
- Frontend optimized production build: successful.
- `git diff --check`: passed.

The generated JavaScript aggregate measured 2,445,008 raw bytes across 55 files before and 2,438,678 bytes across 39 files after; because the asset counts differ, this aggregate is not a strong apples-to-apples size comparison. CSS remained 98,565 raw bytes. No additional route splitting was attempted because lazy route loading already existed.

## Limitations and follow-up

These results do not measure the browser/network experience or production infrastructure. Browser LCP/INP/CLS, visual/mobile behavior, deployed API latency and throughput, live database plans, server CPU/memory, AI inference, IPFS operations, blockchain RPC, and transaction confirmation are **NOT MEASURED**. Historical staging/production reports in the repository were not independently reproduced and are not evidence for these results.

For deployment decisions, repeat measurements in a representative staging environment with realistic data volume and concurrent users; separately capture browser-based Core Web Vitals and measure external AI, IPFS, and blockchain operations. The current outcome is **OPTIMIZED WITH LIMITATIONS**, not a production performance certification.
