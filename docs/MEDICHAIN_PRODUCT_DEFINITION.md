# MediChain — Product Definition & Positioning Specification

**Product Name:** MediChain  
**Version:** 3.0.1 (Productization Stage 5 — experience improved with limitations)  
**Date:** October 20, 2026  
**Category:** Patient-Controlled Health Information Platform (PCHIP)  
**Document Purpose:** Defines the genuine product identity, target personas, core value proposition, architectural differentiators, and verifiable demonstration boundaries.

---

## 1. Product Positioning & Executive Summary

> **"MediChain is a patient-controlled healthcare information platform designed to support secure medical-record management, verifiable document integrity, consent-aware information sharing, and AI-assisted clinical decision support."**

MediChain is **not** an electronic health record (EHR) vendor replacement for acute care hospital information systems (HIS), nor is it a fully certified medical device. Instead, MediChain operates as a **patient-centric interoperability and integrity layer** that empowers individuals to hold, encrypt, verify, and selectively share their medical records with licensed clinicians while equipping healthcare providers with automated, evidence-based medication safety screening.

---

## 2. The Primary Problem MediChain Solves

Healthcare data today is trapped in centralized, proprietary institutional silos. This creates four major systemic problems:

1. **Loss of Patient Data Sovereignty:** Patients have little visibility into who accesses their medical history and lack frictionless mechanisms to transfer records between unaffiliated healthcare providers.
2. **Centralized Data Breach Vulnerability:** Monolithic healthcare databases represent high-value honeypots for ransomware and data exfiltration.
3. **Vulnerability to Silent Record Tampering:** Centralized databases lack mathematical, verifiable proof that a diagnostic document or lab result has not been altered after upload.
4. **Preventable Medication Conflicts:** Lack of consolidated, real-time prescription cross-referencing leads to adverse drug-drug interactions, which remain a leading cause of preventable clinical complications.

---

## 3. Intended User Groups & Personas

| User Role | Persona Description | Primary Pain Point Addressed | Key Product Surface |
|---|---|---|---|
| **Patient** | Individuals managing personal or family health records across multiple doctors and clinics. | Inability to securely carry and grant temporary access to diagnostic records without privacy loss. | Patient Dashboard, My Health QR (`/qr-id`), Access Manager (`/access`), Health Timeline. |
| **Doctor / Physician** | Outpatient and clinical healthcare practitioners evaluating new or existing patients. | Lack of reliable prior medical history and real-time interaction screening for new prescriptions. | Clinical Doctor Dashboard (`/doctor-dashboard`), Prescription Validator (`/prescription-validator`), CDSS AI Hub. |
| **Clinic / Hospital Staff** | Administrative personnel managing provider credentials and facility capabilities. | Lack of transparent access audit logs and facility load coordination. | Hospital Dashboard (`/hospital-dashboard`), Facility Profile, Resource Directory. |
| **System Administrator** | Technical operators monitoring platform health, user roles, and security audit logs. | Lack of unified observability over decentralized and centralized services. | Platform Admin Dashboard (`/admin-dashboard`), System Readiness Probes (`/ready`). |

---

## 4. Main User Journeys

### Journey 1: Patient-Controlled Record Lifecycle
$$\text{Registration} \longrightarrow \text{Patient Dashboard} \longrightarrow \text{QR Health ID Generation} \longrightarrow \text{Grant Doctor Consent} \longrightarrow \text{Timeline Review} \longrightarrow \text{Revoke Access}$$

### Journey 2: Physician Patient Lookup & Verified Clinical Ingestion
$$\text{Doctor Login} \longrightarrow \text{QR / Address Lookup} \longrightarrow \text{Verify Consent} \longrightarrow \text{Upload Record} \longrightarrow \text{AES-256-GCM Encryption} \longrightarrow \text{IPFS & EVM Anchor}$$

### Journey 3: Real-Time AI Prescription Safety Screening
$$\text{Prescription Input} \longrightarrow \text{RxNorm Concept Mapping} \longrightarrow \text{Interaction Matrix Audit} \longrightarrow \text{Dosage Model Evaluation} \longrightarrow \text{Safety Score (0--100)} \longrightarrow \text{Clinical Decision Support Warning}$$

---

## 5. Core Value Proposition

