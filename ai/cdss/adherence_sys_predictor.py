# ai/cdss/adherence_sys_predictor.py
# MediChain AI — Upgraded Medication Adherence Scorer
# Handles ML prediction, risk categorization, and reminder notifications rules.

import numpy as np
import joblib
import logging
from pathlib import Path

logger = logging.getLogger("cdss.adherence_sys")

BASE_DIR = Path(__file__).parent.parent
MODEL_DIR = BASE_DIR / "models"

MODEL = None
SCALER = None

def load_adherence_sys_model():
    global MODEL, SCALER
    m_path = MODEL_DIR / "adherence_sys_model.pkl"
    s_path = MODEL_DIR / "adherence_sys_scaler.pkl"
    
    try:
        if m_path.exists():
            MODEL = joblib.load(m_path)
            logger.info("Loaded upgraded Adherence System ML model")
        if s_path.exists():
            SCALER = joblib.load(s_path)
    except Exception as e:
        logger.warning(f"Failed to load upgraded Adherence System model: {e}")

load_adherence_sys_model()

def parse_education(edu_str: str) -> float:
    """Map string education levels to training numerical indexes."""
    val = str(edu_str).strip().lower()
    if "primary" in val:
        return 0.0
    if "secondary" in val:
        return 1.0
    if "higher" in val or "university" in val or "college" in val or "degree" in val:
        return 2.0
    return 1.0 # Default fallback

