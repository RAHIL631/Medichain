# MediChain Developer Guide

## Project Structure
```
MediChain/
├── ai/                         # Python AI Microservice (Flask)
│   ├── app.py                  # Application Factory v3.0
│   ├── config/                 # Environment settings
│   ├── cdss/                   # Clinical Decision Support System sub-modules
│   │   ├── clinical_intelligence_engine.py  # Phase 2 Engine
│   │   ├── health_assistant.py              # Phase 9 Engine
│   │   ├── predictive_analytics.py          # Phase 11 Engine
│   │   └── ...
│   └── routes/                 # Blueprint handlers
├── backend/                    # Node.js Express Gateway
│   ├── config/                 # Neo4j & DB singletons
│   ├── middleware/             # Auth & AuditLog middleware
│   ├── models/                 # Mongoose schemas (User, Hospital, Record, AuditLog, Consent)
│   ├── routes/                 # Express API routes
│   └── services/               # Recommender & KnowledgeGraph services
├── frontend/                   # React 18 + Vite SPA
│   ├── src/
│   │   ├── components/         # Reusable Glassmorphism UI components
│   │   ├── pages/              # Page views (Enterprise Dashboard, AI Assistant, etc.)
│   │   └── utils/              # Axios instance & API helpers
```

## Adding a New AI Module
1. Create a Flask Blueprint in `ai/cdss/my_new_module.py`.
2. Register the blueprint in `ai/routes/__init__.py`.
3. Add proxy endpoint in `backend/routes/ai.js`.
4. Create React page in `frontend/src/pages/MyNewPage.jsx` and register in `frontend/src/App.jsx`.