1. **Zero-Knowledge Identification:** Patients identify themselves in physical clinic waiting rooms via high-res QR codes that contain only their safe alphanumeric ID, completely concealing sensitive diagnoses.
2. **True Off-Chain Privacy:** Medical documents are encrypted via authenticated AES-256-GCM before transmission. Public IPFS nodes hold only uncrackable ciphertext.
3. **Immutable Mathematical Integrity:** Document hashes (SHA-256 multihash CIDv1) are anchored to the Ethereum blockchain, making silent data tampering mathematically impossible.
4. **Active Consent Revocation:** When a patient revokes a doctor's access, subsequent download attempts fail immediately with HTTP 403 Forbidden, enforced at the API and smart-contract level.
5. **Non-Autonomous Decision Support:** AI models screen for critical drug interactions and multi-disease probabilities, presenting actionable guidance without replacing licensed clinical judgment.

---

## 6. Existing Product Capabilities (Verified in Code)

- **Decentralized Authentication & Access Control:** Ethers.js v6 Web3 provider with Sepolia smart-contract access mappings.
- **Stateless Session Management:** JWT access (24h) and refresh (7d) tokens with server-side token blocklist.
- **Envelope Encryption Service:** Native Node.js `crypto` AES-256-GCM with per-file data keys and master key wrapping.
- **Decentralized Multi-Gateway IPFS:** Resilient Pinata SDK upload with automated fallback across Pinata, IPFS.io, and Cloudflare.
- **CDSS AI Microservice:** Python Flask service with 7 active supervised learning models (heart, stroke, diabetes, kidney, liver, cancer, adherence).
- **RxNorm Pharmacological Cross-Referencing:** Live National Library of Medicine API integration with offline clinical rule matrix fallback.
- **Patient Health Timeline:** Chronological aggregation of prescriptions, lab reports, and diagnostic scans.
- **GDPR / Compliance Data Rights:** Full data export (`GET /api/account/export`) and verifiable account anonymization (`DELETE /api/account`).
- **Comprehensive Audit Trail:** Mongo TTL-indexed audit records capturing access attempts without credential leakage.

---

## 7. Current Technical Limitations (Documented & Honest)

- **Free-Tier Cold Start:** The Render-hosted staging backend and AI microservice experience a 30–50s spin-up delay when waking from sleep.
- **Web3 Wallet Requirement for On-Chain Signatures:** While ordinary login and off-chain views are gasless and do not require MetaMask, on-chain consent grants require an EVM wallet with Sepolia testnet ETH.
- **Synthetic AI Training Datasets:** Machine learning models were trained on public clinical benchmarks (MIMIC-III derivatives, UCI Health). They provide strong decision-support demonstrations but have not undergone formal clinical trial certification.
- **No Direct Electronic Health Record Vendor Plugin:** MediChain currently ingests documents via standard digital formats (PDF, JPG, PNG) rather than direct bi-directional Epic/Cerner proprietary HL7 interfaces.

---

## 8. What Differentiates MediChain's Architecture

Unlike traditional EHR platforms that store plaintext records in centralized databases, MediChain employs a **tripartite decoupled model**:
1. **Decentralized Trust (Ethereum):** Handles identity, consent, and tamper-evident notarization.
2. **Decentralized Storage (IPFS):** Handles distributed file availability without single points of failure.
3. **Client/Server Cryptography (AES-256-GCM):** Guarantees confidentiality so that neither IPFS node operators nor database administrators can view patient records in plaintext.

---

## 9. What MediChain Can Genuinely Demonstrate Today

- Live multi-role user registration and login (Patient, Doctor, Admin).
- Interactive QR Health ID display and 1000x1000px high-res PNG download.
- Camera-based QR code scanning with continuous webcam video stream decode.
- Multipart document upload with server-side AES-256-GCM encryption and IPFS pinning.
- Real-time AI prescription conflict detection (e.g. Warfarin + Aspirin high-risk alert).
- On-chain doctor consent granting via MetaMask on Sepolia testnet.
- Authorized document download and in-memory decryption.
- Real-time consent revocation followed by verified HTTP 403 access denial.
- Complete regulatory audit trail logging in MongoDB.
- 111 out of 111 automated tests passing across Solidity, Node.js, and Python.
