# Changelog

All notable changes to the MediChain project will be documented in this file.

## [v1.0.0-rc1] - 2026-08-20
### Added
- **Infrastructure:** Fully containerized setup via `docker-compose.yml` including MongoDB, Redis, Python AI Service, Node.js Backend, React Frontend, and MailHog.
- **Environment Management:** Standardized `.env.example` templates across all microservices for secure secret injection.
- **Disaster Recovery:** Validated Database backup and restore (`BACKUP_RESTORE_TEST.md`).
- **Load Testing:** Simulated baseline performance metrics captured in `STAGING_PERFORMANCE.md`.

### Changed
- **Smart Contracts:** Replaced `getAllPatients()` with `getPatientsPaginated(uint256 offset, uint256 limit)` to prevent out-of-gas errors at scale. Updated corresponding Hardhat unit tests to pass cleanly.
- **Frontend Build:** Resolved ESLint fatal errors (`GlassCard` and `activeSubTab` typos) allowing the React application to generate an optimized production build.

### Security
- **IPFS:** Validated AES-256-GCM encryption on all files before Pinata upload.
- **XSS & NoSQL:** Confirmed that `xss-clean` and `express-mongo-sanitize` middleware are actively filtering payloads.
- **Rate Limiting:** Auth endpoints successfully throttle traffic during spike load tests (triggering HTTP 429).
- **Authentication:** Token blocklisting supported via Redis cache.
