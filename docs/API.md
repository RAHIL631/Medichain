# MediChain — API Documentation
**Version:** 1.0 (Backend API)  
**Base URL:** `http://localhost:5000/api`  
**Authentication:** Bearer JWT token in `Authorization` header

---

## Authentication

All protected routes require:
```
Authorization: Bearer <access_token>
```

---

## Auth Routes `/api/auth`

### POST /api/auth/register
Register a new user account.

**Auth:** Public  
**Rate limit:** 10/15min per IP (production)

**Request Body:**
```json
{
  "name": "string (2-100 chars, required)",
  "email": "string (valid email, required)",
  "password": "string (min 8 chars, uppercase, number, special char, required)",
  "role": "patient | doctor | hospital (required)",
  "bloodGroup": "A+ | A- | B+ | B- | AB+ | AB- | O+ | O- (patient only, optional)",
  "allergies": ["string"] "(patient only, optional)",
  "chronicConditions": ["string"] "(patient only, optional)",
  "dateOfBirth": "ISO8601 date (patient only, optional)",
  "phone": "string (optional)",
  "specialization": "string (doctor/hospital only, optional)",
  "hospitalName": "string (doctor/hospital only, optional)",
  "licenseNumber": "string (doctor only, optional)",
  "yearsExperience": "number (doctor only, optional)"
}
```

**Response 201:**
```json
{
  "token": "string (JWT access token, 24h)",
  "refreshToken": "string (JWT refresh token, 30d)",
  "user": {
    "_id": "string",
    "name": "string",
    "email": "string",
    "role": "string",
    "walletAddress": "string | null",
    "isWalletLinked": "boolean",
    "isBlockchainRegistered": "boolean",
    "createdAt": "ISO8601"
  }
}
```

**Response 400:** Email already registered, validation errors  

---

### POST /api/auth/login
Authenticate with email and password.

**Auth:** Public  
**Rate limit:** 10/15min per IP (production)

**Request Body:**
```json
{
  "email": "string (required)",
  "password": "string (required)"
}
```

**Response 200:**
```json
{
  "token": "string",
  "refreshToken": "string",
  "user": { "...user fields..." }
}
```

**Response 401:** Invalid credentials  

---

### GET /api/auth/me
Get current authenticated user profile.

**Auth:** Required

**Response 200:** `{ "user": { ...user fields } }`  

---

### POST /api/auth/logout
Client-side logout acknowledgment.

**Auth:** Optional

**Response 200:** `{ "message": "Logged out" }`  

---

### POST /api/auth/refresh
Get a new access token using a refresh token.

**Auth:** Public

**Request Body:** `{ "refreshToken": "string" }`

**Response 200:** `{ "token": "string (new access token)" }`  
**Response 401:** Invalid or expired refresh token  

---

### PATCH /api/auth/wallet
Link a MetaMask wallet address to the current user.

**Auth:** Required

**Request Body:** `{ "walletAddress": "0x... (40 hex chars)" }`

**Response 200:** `{ "message": "Wallet linked successfully", "walletAddress": "string", "isWalletLinked": true }`  

---

## Patient Routes `/api/patient`

**Auth:** Required (role: patient)

### GET /api/patient/records
Get paginated medical records for the authenticated patient.

**Query params:**
- `page` (default: 1)
- `limit` (default: 20, max: 100)
- `recordType` (optional: prescription | lab_report | diagnosis | xray | scan | other)

**Response 200:**
```json
{
  "records": [],
  "total": 0,
  "page": 1,
  "totalPages": 1,
  "limit": 20
}
```

---

### GET /api/patient/records/:recordId
Get a single medical record by ID (patient must own it).

**Response 200:** `{ "record": { ... } }`  
**Response 404:** Record not found  

---

### GET /api/patient/profile
Get the authenticated patient's full profile plus record count.

**Response 200:** `{ "user": { ... }, "recordCount": 0 }`  

---

### PUT /api/patient/profile
Update allowed patient profile fields.

**Request Body:** (any subset of)
```json
{
  "bloodGroup": "A+",
  "allergies": ["Penicillin"],
  "chronicConditions": ["Diabetes"],
  "phone": "+91-...",
  "dateOfBirth": "1990-01-01"
}
```

---

### POST /api/patient/link-wallet
Link a MetaMask wallet to the patient account.

**Request Body:** `{ "walletAddress": "0x..." }`  

---

### GET /api/patient/medications
Get aggregated medication list from all active prescriptions (used for drug interaction checking).

**Response 200:** `{ "medications": ["Metformin", "Aspirin"] }`  

---

