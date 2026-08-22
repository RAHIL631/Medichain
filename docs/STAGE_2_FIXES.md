# MediChain — Stage 2 Deployment Readiness Fixes

This report documents all code fixes, security improvements, and configuration updates applied during Stage 2 to make the MediChain project fully deployment-ready.

---

## 1. Mongoose Database Re-entry Fix
- **Problem:** When running the backend unit test suite (`npm run test`), Jest loaded the database configuration multiple times concurrently, causing Mongoose to throw: `Can't call openUri() on an active connection with different connection strings`. This resulted in 22 unit test failures.
- **Root Cause:** `config/db.js` did not check if a connection was already established or in progress before calling `mongoose.connect()`.
- **Fix:** Added a state check to return immediately if `process.env.NODE_ENV === 'test'` (letting Jest's `beforeAll` handle connection) or if `mongoose.connection.readyState` is `1` (connected) or `2` (connecting).
- **Files Modified:** [`backend/config/db.js`](file:///c:/Users/Rahil%20hassan/OneDrive/Desktop/Major%20project/MediChain/backend/config/db.js)

---

## 2. Express 5 Custom XSS Sanitizer Middleware
- **Problem:** Making a POST request (such as user registration) crashed the server with: `TypeError: Cannot set property query of [object Object] which has only a getter` coming from the `xss-clean` third-party library.
- **Root Cause:** In Express 5, `req.query` is a read-only property. The legacy `xss-clean` library tries to reassign it directly (`req.query = ...`), causing a crash.
- **Fix:** Removed the `xss-clean` dependency and implemented a custom recursive XSS sanitization middleware inside `server.js` that sanitizes `req.body` and `req.params` without violating Express 5 query string constraints.
- **Files Modified:** [`backend/server.js`](file:///c:/Users/Rahil%20hassan/OneDrive/Desktop/Major%20project/MediChain/backend/server.js)

---

## 3. Mongoose Duplicate Index Warning
- **Problem:** Mongoose generated index alerts on startup: `Duplicate schema index on {"expiresAt":1} for model "ConsentRecord"`.
- **Root Cause:** The schema declared `index: true` inline on the `expiresAt` field, while also defining a custom partial TTL index on the same field at the bottom of the file.
- **Fix:** Removed the inline `index: true` property from the `expiresAt` definition, allowing only the compound TTL index to govern the index creation.
- **Files Modified:** [`backend/models/ConsentRecord.js`](file:///c:/Users/Rahil%20hassan/OneDrive/Desktop/Major%20project/MediChain/backend/models/ConsentRecord.js)

---

## 4. Exposed Credential Sanitization
- **Problem:** `backend/.env` contained raw legacy Pinata JWT and API credentials, exposing the account.
- **Fix:** Sanitized `backend/.env` in the local workspace by replacing those values with safe placeholder strings (`YOUR_PINATA_JWT_HERE`, etc.).
- **Files Modified:** [`backend/.env`](file:///c:/Users/Rahil%20hassan/OneDrive/Desktop/Major%20project/MediChain/backend/.env)

---

## 5. Environment Example Consistency
- **Problem:** `frontend/.env.example` used legacy or outdated variable names (like `REACT_APP_AI_SERVICE_URL`) instead of actual variables parsed by the code (e.g. `REACT_APP_AI_URL`, `REACT_APP_TARGET_CHAIN_ID`).
- **Fix:** Updated the example template with variables matching frontend source code.
- **Files Modified:** [`frontend/.env.example`](file:///c:/Users/Rahil%20hassan/OneDrive/Desktop/Major%20project/MediChain/frontend/.env.example)
