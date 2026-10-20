# MediChain — Product UX Audit & Remediation Plan

**Project:** MediChain — Patient-Controlled Healthcare Information Platform  
**Audit Perspective:** First-Time Patient & Physician Evaluator  
**Date:** October 2026  
**Focus:** Usability, Trust, Coherence, Task Completion, and Status Clarity  

---

## 1. Executive Summary of UX Findings

A systematic inspection of the existing frontend user journeys revealed that while the underlying microservices and cryptographic mechanisms are robust, certain presentation elements, status notifications, and guidance patterns can be improved to transform the system into an intuitive, polished product.

### Key Strengths Observed
- **Design Token Discipline:** Clean healthcare color tokens (`hc-blue`, `hc-teal`, `hc-surface`, `hc-text`) with modern card layouts.
- **Mobile-First Layouts:** Dynamic grids collapse into stacked vertical cards on mobile screens (`< 640px`).
- **QR Identity Architecture:** High-density QR rendering with off-screen canvas PNG export is clean and functional.
- **AI Decision Support Alerts:** Explicit non-autonomous clinical disclaimers and high-severity interaction badges.

### Primary Friction Points & Gaps Identified
1. **Landing Page Claims Clarity:** The landing page previously featured "Partner Hospitals" with commercial brand names (Apollo, Fortis, AIIMS), which risked misinterpretation as unverified commercial partnerships rather than regional reference facilities for the hospital recommendation engine.
2. **Onboarding Context for New Patients:** A first-time patient with 0 records sees an empty state without immediate contextual guidance on how their records get uploaded (e.g. by an authorized physician) or how to share their QR ID.
3. **QR Identity vs Access Misconception:** First-time users often conflate presenting a QR code with granting full access. Contextual tooltips/notices are needed to reinforce that the QR ID is an identifier, not a blanket authorization token.
4. **Blockchain State Feedback Transparency:** When an on-chain transaction is initiated, users benefit from explicit phased status labels: `Waiting for Wallet Approval` $\rightarrow$ `Broadcasting Transaction` $\rightarrow$ `Awaiting Block Confirmation` $\rightarrow$ `Confirmed on Sepolia`.

---

## 2. Granular UX Audit by Product Surface

| Product Surface | Current Behavior | Usability & Trust Gap | Recommended Improvement | Priority |
|---|---|---|---|:---:|
| **Landing Page (`/`)** | Features hero, trust chips, and hospital cards. | "Partner Hospitals" label may mislead evaluators into expecting signed commercial MOUs. | Reframe section as "Regional Healthcare Directory & Recommendation Index" tied to the actual `Hospital.js` engine. | **P1** |
| **Registration (`/register`)** | Role selection radio buttons with form fields. | Users may be uncertain whether a MetaMask wallet is required during initial sign-up. | Add clear informational callout: *"MetaMask wallet is optional during registration. You can link your wallet anytime from your dashboard."* | **P1** |
| **Patient Dashboard (`/patient-dashboard`)** | Overview with metric cards and recent records table. | First-time patients with 0 records see an empty placeholder without clear next steps. | Add an interactive "Quick Start Guide" card explaining the 3-step patient journey (View QR $\rightarrow$ Share with Doctor $\rightarrow$ Manage Access). | **P1** |
| **QR Health ID Page (`/qr-id`)** | High-res QR code card with PNG download. | Users may wonder if someone scanning the code can view their clinical diagnoses. | Add a prominent "Privacy Assurance" note: *"This QR code contains ONLY your unique ID. Doctors cannot view your medical records without your explicit consent."* | **P1** |
| **Doctor Dashboard (`/doctor-dashboard`)** | Clinical patient lookup, file upload, and prescription analysis. | Status text during upload switches quickly; error states can be visually emphasized. | Enhance the 3-stage status badge (`Encrypting AES-256-GCM` $\rightarrow$ `IPFS Pinning` $\rightarrow$ `EVM Anchoring`) with color-coded feedback. | **P2** |
| **Access Manager (`/access`)** | Table of authorized doctors with grant/revoke buttons. | Revoking access triggers a transaction, but user needs reassurance on immediate off-chain revocation. | Add a notice confirming that revocation takes effect immediately across both database and smart contract layers. | **P2** |
| **CDSS AI Hub (`/ai-dashboard`, `/prescription-validator`)** | Multi-drug interaction matrix and dosage checker. | Reviewers must understand that AI provides decision support, not legal prescriptions. | Ensure the non-autonomous disclaimer banner is prominently anchored at the bottom of every AI calculation card. | **P1** |
| **Help & Guidance Modal** | Users with questions about wallet setup, network selection, or cold starts must inspect docs. | In-app help drawer or modal is missing on main dashboard views. | Add a accessible "Product Help & FAQ" component explaining common operational questions. | **P2** |

---

## 3. Prioritized Implementation Roadmap

- **Phase A (Immediate - P1):**
  1. Refine `LandingPage.jsx`: Reframe hospital network as "Regional Clinical Facility Network (Recommendation Engine Index)", remove misleading commercial partnership phrasing, and clarify architecture security boundaries.
  2. Enhance Patient Dashboard empty state and add the "3-Step Patient Quick Start" guidance card.
  3. Add the "Zero-Knowledge QR Privacy Assurance" callout to `QRHealthID.jsx`.
- **Phase B (P2):**
  4. Create `MEDICHAIN_USER_GUIDE.md` covering non-technical patient and physician workflows.
  5. Create `MEDICHAIN_PRODUCT_DEMO.md` with safe synthetic test accounts and cleanup procedures.
  6. Create `MEDICHAIN_PRODUCT_READINESS.md` detailing operational scaling, key management, and regulatory roadmap.
- **Phase C (Verification):**
  7. Run full build and test suites to guarantee zero regressions.
