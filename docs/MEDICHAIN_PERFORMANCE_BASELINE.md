# MediChain Performance Baseline

**Status:** Local baseline; not a production certification
**Measurement scope:** Patient dashboard initial records/count flow and local frontend build

## Environment and method

- Local Windows development environment; Node.js v24.11.0.
- Backend requests were exercised with Supertest against the Express application and MongoMemoryServer, populated with 100 synthetic records.
- Thirty dashboard-flow samples were measured. Each baseline sample issued two concurrent API requests: the patient records endpoint (limited to five records) and the patient statistics endpoint.
- A separate MongoMemoryServer explain check inspected the patient-record listing query.
- Frontend measurements came from a successful Create React App production build. Bundle sizes are build artifacts, not browser download or rendering timings.
- No real patient data, live database, external IPFS service, blockchain RPC, or AI inference service was involved.

## Results before optimization

| Measurement | Baseline |
|---|---:|
| Dashboard requests per load | 2 |
| Dashboard flow latency, p50 (30 samples) | 38.2621 ms |
| Dashboard flow latency, p95 (30 samples) | 78.7576 ms |
| Dashboard flow latency, p99 (30 samples) | 86.5836 ms |
| Production entry JavaScript | 190.5 kB gzip |
| Generated JavaScript assets | 55 files; 2,445,008 raw bytes |
| Generated CSS assets | 98,565 raw bytes |
| Patient records query explain | Index scan; 5 keys and 5 documents examined; no in-memory sort; 4 ms reported execution time |

The record-listing query was already supported by compound indexes on patient, active state, and creation time. No baseline evidence justified adding another index. Route-level lazy loading was also already present.

## Interpretation and limits

The latency samples are local request-flow measurements, not browser, network, production, or concurrent-user measurements. The p95/p99 estimates use only 30 samples and should be treated as preliminary. The query explain result describes only the synthetic in-memory database.

Browser LCP/INP/CLS, mobile rendering, live database plans, production API performance and capacity, CPU/memory utilization, AI inference, IPFS upload/retrieval, blockchain RPC, and transaction confirmation were **NOT MEASURED**. Historical staging and production reports in the repository were not treated as reproduced evidence.