### POST /api/patient/grant-access
Verify a doctor exists before granting blockchain access.

**Request Body:** `{ "doctorWalletAddress": "0x..." }`

**Response 200:** `{ "doctorName": "string", "doctorSpecialization": "string", "message": "Doctor verified..." }`  
**Response 404:** Doctor not found  

---

## Doctor Routes `/api/doctor`

**Auth:** Required (role: doctor | hospital)

### POST /api/doctor/upload-record
Upload a medical record for a patient.

**Content-Type:** `multipart/form-data`

**Form Fields:**
- `file` (binary, required) — PDF, JPEG, or PNG, max 10MB
- `patientWalletAddress` (string, required) — patient's Ethereum address
- `recordType` (string, required) — prescription | lab_report | diagnosis | xray | scan | other
- `notes` (string, optional) — max 500 chars
- `medications` (string, optional) — comma-separated drug names

**Flow:**
1. Validates consent (ConsentRecord must exist for this patient-doctor pair)
2. Uploads file to IPFS
3. Runs AI CDSS analysis (if prescription with medications)
4. Blocks if CRITICAL/HIGH severity detected
5. Saves MedicalRecord to MongoDB

**Response 201:** `{ "record": { ... }, "ipfsCID": "string", "cdssAnalysis": { ... } }`  
**Response 403:** Consent not granted  
**Response 422:** CDSS blocked — HIGH/CRITICAL severity  

---

## AI Routes `/api/ai`

**Auth:** Required

### POST /api/ai/predict
Disease risk prediction with patient data enrichment.

**Request Body:** Patient health metrics (age, bmi, etc.)  
**Response:** Risk predictions from AI service  

---

### POST /api/ai/check-drugs
Drug interaction check (enriched with patient's existing medications from DB).

**Request Body:** `{ "newDrug": "string", "currentMedications": ["string"] }`  
**Response:** Interaction results from RxNorm via AI service  

---

### POST /api/ai/cdss/analyze
Full CDSS prescription analysis pipeline.

**Request Body:** `{ "medications": [], "dosages": [], "patient": { age, allergies, ... } }`  
**Response:** Safety score, interactions, dosage warnings, SHAP values, clinical summary  

---

## Hospital Recommendation Routes `/api/hospital-recommendation`

**Auth:** Required

### POST /api/hospital-recommendation/recommend
Get ranked hospital recommendations.

**Request Body:**
```json
{
  "diseases": ["Diabetes"],
  "symptoms": ["fatigue"],
  "age": 45,
  "city": "Mumbai",
  "lat": 19.076,
  "lon": 72.877,
  "emergencyLevel": "routine | urgent | emergency",
  "requiredFacilities": ["icu", "dialysis"]
}
```

**Response:**
```json
{
  "recommendations": [
    {
      "hospital": { ... },
      "score": 0.87,
      "explanation": {
        "specializationMatch": "High",
        "distance": "4.2 km",
        "emergencyCapability": "Advanced",
        "verificationStatus": "Verified"
      }
    }
  ]
}
```

---

### POST /api/hospital-recommendation/specialist
Get specialist recommendations for diseases.

**Request Body:** `{ "diseases": ["Cardiology"] }`  
**Response:** `{ "diseases": [], "specializations": [], "recommendations": [], "disclaimer": "..." }`  

---

### GET /api/hospital-recommendation/hospitals
List hospitals with filtering.

**Query params:** `city`, `type`, `specialization`, `page`, `limit`  

---

## Health Endpoints

### GET /health
Basic service health check (no auth required).

**Response 200:**
```json
{
  "status": "ok",
  "service": "MediChain API",
  "timestamp": "ISO8601",
  "env": "development"
}
```

---

### GET /ready
Readiness check including database connectivity.

**Response 200:** `{ "status": "ready", "checks": { "database": "ok" } }`  
**Response 503:** `{ "status": "not_ready", "checks": { "database": "not_connected" } }`  

---

## Error Response Format

All errors follow this format:
```json
{
  "error": "Human-readable error message"
}
```

Validation errors:
```json
{
  "error": "Validation failed",
  "errors": [
    { "field": "email", "message": "Invalid email address" }
  ]
}
```

---

## Response Headers

All responses include:
- `X-Request-ID: <unique-id>` — for distributed tracing
- `RateLimit-*` headers — current rate limit status

---

## AI Response Disclaimer

All AI-generated outputs (risk predictions, drug interactions, CDSS analysis) are **decision support tools only**.

They:
- Are not diagnoses
- Are not prescriptions
- Require review by a qualified healthcare professional
- May have limitations in accuracy
- Should not be used as the sole basis for clinical decisions
