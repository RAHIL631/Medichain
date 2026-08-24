# MediChain — Master Security, Threat Model & Compliance Audit

---

## 1. Security Architecture Matrix

| Security Layer | Implementation Mechanism | Status |
| :--- | :--- | :--- |
| **Transport Layer Security** | HTTPS / TLS 1.3 enforced across Vercel, Render, and MongoDB Atlas | **VERIFIED** |
| **HTTP Security Headers** | Helmet (`X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, HSTS) | **VERIFIED** |
| **Injection Mitigation** | Mongoose schema sanitization, express-mongo-sanitize, XSS-clean | **VERIFIED** |
| **Authentication & Tokens** | JWT with expiration, bcrypt password hashing, token blocklisting | **VERIFIED** |
| **Access Control (RBAC)** | Role-based verification middleware (`patient`, `doctor`, `admin`) | **VERIFIED** |
| **File Storage Security** | Magic byte validation (%PDF, FFD8FF, 89504E) + AES-256-GCM encryption before IPFS | **VERIFIED** |
| **Smart Contract Safety** | Reentrancy protection, modifier access control, array bounds checking | **VERIFIED** |
| **Rate Limiting** | General API limiter + stricter authentication limiter (10 attempts / 15 min) | **VERIFIED** |

---

## 2. Secrets & Git Audit
- `.gitignore` verified across frontend, backend, ai, and blockchain directories.
- No plaintext private keys, seed phrases, or sensitive API keys exposed in committed frontend code.
- Environment variables isolated to `.env` files on backend and AI microservice.
