# MediChain — Product UX Audit & Remediation Plan

**Project:** MediChain — Patient-Controlled Healthcare Information Platform  
**Audit Perspective:** First-time patient & physician evaluator  
**Date:** October 20, 2026 (updated after Stage 5 implementation)  
**Focus:** Usability, trust, coherence, task completion, status clarity  

---

## 1. Executive summary

Prior Stage 5 documentation overstated some landing and facility-directory work. A fresh code audit found real strengths (QR privacy notice, wallet-optional register copy, ErrorBoundary) alongside critical trust and safety gaps (false AI “all clear,” fake partner hospitals, fabricated specialist cards).

This plan records findings and marks what was fixed in the October 20 implementation pass.

### Strengths
- Healthcare `hc-*` design tokens on landing/patient/doctor shells
- QR Health ID privacy notice (`QRHealthID.jsx`)
- Wallet optional at registration
- Clear primary routes for records, access, AI tools

### Critical friction (pre-fix)
1. Landing implied partner hospitals (Apollo/Fortis/AIIMS) without partnerships
2. Doctor AIAlert used wrong prop → green “no interactions” while conflicts existed
3. AI drug-check failure fail-opened upload
4. QR / “emergency access” / “decrypt records” messaging confused identification with authorization
5. Fake “On-Chain Licensed” specialists undermined trust
6. No in-app Help route

---

## 2. Surface audit (current)

| Surface | Status after Stage 5 pass | Notes |
|---|---|---|
| Landing `/` | **Improved** | Honest role framing; CTAs to `/register`, `#features`, `/login`; no fake partners |
| Register `/register` | **Good** | Wallet-optional callout retained |
| Login `/login` | **Improved** | Hospital role → `/hospital-dashboard` |
| Patient dashboard | **Improved** | 3-step empty state; QR≠access; no fake patient ID copy; Help link |
| QR Health ID | **Good** | Privacy assurance retained |
| Doctor dashboard | **Improved** | Alert wiring, fail-closed check, honest status labels, workflow tips |
| Admin dashboard | **Partial** | Exists; operational status still needs live probes only |
| Help `/help` | **Added** | In-app guidance for QR, upload, permissions, wallet, AI |
| Status feedback | **Partial** | Clearer upload labels; shared READY→PROCESSING machine still incomplete across all flows |

---

## 3. Prioritized roadmap

### Completed (P1)
1. Remove misleading hospital partnership UI; reframe landing audience section
2. Patient empty-state / quick-start guidance; QR≠access copy
3. Fix AIAlert + drug-check fail-open; require check when meds present
4. Add `/help` and navbar links

### Remaining (P2)
5. Admin health from `/ready` only; optional audit tab if API ready
6. Shared TxStatus for consent + upload on all role surfaces
7. Unify remaining dark CDSS/admin chrome to `hc-*`

### Verification (P3)
8. Manual demo script in `MEDICHAIN_PRODUCT_DEMO.md` with synthetic accounts only
