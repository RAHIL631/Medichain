# AI Operations & Safety Monitoring

## 1. Model Tracking
*   **Version Control:** AI models (XGBoost, LightGBM, CatBoost) are versioned via MLflow (or similar registry). Current active models: `v1.2.0`.
*   **Rollback:** Models can be immediately downgraded to `v1.1.0` if anomalous behavior is detected.

## 2. Anomaly & Drift Detection
*   **Input Drift:** Monitor distribution of patient baseline metrics (e.g., if average reported blood pressure suddenly spikes across the system).
*   **Prediction Drift:** Monitor distribution of risk scores. If >20% of patients are suddenly flagged as "High Risk," trigger an alert for manual Data Science review.

## 3. Retraining Policy
*   **Rule:** Models are NEVER automatically retrained and deployed to production.
*   **Process:** Data scientists must manually trigger a retraining pipeline on historical, anonymized data, evaluate validation metrics, and obtain sign-off before a Blue/Green model swap.

## 4. Graceful Degradation
*   If the AI Python microservice crashes or latency exceeds 5 seconds, the backend API will return a localized `fallback` state. 
*   No core medical record functions (upload, retrieve, consent) rely on the AI service.
