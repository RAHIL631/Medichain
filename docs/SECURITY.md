# MediChain — Security Documentation
**Version:** 2.0  
**Date:** 2026-08-20  
**Standard:** OWASP ASVS Level 2 (Target)

---

## CRITICAL SECURITY NOTICE

> **Credentials Exposed in Git History**  
> The file `backend/.env` was previously committed to the git repository with live Pinata JWT, Pinata API key, Pinata secret key, and a JWT_SECRET.  
> **ALL of these credentials must be immediately rotated.**  
>
> Actions required:
> 1. Go to https://app.pinata.cloud/keys — revoke/delete the exposed key
> 2. Generate new Pinata credentials and update backend/.env
> 3. Generate new JWT_SECRET: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
> 4. Generate new JWT_REFRESH_SECRET (must be different from JWT_SECRET)
> 5. Consider the git history permanently compromised — treat all historical secrets as public

---

## 1. Authentication Architecture

### JWT Token Strategy
- **Access Token:** 24-hour expiry, signed with JWT_SECRET (HS256)
- **Refresh Token:** 30-day expiry, signed with JWT_REFRESH_SECRET (must be different)
- Both tokens contain: `{ id: userId, role: userRole }`
- Access token verified on every protected request

### Password Policy
- Minimum 8 characters
- Must contain: uppercase letter, number, special character (!@#$%^&*)
- Hashed with bcrypt (12 salt rounds)
- Never stored in plain text
- Never returned in API responses (schema `select: false`)

### Session Management
- Tokens stored client-side (localStorage or httpOnly cookies)
- No server-side session state (stateless JWT)
- Logout is client-side token deletion
- **Known Gap:** No server-side token blocklist. Future implementation needed.

### Missing (Required Before Production)
- [ ] Email verification on registration
- [ ] Account lockout after N failed login attempts
- [ ] Password reset via email
- [ ] Server-side token revocation list

---

## 2. Authorization Model

### Roles
| Role | Description |
|---|---|
| `patient` | Can access own records, manage consent, view AI insights |
| `doctor` | Can access patient records with consent, upload records, run CDSS |
| `hospital` | Can manage facility data, upload reports for admitted patients |
| `admin` | Full platform management, audit log access, verification |

### Route Protection
- `protect` middleware: verifies JWT, confirms user still exists in DB
- `authorize(...roles)` middleware: checks req.user.role against allowed roles
- Applied at the router level (all routes in a file require same auth)

### Consent Enforcement
- `ConsentRecord` model tracks patient-to-doctor access grants
- **Current Status:** Model implemented, but doctor routes do not yet verify ConsentRecord before record access
- **Required Fix:** Add `ConsentRecord.hasActiveConsent(patientId, doctorId)` check in doctor.js routes

---

## 3. Input Validation

### Backend Validation (express-validator)
- Registration: name, email, password, role, optional patient/doctor fields
- Login: email, password with length limits
- Wallet address: Ethereum address format validation
- File uploads: MIME type allowlist (PDF, JPEG, PNG), 10MB size limit

### Known Gaps
- File MIME type validation is header-based only — magic byte validation not implemented
- Some routes lack comprehensive input validation

### MongoDB Injection Prevention
- Custom NoSQL injection sanitizer strips keys starting with `$` or containing `.`
- Mongoose schema types provide implicit type validation

### XSS Prevention  
- `helmet` sets Content-Security-Policy headers
- `express-validator` `.escape()` on text inputs
- `xss-clean` package installed but not yet applied in server.js — needs activation

---

## 4. File Security

### Upload Controls
| Check | Status |
|---|---|
| MIME type allowlist | ✅ Implemented (PDF, JPEG, PNG only) |
| File size limit (10MB) | ✅ Implemented |
| Memory storage (no disk write) | ✅ Implemented |
| Magic byte validation | ❌ NOT implemented |
| Virus/malware scanning | ❌ NOT implemented |
| File content encryption | ❌ NOT implemented |
| Integrity hash | ❌ NOT implemented |

### Required Before Production
Files must be encrypted with AES-256-GCM before upload to IPFS. The encryption key must be stored securely (per-patient, key management service), not embedded in the IPFS metadata.

---

## 5. IPFS Storage Security

### Current State
- Files are uploaded to Pinata (public IPFS gateway)
- CIDs are public — anyone with a CID can retrieve the file
- No encryption before upload

### Required
- Encrypt all medical files with AES-256-GCM before upload
- Store file hash for integrity verification
- Implement retention and deletion policy (IPFS pinning management)
- Document that IPFS CIDs are stored on-chain (discoverable)

---

## 6. Blockchain Security

### Smart Contract: MediChain.sol v2.0

**Access Control:**
- `onlyRegisteredPatient` — protects patient-only operations
- `patientMustExist` — validates patient address before operations  
- `onlyAuthorizedDoctor` — checks permanent or time-limited access grant

**Security Fixes Applied (2026-08-20):**
- `addPrescriptionValidation()` — added `onlyAuthorizedDoctor` modifier (was unauthenticated)

**Remaining Risks:**
- `getAllPatients()` — returns unbounded array, potential gas exhaustion
- No upgradeable proxy — bugs cannot be patched post-deployment
- Emergency access reason not logged on-chain

---

## 7. HTTP Security Headers

Applied via `helmet` (default configuration):

| Header | Status |
|---|---|
| X-Content-Type-Options: nosniff | ✅ |
| X-Frame-Options: SAMEORIGIN | ✅ |
| X-XSS-Protection: 0 | ✅ (disabled per modern spec) |
| Strict-Transport-Security (HSTS) | ✅ (production only) |
| Content-Security-Policy | ✅ (default, may need customization) |
| Referrer-Policy | ✅ |
| Permissions-Policy | ✅ |

---

## 8. Rate Limiting

| Endpoint Group | Limit | Window |
|---|---|---|
| All /api/* | 100 requests | 15 minutes per IP |
| /api/auth/* | 10 requests (prod) / 100 (dev) | 15 minutes per IP |

---

## 9. Audit Logging

All API requests touching `/api/*` are logged to the `AuditLog` MongoDB collection:
- User ID, role, email
- Method, path, IP address, user agent
- Status code, response time
- Action label (inferred or explicit)

Audit logs are immutable (pre-save hook rejects updates).
TTL index auto-deletes logs after 365 days (configurable via `AUDIT_LOG_TTL_DAYS`).

---

## 10. OWASP Top 10 Assessment (2021)

| Risk | Status | Notes |
|---|---|---|
| A01 Broken Access Control | Partial | RBAC implemented; ConsentRecord not yet enforced in doctor routes |
| A02 Cryptographic Failures | Partial | bcrypt passwords; TLS not configured; IPFS unencrypted |
| A03 Injection | Partial | NoSQL sanitization; magic byte validation missing |
| A04 Insecure Design | Medium | No email verification; no account lockout |
| A05 Security Misconfiguration | High | Live secrets in git history |
| A06 Vulnerable Components | Unknown | npm audit not confirmed run |
| A07 Auth & Session Failures | Partial | JWT implemented; no token revocation |
| A08 Software Integrity Failures | Low | Docker images not pinned |
| A09 Logging Failures | Partial | Audit logs exist; no structured JSON logging in production |
| A10 SSRF | Low | AI proxy makes internal calls; no external URL validation |

---

## 11. Security Checklist Before Production

- [ ] Rotate all credentials exposed in git history
- [ ] Set strong unique JWT_SECRET and JWT_REFRESH_SECRET
- [ ] Enable email verification on registration
- [ ] Implement account lockout after failed logins
- [ ] Implement password reset flow
- [ ] Add magic byte file validation
- [ ] Implement AES-256-GCM file encryption before IPFS
- [ ] Enforce ConsentRecord verification in doctor routes
- [ ] Run `npm audit` and remediate high severity findings
- [ ] Configure TLS/HTTPS in production
- [ ] Configure Content-Security-Policy for frontend
- [ ] Enable xss-clean middleware
- [ ] Add server-side token blocklist for logout
- [ ] Perform penetration testing before launch
