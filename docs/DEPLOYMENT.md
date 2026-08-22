# MediChain Deployment Guide

## System Requirements
- **Node.js:** v18.0.0 or higher
- **Python:** v3.10.0 or higher
- **MongoDB:** v6.0+ (Local or MongoDB Atlas)
- **Neo4j:** v5.0+ (Optional — system auto-falls back to Mock mode if unconfigured)

---

## Environment Setup

### 1. Backend (`backend/.env`)
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/medichain
JWT_SECRET=your_jwt_secret_key_here
AI_SERVICE_URL=http://localhost:5001
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password
```

### 2. AI Microservice (`ai/.env`)
```env
PORT=5001
ENV=production
LOG_LEVEL=INFO
MODEL_DIR=models_registry
```

### 3. Frontend (`frontend/.env`)
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_AI_URL=http://localhost:5001
REACT_APP_TARGET_CHAIN_ID=31337
```

---

## Starting Services

### 1. Seed Hospital & Graph Data
```bash
node backend/scripts/seedHospitals.js
```

### 2. Start Backend API
```bash
cd backend
npm install
npm start
```

### 3. Start AI Microservice
```bash
cd ai
pip install -r requirements.txt
python app.py
```

### 4. Start Frontend Dev Server
```bash
cd frontend
npm install
npm run dev
```