def compute_adherence_score(patient_data: dict) -> dict:
    """
    Predict patient adherence probability and recommend notification alerts.
    
    Inputs:
      age: int
      education: str ("Primary", "Secondary", "Higher")
      history: float (past adherence score 0-100)
      missed_medicines: int (doses missed in last 30 days)
      chronic_diseases: int (count of chronic conditions)
    """
    age = int(patient_data.get("age", 45))
    edu_raw = patient_data.get("education", "Secondary")
    edu_num = parse_education(edu_raw)
    history = float(patient_data.get("history", 85.0))
    missed_meds = int(patient_data.get("missed_medicines", 2))
    chronic_dis = int(patient_data.get("chronic_diseases", 1))

    # Form feature vector
    feat = np.array([age, edu_num, history, missed_meds, chronic_dis], dtype=float)

    # Predict using ML model
    model_used = "clinical_heuristic"
    shap_values = [0.0] * 5
    base_value = 0.5
    feature_names = ["Age", "Education Level", "Compliance History", "Missed Doses", "Chronic Conditions"]

    if MODEL and SCALER:
        try:
            feat_scaled = SCALER.transform([feat])
            prob = float(MODEL.predict_proba(feat_scaled)[0][1])
            adherence_score = round(prob * 100, 1)
            model_used = "RandomForest (Fallback)" if "RandomForest" in str(type(MODEL)) else "XGBoost"
            
            # Compute SHAP
            try:
                import shap
                explainer = shap.TreeExplainer(MODEL)
                sv = explainer.shap_values(np.array(feat_scaled))
                base_value = float(explainer.expected_value[1]) if hasattr(explainer.expected_value, '__len__') else float(explainer.expected_value)
                if isinstance(sv, list):
                    sv = sv[1]
                shap_values = sv[0].tolist() if hasattr(sv[0], 'tolist') else list(sv[0])
            except Exception:
                # Math-consistent fallback: partition (prediction - base_value) based on feature importances
                base_value = 0.5
                diff = prob - base_value
                importances = MODEL.feature_importances_ if hasattr(MODEL, 'feature_importances_') else [0.2]*5
                # Missed doses and history have inverse relationships
                signs = [1.0, 1.0, 1.0, -1.0, -1.0]
                raw_shap = [float(imp * sign) for imp, sign in zip(importances, signs)]
                total_abs = sum(abs(x) for x in raw_shap)
                if total_abs > 0:
                    shap_values = [float((x / total_abs) * diff) for x in raw_shap]
                else:
                    shap_values = [0.0] * 5
        except Exception as e:
            logger.warning(f"Inference error: {e}. Falling back to heuristic.")
            adherence_score = _heuristic_adherence(feat)
            prob = adherence_score / 100.0
            diff = prob - 0.5
            shap_values = [float(val * diff) for val in [0.1, 0.1, 0.4, -0.3, -0.1]]
    else:
        adherence_score = _heuristic_adherence(feat)
        prob = adherence_score / 100.0
        diff = prob - 0.5
        shap_values = [float(val * diff) for val in [0.1, 0.1, 0.4, -0.3, -0.1]]

    # Formulate SHAP feature importance structure
    shap_explain = []
    for i, name in enumerate(feature_names):
        sv_val = shap_values[i]
        shap_explain.append({
            "feature": name,
            "feature_value": float(feat[i]),
            "shap_value": round(float(sv_val), 4),
            "importance": round(abs(float(sv_val)), 4),
            "direction": "increases_adherence" if sv_val >= 0 else "decreases_adherence"
        })
    shap_explain.sort(key=lambda x: x["importance"], reverse=True)

    # Determine Risk Level
    if adherence_score >= 80.0:
        risk = "LOW"
        risk_color = "#22c55e"
    elif adherence_score >= 50.0:
        risk = "MEDIUM"
        risk_color = "#eab308"
    else:
        risk = "HIGH"
        risk_color = "#ef4444"

    # Reminder Channels Rules
    sms_rec = risk in ["MEDIUM", "HIGH"]
    whatsapp_rec = risk == "HIGH" or adherence_score < 40.0 or missed_meds > 5
    family_alert = risk == "HIGH" and (age > 65 or age < 25)

    # Formulate Clinical Reasons
    reasons = []
    top_pos = [s for s in shap_explain if s["direction"] == "increases_adherence"][:2]
    top_neg = [s for s in shap_explain if s["direction"] == "decreases_adherence"][:2]
    
    if top_neg:
        neg_str = ", ".join([f"{s['feature']} (value: {s['feature_value']})" for s in top_neg])
        reasons.append(f"Main factors decreasing adherence: {neg_str}.")
    if top_pos:
        pos_str = ", ".join([f"{s['feature']} (value: {s['feature_value']})" for s in top_pos])
        reasons.append(f"Protective factors promoting adherence: {pos_str}.")

    if missed_meds > 3:
        reasons.append(f"Patient has missed {missed_meds} doses in the last 30 days, showing significant compliance difficulty.")
    if history < 70:
        reasons.append(f"Historical adherence rate is low ({history}%), indicating a chronic pattern of missed renewals.")
    if chronic_dis > 3:
        reasons.append(f"High pill burden from {chronic_dis} chronic conditions increases management complexity.")
    if age > 65 and risk == "HIGH":
        reasons.append("Elderly patient at high risk of forgetting doses; family notifications are highly advised.")
    if not reasons:
        reasons.append("Patient demonstrates stable adherence behavior under the current regimen.")

    return {
        "adherence_score": adherence_score,
        "risk": risk,
        "risk_color": risk_color,
        "reminder_recommendation": {
            "sms": bool(sms_rec),
            "whatsapp": bool(whatsapp_rec),
            "family_alert": bool(family_alert)
        },
        "contributing_factors": reasons,
        "patient_context": {
            "age": age,
            "education": edu_raw,
            "history_score": history,
            "missed_medicines_30d": missed_meds,
            "chronic_diseases": chronic_dis
        },
        "model_used": model_used,
        "shap_explanation": {
            "base_value": round(base_value, 4),
            "prediction_value": round(prob, 4),
            "feature_names": feature_names,
            "shap_values": [round(s, 4) for s in shap_values],
            "feature_importance": shap_explain
        }
    }

def _heuristic_adherence(feat: np.ndarray) -> float:
    """Fallback clinical heuristic calculation."""
    age, edu, hist, missed, chronic = feat
    
    score = 100.0
    # Missed doses deduct heavily
    score -= (missed * 4.0)
    # Refill history weight
    score = 0.5 * score + 0.5 * hist
    # Deduct chronic diseases pill load
    score -= (chronic * 2.5)
    # Education levels
    if edu == 2.0:
        score += 5.0
    elif edu == 0.0:
        score -= 5.0

    return max(0.0, min(100.0, round(score, 1)))
