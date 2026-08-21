# MediChain — Product Requirements Document
**Version:** 1.0  
**Date:** 2026-08-20  
**Status:** Draft for Review

---

## 1. PRODUCT DEFINITION

MediChain is a **patient-centric digital healthcare platform** with secure health-record management and AI-assisted clinical decision support.

MediChain is NOT a medical device, diagnostic tool, or autonomous treatment system. It is a platform that:
- Empowers patients to control their health records
- Assists clinicians with decision support information
- Provides medication safety information for professional review
- Recommends hospitals and specialists based on transparent criteria

---

## 2. PRODUCT BOUNDARIES

### What MediChain DOES:
- Securely stores and manages health records
- Manages patient consent for record access
- Verifies health record integrity via blockchain anchoring
- Assists clinical workflows with AI-generated insights
- Provides medication safety information for professional review
- Recommends hospitals and specialists using transparent ranking
- Provides AI risk insights with explainability and disclaimers

### What MediChain DOES NOT:
- Autonomously diagnose conditions
- Autonomously prescribe medication
- Guarantee treatment outcomes
- Guarantee hospital availability or response times
- Guarantee emergency response
- Replace qualified healthcare professionals
- Constitute a regulated medical device without appropriate validation

---

## 3. PLATFORM SEGMENTS

### A. Patient Platform
**Primary user:** Individual patients managing their health records

**Required functionality:**
- Registration with email verification
- Login with secure session management
- Password recovery via email
- Health profile (blood group, allergies, chronic conditions, DOB)
- QR Health ID (portable, scannable emergency summary)
- Medical records viewer with timeline
- Prescription history
- Lab reports
- Document upload and download
- Consent management (grant/revoke doctor access)
- Access history (who viewed records and when)
- Hospital recommendations
- Specialist recommendations
- Drug interaction alerts (informational — requires professional review)
- AI health insights (informational — requires professional review)
- Emergency information configuration
- Notifications (in-app)
- Privacy settings
- Data export
- Account deletion workflow

### B. Doctor Platform
**Primary user:** Licensed medical professionals

**Required functionality:**
- Doctor registration with license number
- Professional verification workflow (admin-reviewed)
- Login and secure session
- Patient search by name/wallet address/QR scan
- Patient identity verification before record access
- Consent verification (must have active consent to access records)
- Medical history review
- Medical timeline viewer
- Prescription entry with drug interaction pre-check
- Clinical AI summary (labeled as decision support)
- AI risk analysis (with explainability, labeled as decision support)
- Drug interaction checker (with evidence source citation)
- Hospital referral generation
- Specialist referral generation
- Access request management
- Emergency access request with documented reason
- Audit history of own actions

### C. Hospital Platform
**Primary user:** Hospital administrators and departments

**Required functionality:**
- Hospital registration with registration number
- Verification workflow (admin-reviewed)
- Department management
- Doctor roster management
- Facility capability management
- Emergency capability configuration
- ICU/bed availability (informational — not real-time guarantee)
- Blood bank information
- Appointment management (basic)
- Patient record management for admitted patients
- Hospital analytics (internal)
- Recommendation profile management
- Location and contact information
- Operating hours
- Data verification status display with last-verified timestamp

**Staleness policy:** Hospital data must display a verification timestamp. Data not verified within 90 days must be labeled as "Unverified — may be outdated."

### D. Administrator Platform
**Primary user:** MediChain system administrators

**Required functionality:**
- User management (view, suspend, delete)
- Doctor verification (approve/reject license verification)
- Hospital verification (approve/reject registration verification)
- Role management
- Audit log viewer with filters
- Security event log
- System health monitoring (API, DB, AI, blockchain, IPFS)
- AI model monitoring (version, metrics, drift status)
- Data quality monitoring
- Hospital data staleness monitoring
- Abuse detection (rate limit violations, repeated failed auth)
- Incident management

### E. Clinical Intelligence Platform
**Primary user:** Backend service — surfaced in Doctor and Patient dashboards

**Components:**
1. **Risk Prediction** — AI-estimated risk scores for common conditions
2. **Explainable AI** — SHAP-based feature importance for all predictions
3. **Drug Interaction Engine** — RxNorm-based medication safety information
4. **Hospital Recommendation Engine** — weighted, transparent ranking algorithm
5. **Specialist Recommendation** — disease-to-specialization mapping
6. **Emergency Risk Assessment** — urgency level estimation
7. **Medical Summary Generation** — automated clinical summaries
8. **Medical Timeline** — chronological health event visualization
9. **Prescription Safety Scoring** — 0–100 safety score with breakdown

**Every AI output MUST contain:**
- Prediction or result
- Confidence level (where applicable)
- Explanation (SHAP or rule-based)
- Data source identification
- Model version and training date
- Output timestamp
- Clinical disclaimer
- Statement that human professional review is required

**Every AI output MUST NOT:**
- Present itself as a confirmed diagnosis
- Autonomously modify any medical records
- Autonomously prescribe medication
- Override a clinician's professional judgment

### F. Platform Infrastructure
- JWT authentication with access + refresh tokens
- Role-based access control (RBAC)
- Blockchain-anchored record integrity
- IPFS encrypted file storage
- MongoDB for off-chain data
- Redis caching
- Audit trail (immutable)
- Consent management
- Rate limiting
- Health and readiness endpoints
- Structured logging
- CI/CD pipeline

---

## 4. NON-FUNCTIONAL REQUIREMENTS

### Security
- All API endpoints authenticated and authorized
- TLS 1.2+ for all communication
- AES-256-GCM encryption for IPFS-stored files
- Bcrypt password hashing (12+ rounds)
- Rate limiting on all endpoints
- Input validation and output encoding
- No secrets in version control
- OWASP ASVS Level 2 compliance target

### Performance
- API response time: P95 < 500ms for reads, < 2s for writes
- AI inference: P95 < 5s for simple predictions, < 30s for OCR pipeline
- Maximum 100 records per page
- Drug interaction check: < 10s total

### Reliability
- Backend: 99.5% uptime target
- Graceful degradation when AI service is unavailable
- Graceful degradation when IPFS is unavailable
- Database: automated backups daily, 30-day retention
- RTO: 4 hours (production), RPO: 1 hour

### Scalability
- Stateless backend (horizontal scaling ready)
- Job queue for AI processing
- CDN for static assets
- Database connection pooling

### Privacy
- Principle of data minimization
- Patient consent required for all record access
- Data export available on request
- Account deletion workflow
- No unnecessary PII in logs
- No PII in blockchain storage

---

## 5. REGULATORY POSITIONING

MediChain is a prototype healthcare platform. Before commercialization:
- A qualified regulatory consultant must assess whether any features constitute Software as a Medical Device (SaMD)
- Specific features (risk prediction, drug interaction engine) may require validation under applicable regulations
- Data storage and processing must comply with applicable healthcare data laws in the target jurisdiction

See /docs/REGULATORY_ASSESSMENT.md for detailed analysis.
