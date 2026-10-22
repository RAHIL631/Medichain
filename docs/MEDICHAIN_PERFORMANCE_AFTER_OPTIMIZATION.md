# MediChain Performance After Optimization

**Status:** Local verification complete; production performance remains unverified
**Optimization:** Use the patient records response for both the recent-record list and record-count tile, rather than making a separate statistics request.

## Comparable local dashboard-flow results

Both runs used 100 synthetic records in MongoMemoryServer and 30 measured dashboard loads. The baseline issued two concurrent API requests per load; the optimized flow issued one request, `GET /api/patient/records?limit=5`. Percentages are calculated relative to baseline.

| Measure | Before | After | Change |
|---|---:|---:|---:|
| API requests per dashboard load | 2 | 1 | 50% fewer |
| Flow latency p50 | 38.2621 ms | 21.5966 ms | 16.6655 ms lower (43.6%) |
| Flow latency p95 | 78.7576 ms | 43.0398 ms | 35.7178 ms lower (45.4%) |
| Flow latency p99 | 86.5836 ms | 71.0186 ms | 15.5650 ms lower (18.0%) |

These are separate local runs, not a concurrent-user experiment. Supertest and an in-memory database exclude real network and deployed infrastructure effects; 30 samples also make tail percentiles preliminary.

## Frontend production build

| Measure | Before | After | Notes |
|---|---:|---:|---|
| Entry JavaScript, gzip | 190.5 kB | 190.5 kB | No meaningful change at the build output's displayed precision |
| Generated JavaScript, raw | 2,445,008 bytes across 55 files | 2,438,678 bytes across 39 files | The aggregate is slightly smaller, but the asset count differs; treat this aggregate comparison cautiously |
| Generated CSS, raw | 98,565 bytes | 98,565 bytes | Unchanged |
| Build | Successful | Successful | Both are local optimized CRA builds |

The frontend build itself was not the optimization target; the measured change is the dashboard request flow. Build sizes do not establish real download, parse, or render time.

## Verification

- Frontend Jest: 2 suites passed, 3 tests passed, including coverage that the dashboard sends one limited request, displays the returned total and records, and presents an explicit error rather than an empty-record state when loading fails.
- Backend Jest: 5 suites passed, 74 tests passed, including the paginated patient-record response test (five returned records, total seven, two pages).
- Production frontend build: compiled successfully.
- `git diff --check`: passed.

## Not measured

Real browser LCP/INP/CLS, mobile devices, deployed API/network latency, concurrent-user throughput, production database query plans and utilization, CPU/memory, AI inference, IPFS, blockchain RPC, and transaction confirmation remain **NOT MEASURED**. No claim about production readiness or production capacity follows from these local results.
