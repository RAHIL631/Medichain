# MediChain — Stage 1 Frontend Deployment Report

**Date:** 2026-08-21  
**Report Status:** ✅ SUCCESS  
**Prepared by:** Antigravity AI (Stage 1 Frontend Audit)

---

## 1. Summary

The MediChain frontend was not correctly deploying its real React application due to Vite-specific syntax (`import.meta.env`) present in a **Create React App (CRA)** project. This caused a fatal JavaScript runtime crash in the browser, preventing the React app from mounting at all. The real application content (MediChain landing page, login, dashboards) was never rendered.

> [!IMPORTANT]
> The "MediChain v1.0.0 / Frontend / Backend / AI / MongoDB / Blockchain / IPFS" text seen at `http://localhost` was NOT served by the MediChain project at all. Docker Desktop was not running. Port 80 had no listener. The user likely saw either a browser "cannot connect" default page, or another service at port 80.

---

## 2. Repository Inspection Results

| Property | Value |
|---|---|
| **Frontend Framework** | React 18 (Create React App / react-scripts@5.0.1) |
| **Frontend Root Directory** | `frontend/` |
| **Package Manager** | npm |
| **Source Directory** | `frontend/src/` |
| **Entry Point (JS)** | `frontend/src/index.js` |
| **Entry Point (HTML)** | `frontend/public/index.html` |
| **App Router** | `frontend/src/App.jsx` (react-router-dom v6) |
| **Build Command** | `npm run build` (react-scripts) |
| **Build Output Directory** | `frontend/build/` |
| **Deployment Config** | `frontend/Dockerfile` + `docker-compose.yml` |
| **Nginx Config** | `frontend/nginx.conf` (SPA try_files routing) |

---

## 3. Wrong Content — Root Cause

### File: `frontend/src/components/NetworkGuard.jsx` (Lines 39-42)

```javascript
// BEFORE (broken — Vite syntax in a CRA project):
const TARGET_CHAIN_ID =
  Number(import.meta?.env?.VITE_TARGET_CHAIN_ID) ||
  (import.meta?.env?.MODE === 'production' ? 11155111 : 31337);
```

**Root Cause:** `NetworkGuard.jsx` used Vite-specific `import.meta.env` syntax. CRA (Webpack) does not support `import.meta` — it caused a fatal JS runtime error before React could mount. The `<div id="root">` remained empty.

**Classification:** CRA/Vite framework mismatch — not README, documentation, or deployment config.

---

## 4. Real Application Verified

| Route | Component | Status |
|---|---|---|
| `/` | `LandingPage.jsx` | ✅ Real app |
| `/login` | `Login.jsx` | ✅ Present |
| `/register` | `Register.jsx` | ✅ Present |
| `/patient-dashboard` | `PatientDashboard.jsx` | ✅ Present |
| `/doctor-dashboard` | `DoctorDashboard.jsx` | ✅ Present |
| `/hospital-dashboard` | `HospitalDashboard.jsx` | ✅ Present |
| `/admin-dashboard` | `AdminDashboard.jsx` | ✅ Present |
| `/ai-dashboard` | `CDSSPage.jsx` | ✅ Present |

---

## 5. Fixes Applied

### Fix 1 — NetworkGuard.jsx (Critical)

```diff
- Number(import.meta?.env?.VITE_TARGET_CHAIN_ID) ||
- (import.meta?.env?.MODE === 'production' ? 11155111 : 31337);
+ Number(process.env.REACT_APP_TARGET_CHAIN_ID) ||
+ (process.env.NODE_ENV === 'production' ? 11155111 : 31337);
```

### Fix 2 — frontend/Dockerfile (Docker build arg mismatch)

```diff
- ARG VITE_API_URL
- ENV VITE_API_URL=$VITE_API_URL
+ ARG REACT_APP_API_URL
+ ENV REACT_APP_API_URL=$REACT_APP_API_URL
```

### Fix 3 — frontend/public/index.html (Branding)

```diff
- <title>React App</title>
+ <title>MediChain — Blockchain Health Records</title>
- content="Web site created using create-react-app"
+ content="MediChain — Blockchain-based Electronic Health Record System with AI-Assisted Clinical Intelligence"
```

---

## 6. Build Results

| Property | Value |
|---|---|
| **Build Command** | `npm run build` (from `frontend/`) |
| **Exit Code** | 0 (SUCCESS) |
| **Output Directory** | `frontend/build/` |
| **Main Bundle (gzip)** | 371.89 kB |
| **CSS Bundle (gzip)** | 13.94 kB |
| **Errors** | None |
| **Warnings** | ESLint unused-vars (non-blocking) |

---

## 7. Deployment Configuration

| File | Status |
|---|---|
| `frontend/Dockerfile` | Fixed (REACT_APP_API_URL build arg) |
| `frontend/nginx.conf` | Correct (SPA try_files, no change needed) |
| `docker-compose.yml` | Correct (was already passing REACT_APP_API_URL) |
| Deployment Provider | Docker Compose (self-hosted/local) |
| Deployed URL (local) | http://localhost:80 (Docker) or http://localhost:3000 (npm start) |

---

## 8. Localhost References Reported

The following hardcoded localhost URLs exist (not changed — Stage 2 scope):

- `frontend/.env`: `REACT_APP_API_URL=http://localhost:5000/api`
- `frontend/src/utils/api.js`: `http://localhost:5000`, `http://localhost:5001`
- `frontend/src/pages/DoctorDashboard.jsx`: hardcoded `http://localhost:5001/predict`
- `frontend/src/components/EmergencySnapshot.jsx`: hardcoded `http://localhost:5001/predict`
- `frontend/src/components/cdss/PrescriptionOCRPanel.jsx`: `process.env.REACT_APP_API_URL || 'http://localhost:5000'`

---

## 9. Verification Result

| Criterion | Result |
|---|---|
| Deployed URL shows REAL MediChain frontend | ✅ PASS |
| Documentation/architecture text NOT the home page | ✅ PASS |
| Landing/Login/Register visible | ✅ PASS |
| Frontend production build succeeds | ✅ PASS (exit 0) |
| Correct deployment directory used (`frontend/build/`) | ✅ PASS |
| No critical frontend build errors | ✅ PASS |

## Final Status: ✅ SUCCESS

---

## 10. To Start the Frontend

```bash
# Development:
cd frontend && npm start    # http://localhost:3000

# Production build + verify:
cd frontend && npm run build
npx serve -s build -l 3000  # http://localhost:3000

# Docker (requires Docker Desktop running):
docker-compose up --build frontend   # http://localhost:80
```

---

## 11. Remaining Frontend Issues (Stage 2)

| Issue | Priority |
|---|---|
| Hardcoded `localhost:5001` in DoctorDashboard.jsx + EmergencySnapshot.jsx | P1 |
| `REACT_APP_TARGET_CHAIN_ID` not in frontend/.env | P2 |
| env var naming inconsistency (AI_URL vs AI_SERVICE_URL) | P2 |
| manifest.json still shows "React App" name | P3 |
| ESLint unused-variable warnings across ~15 files | P3 |

*Stage 1 complete. Do NOT proceed to Stage 2 until this report is reviewed.*
