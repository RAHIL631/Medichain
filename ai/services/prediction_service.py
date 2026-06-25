# ai/services/prediction_service.py
# MediChain AI — Prediction Service
#
# Pure Python business logic for disease risk prediction.
# No Flask imports — this layer is independently testable.
#
# Wraps the existing cdss/disease_predictor.py functions,
# pulling models from the ModelRegistry instead of loading them inline.

import logging
from datetime import date
from typing import Optional

logger = logging.getLogger("medichain.service.prediction")


def _resolve_age(data: dict) -> int:
    """Extract or compute patient age from input dict."""
    age = data.get("age")
    if not age:
        dob = data.get("dob") or data.get("dateOfBirth")
        if dob:
            try:
                birth = date.fromisoformat(str(dob)[:10])
                age = (date.today() - birth).days // 365
            except Exception:
                age = 45
        else:
            age = 45
    return max(1, int(age))


def _get_risk_level(prob: float) -> str:
    """Map a probability (0–1) to a three-tier risk label (legacy endpoint format)."""
    if prob < 0.3:
        return "LOW"
    if prob < 0.6:
        return "MEDIUM"
    return "HIGH"


# ── Legacy /predict endpoint logic ────────────────────────────────────────────

def predict_legacy(patient: dict) -> dict:
    """
    Powers the legacy POST /predict endpoint.
    Uses heart/diabetes/stroke sklearn or XGBoost models.
    Preserves the exact response shape that the frontend/backend already consumes.

    Args:
        patient: raw request JSON dict

    Returns:
        dict matching the original /predict response schema
    """
    import numpy as np
    from models_registry import registry

    age = _resolve_age(patient)
    gender = 1 if str(patient.get("gender", "M")).upper() == "M" else 0
    bp = float(patient.get("bloodPressure", patient.get("systolicBP", 120)))
    chol = float(patient.get("cholesterol", 200))
    glucose = float(patient.get("glucose", 100))
    bmi = float(patient.get("bmi", 25.0))
    smoking = 1 if patient.get("smoking", False) else 0

    raw_conditions = patient.get("existingConditions") or patient.get("chronicConditions") or []
    existing = [str(c).lower() for c in raw_conditions]
    hypertension = 1 if any("hypertension" in e or "blood pressure" in e for e in existing) else 0
    heart_disease = 1 if any("heart" in e or "cardiac" in e for e in existing) else 0

    logger.info(f"Legacy predict: age={age} gender={gender} bp={bp} bmi={bmi}")

    scores = {}
    risk_levels = {}

    # ── Heart ────────────────────────────────────────────────────────────────
    model_h = registry.get_model("heart")
    scaler_h = registry.get_scaler("heart")
    if model_h and scaler_h:
        h_features = np.zeros(13)
        h_features[0] = age; h_features[1] = gender; h_features[3] = bp
        h_features[4] = chol; h_features[5] = 1 if glucose > 126 else 0
        h_scaled = scaler_h.transform([h_features])
        prob = float(model_h.predict_proba(h_scaled)[0][1])
        scores["heartDisease"] = round(prob * 100, 1)
        risk_levels["heartDisease"] = _get_risk_level(prob)
    else:
        scores["heartDisease"] = 0.0
        risk_levels["heartDisease"] = "N/A"

    # ── Diabetes ─────────────────────────────────────────────────────────────
    model_d = registry.get_model("diabetes")
    scaler_d = registry.get_scaler("diabetes")
    if model_d and scaler_d:
        d_features = np.zeros(8)
        d_features[1] = glucose; d_features[2] = bp
        d_features[5] = bmi; d_features[7] = age
        d_scaled = scaler_d.transform([d_features])
        prob = float(model_d.predict_proba(d_scaled)[0][1])
        scores["diabetes"] = round(prob * 100, 1)
        risk_levels["diabetes"] = _get_risk_level(prob)
    else:
        scores["diabetes"] = 0.0
        risk_levels["diabetes"] = "N/A"

    # ── Stroke ───────────────────────────────────────────────────────────────
    model_s = registry.get_model("stroke")
    scaler_s = registry.get_scaler("stroke")
    if model_s and scaler_s:
        s_features = np.zeros(10)
        s_features[0] = gender; s_features[1] = age
        s_features[2] = hypertension; s_features[3] = heart_disease
        s_features[7] = glucose; s_features[8] = bmi
        s_scaled = scaler_s.transform([s_features])
        prob = float(model_s.predict_proba(s_scaled)[0][1])
        scores["stroke"] = round(prob * 100, 1)
        risk_levels["stroke"] = _get_risk_level(prob)
    else:
        scores["stroke"] = 0.0
        risk_levels["stroke"] = "N/A"

    # ── Overall risk ─────────────────────────────────────────────────────────
    lvls = ["LOW", "MEDIUM", "HIGH"]
    current = [risk_levels[k] for k in risk_levels if risk_levels[k] in lvls]
    overall = max(current, key=lambda x: lvls.index(x)) if current else "UNKNOWN"

    # ── Recommendations ───────────────────────────────────────────────────────
    recommendations = ["Maintain a balanced diet and 30 minutes of daily exercise."]
    if risk_levels.get("diabetes") == "HIGH":
        recommendations.append("Monitor blood glucose every 3 months.")
    if risk_levels.get("heartDisease") == "HIGH" or risk_levels.get("stroke") == "HIGH":
        recommendations.append("Consult a cardiologist for a preventative check-up.")
    if bp > 140 or chol > 240:
        recommendations.append("Reduce sodium intake and monitor blood pressure weekly.")

    return {
        "overallRisk": overall,
        "scores": scores,
        "riskLevels": risk_levels,
        "recommendations": recommendations,
        "modelsUsed": registry.is_loaded(),
        # Duplicate flat fields for backward compatibility with older frontend consumers
        "risk_level": overall,
        "heart_disease": scores.get("heartDisease", 0.0),
        "diabetes": scores.get("diabetes", 0.0),
        "stroke": scores.get("stroke", 0.0),
    }


# ── Full CDSS disease prediction ───────────────────────────────────────────────

def predict_all_diseases(patient: dict) -> dict:
    """
    Powers POST /cdss/predict-diseases.
    Delegates to the existing cdss/disease_predictor.py function,
    which already handles XGBoost-first with sklearn/heuristic fallback.

    Args:
        patient: patient features dict (age resolved if dob provided)

    Returns:
        Full ranked prediction result dict from predict_all_diseases()
    """
    if not patient.get("age") and patient.get("dob"):
        patient["age"] = _resolve_age(patient)

    from cdss.disease_predictor import predict_all_diseases as _predict
    logger.info(f"Full disease prediction: age={patient.get('age', 'unknown')}")
    return _predict(patient)
