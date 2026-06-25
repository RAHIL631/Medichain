# ai/cdss/disease_predictor.py
# XGBoost Disease Prediction Module
# Predicts ranked disease probabilities for: heart disease, kidney disease,
# liver disease, diabetes, and stroke.
# Falls back to sklearn models (existing) when XGBoost models are not yet trained.

from flask import Blueprint, request, jsonify
import numpy as np
import joblib
import logging
from pathlib import Path
from datetime import date

logger = logging.getLogger("cdss.predictor")

predictor_bp = Blueprint('predictor', __name__)

BASE_DIR = Path(__file__).parent.parent
MODEL_DIR = BASE_DIR / "models"

# ── Model registry ────────────────────────────────────────────────────────────
XGB_MODELS = {}
XGB_SCALERS = {}
SKLEARN_MODELS = {}   # Fallback: existing heart/diabetes/stroke models
SKLEARN_SCALERS = {}

def _try_load(path):
    """Load a pkl file; return None on failure."""
    try:
        if path.exists():
            return joblib.load(path)
    except Exception as e:
        logger.warning(f"Failed to load {path.name}: {e}")
    return None

def load_all_models():
    """Load XGBoost models (primary) and sklearn models (fallback) at startup."""
    diseases = ["heart", "kidney", "liver", "diabetes", "stroke"]
    
    for d in diseases:
        # XGBoost (new CDSS models)
        xgb_m = _try_load(MODEL_DIR / f"xgb_{d}_model.pkl")
        xgb_s = _try_load(MODEL_DIR / f"xgb_{d}_scaler.pkl")
        if xgb_m:
            XGB_MODELS[d] = xgb_m
            logger.info(f"✅ XGBoost {d} model loaded")
        if xgb_s:
            XGB_SCALERS[d] = xgb_s

        # Sklearn fallback (existing models)
        sk_m = _try_load(MODEL_DIR / f"{d}_model.pkl")
        sk_s = _try_load(MODEL_DIR / f"{d}_scaler.pkl")
        if sk_m:
            SKLEARN_MODELS[d] = sk_m
            logger.info(f"✅ Sklearn {d} model loaded (fallback)")
        if sk_s:
            SKLEARN_SCALERS[d] = sk_s

load_all_models()


def get_risk_label(prob: float) -> str:
    if prob >= 0.75: return "VERY HIGH"
    if prob >= 0.55: return "HIGH"
    if prob >= 0.35: return "MODERATE"
    if prob >= 0.15: return "LOW"
    return "MINIMAL"


def predict_heart(features: dict, model, scaler) -> float:
    """UCI heart dataset layout: age,sex,cp,trestbps,chol,fbs,restecg,thalach,exang,oldpeak,slope,ca,thal"""
    f = np.zeros(13)
    f[0] = features.get("age", 45)
    f[1] = 1 if str(features.get("gender", "M")).upper().startswith("M") else 0
    f[2] = features.get("chest_pain_type", 0)
    f[3] = features.get("systolic_bp", features.get("bloodPressure", 120))
    f[4] = features.get("cholesterol", 200)
    f[5] = 1 if features.get("glucose", 100) > 126 else 0
    f[6] = features.get("rest_ecg", 0)
    f[7] = features.get("max_heart_rate", 150)
    f[8] = 1 if features.get("exercise_angina", False) else 0
    f[9] = features.get("st_depression", 0.0)
    f[10] = features.get("slope", 1)
    f[11] = features.get("vessels", 0)
    f[12] = features.get("thal", 2)
    scaled = scaler.transform([f])
    return float(model.predict_proba(scaled)[0][1])


def predict_diabetes(features: dict, model, scaler) -> float:
    """Pima layout: Pregnancies,Glucose,BloodPressure,SkinThickness,Insulin,BMI,DPF,Age"""
    f = np.zeros(8)
    f[0] = features.get("pregnancies", 0)
    f[1] = features.get("glucose", 100)
    f[2] = features.get("bloodPressure", features.get("diastolic_bp", 80))
    f[3] = features.get("skin_thickness", 20)
    f[4] = features.get("insulin", 80)
    f[5] = features.get("bmi", 25.0)
    f[6] = features.get("diabetes_pedigree", 0.5)
    f[7] = features.get("age", 45)
    scaled = scaler.transform([f])
    return float(model.predict_proba(scaled)[0][1])


def predict_stroke(features: dict, model, scaler) -> float:
    """Stroke layout: gender,age,hypertension,heart_disease,ever_married,work_type,Residence_type,avg_glucose_level,bmi,smoking_status"""
    conditions = [str(c).lower() for c in features.get("chronicConditions", features.get("existingConditions", []))]
    f = np.zeros(10)
    f[0] = 1 if str(features.get("gender", "M")).upper().startswith("M") else 0
    f[1] = features.get("age", 45)
    f[2] = 1 if any("hypertension" in c or "blood pressure" in c for c in conditions) else 0
    f[3] = 1 if any("heart" in c or "cardiac" in c for c in conditions) else 0
    f[4] = 1 if features.get("married", True) else 0
    f[5] = 1  # Private work type default
    f[6] = 1  # Urban default
    f[7] = features.get("glucose", 100)
    f[8] = features.get("bmi", 25.0)
    f[9] = 1 if features.get("smoking", False) else 0
    scaled = scaler.transform([f])
    return float(model.predict_proba(scaled)[0][1])


def predict_kidney(features: dict, model=None, scaler=None) -> float:
    """
    Kidney disease risk prediction.
    If no trained model, estimate from clinical indicators.
    """
    if model and scaler:
        f = np.zeros(11)
        f[0] = features.get("age", 45)
        f[1] = features.get("kidney_gfr", 90)
        f[2] = features.get("creatinine", 1.0)
        f[3] = features.get("urea", 20)
        f[4] = features.get("sodium", 140)
        f[5] = features.get("potassium", 4.0)
        f[6] = features.get("hemoglobin", 13.5)
        f[7] = features.get("systolic_bp", 120)
        f[8] = 1 if features.get("diabetes_history", False) else 0
        f[9] = 1 if features.get("hypertension_history", False) else 0
        f[10] = features.get("bmi", 25.0)
        scaled = scaler.transform([f])
        return float(model.predict_proba(scaled)[0][1])
    
    # Heuristic estimation
    gfr = float(features.get("kidney_gfr", 90))
    creat = float(features.get("creatinine", 1.0))
    conditions = [str(c).lower() for c in features.get("chronicConditions", [])]
    has_diabetes = any("diabet" in c for c in conditions)
    has_htn = any("hypertension" in c or "blood pressure" in c for c in conditions)
    
    risk = 0.05
    if gfr < 15:   risk += 0.80
    elif gfr < 30: risk += 0.60
    elif gfr < 45: risk += 0.40
    elif gfr < 60: risk += 0.20
    elif gfr < 75: risk += 0.08
    
    if creat > 2.0: risk += 0.15
    elif creat > 1.5: risk += 0.08
    
    if has_diabetes: risk += 0.15
    if has_htn: risk += 0.10
    if int(features.get("age", 45)) > 65: risk += 0.05
    
    return min(0.99, risk)


def predict_liver(features: dict, model=None, scaler=None) -> float:
    """
    Liver disease risk prediction.
    If no trained model, estimate from clinical indicators.
    """
    if model and scaler:
        f = np.zeros(10)
        f[0] = features.get("age", 45)
        f[1] = 1 if str(features.get("gender", "M")).upper().startswith("M") else 0
        f[2] = features.get("total_bilirubin", 0.8)
        f[3] = features.get("direct_bilirubin", 0.2)
        f[4] = features.get("alkaline_phosphatase", 90)
        f[5] = features.get("alt", 25)
        f[6] = features.get("ast", 25)
        f[7] = features.get("albumin", 4.0)
        f[8] = features.get("liver_score", 0)
        f[9] = 1 if features.get("alcohol_use", False) else 0
        scaled = scaler.transform([f])
        return float(model.predict_proba(scaled)[0][1])
    
    # Heuristic estimation
    liver_score = int(features.get("liver_score", 0))
    conditions = [str(c).lower() for c in features.get("chronicConditions", [])]
    has_liver = any("liver" in c or "hepat" in c or "cirrhosis" in c for c in conditions)
    alcohol = bool(features.get("alcohol_use", False))
    
    risk = 0.05
    if liver_score >= 10:    risk += 0.70
    elif liver_score >= 7:   risk += 0.50
    elif liver_score >= 5:   risk += 0.25
    elif liver_score >= 3:   risk += 0.10
    
    if has_liver: risk += 0.30
    if alcohol:   risk += 0.20
    bmi = float(features.get("bmi", 25))
    if bmi > 35:  risk += 0.10
    elif bmi > 30: risk += 0.05
    
    return min(0.99, risk)


def predict_all_diseases(patient_features: dict) -> dict:
    """
    Run all 5 disease predictions and return ranked results.
    
    Returns:
        predictions: list of {disease, probability, risk_level, confidence_interval}
        ranked by descending probability
        overall_risk: highest risk level
        risk_factors_detected: list of identified risk factors
    """
    predictions = []
    risk_factors = []

    # ── Age and gender risk context ───────────────────────────────────────────
    age = int(patient_features.get("age", 45))
    if age > 60: risk_factors.append(f"Age {age} — elevated baseline risk")
    
    bmi = float(patient_features.get("bmi", 25.0))
    if bmi > 30: risk_factors.append(f"BMI {bmi} — obesity increases multi-organ risk")
    
    if patient_features.get("smoking"): risk_factors.append("Active smoking — major modifiable risk factor")
    
    conditions = [str(c).lower() for c in patient_features.get("chronicConditions", [])]
    for cond in conditions:
        risk_factors.append(f"Chronic condition: {cond}")

    # ── Heart Disease ─────────────────────────────────────────────────────────
    model_h = XGB_MODELS.get("heart") or SKLEARN_MODELS.get("heart")
    scaler_h = XGB_SCALERS.get("heart") or SKLEARN_SCALERS.get("heart")
    if model_h and scaler_h:
        prob_h = predict_heart(patient_features, model_h, scaler_h)
    else:
        bp = float(patient_features.get("bloodPressure", 120))
        chol = float(patient_features.get("cholesterol", 200))
        prob_h = 0.1 + (age - 30) * 0.005 + (bp - 120) * 0.003 + (chol - 200) * 0.001
        prob_h += 0.15 if patient_features.get("smoking") else 0
        prob_h = min(0.99, max(0.01, prob_h))
    
    predictions.append({
        "disease": "Heart Disease",
        "disease_key": "heart",
        "probability": round(prob_h * 100, 1),
        "probability_raw": round(prob_h, 4),
        "risk_level": get_risk_label(prob_h),
        "model_used": "XGBoost" if "heart" in XGB_MODELS else ("RandomForest/sklearn" if "heart" in SKLEARN_MODELS else "heuristic"),
        "organ": "cardiovascular"
    })

    # ── Diabetes ──────────────────────────────────────────────────────────────
    model_d = XGB_MODELS.get("diabetes") or SKLEARN_MODELS.get("diabetes")
    scaler_d = XGB_SCALERS.get("diabetes") or SKLEARN_SCALERS.get("diabetes")
    if model_d and scaler_d:
        prob_d = predict_diabetes(patient_features, model_d, scaler_d)
    else:
        glucose = float(patient_features.get("glucose", 100))
        prob_d = 0.05 + (glucose - 100) * 0.003 + (bmi - 25) * 0.01 + (age - 30) * 0.003
        prob_d = min(0.99, max(0.01, prob_d))
    
    predictions.append({
        "disease": "Diabetes",
        "disease_key": "diabetes",
        "probability": round(prob_d * 100, 1),
        "probability_raw": round(prob_d, 4),
        "risk_level": get_risk_label(prob_d),
        "model_used": "XGBoost" if "diabetes" in XGB_MODELS else ("RandomForest/sklearn" if "diabetes" in SKLEARN_MODELS else "heuristic"),
        "organ": "endocrine"
    })

    # ── Stroke ────────────────────────────────────────────────────────────────
    model_s = XGB_MODELS.get("stroke") or SKLEARN_MODELS.get("stroke")
    scaler_s = XGB_SCALERS.get("stroke") or SKLEARN_SCALERS.get("stroke")
    if model_s and scaler_s:
        prob_s = predict_stroke(patient_features, model_s, scaler_s)
    else:
        prob_s = 0.02 + (age - 30) * 0.004
        prob_s += 0.10 if any("hypertension" in c for c in conditions) else 0
        prob_s = min(0.99, max(0.01, prob_s))
    
    predictions.append({
        "disease": "Stroke",
        "disease_key": "stroke",
        "probability": round(prob_s * 100, 1),
        "probability_raw": round(prob_s, 4),
        "risk_level": get_risk_label(prob_s),
        "model_used": "XGBoost" if "stroke" in XGB_MODELS else ("RandomForest/sklearn" if "stroke" in SKLEARN_MODELS else "heuristic"),
        "organ": "neurological"
    })

    # ── Kidney Disease ────────────────────────────────────────────────────────
    model_k = XGB_MODELS.get("kidney")
    scaler_k = XGB_SCALERS.get("kidney")
    prob_k = predict_kidney(patient_features, model_k, scaler_k)
    
    predictions.append({
        "disease": "Chronic Kidney Disease",
        "disease_key": "kidney",
        "probability": round(prob_k * 100, 1),
        "probability_raw": round(prob_k, 4),
        "risk_level": get_risk_label(prob_k),
        "model_used": "XGBoost" if model_k else "clinical_heuristic",
        "organ": "renal"
    })

    # ── Liver Disease ─────────────────────────────────────────────────────────
    model_l = XGB_MODELS.get("liver")
    scaler_l = XGB_SCALERS.get("liver")
    prob_l = predict_liver(patient_features, model_l, scaler_l)
    
    predictions.append({
        "disease": "Liver Disease",
        "disease_key": "liver",
        "probability": round(prob_l * 100, 1),
        "probability_raw": round(prob_l, 4),
        "risk_level": get_risk_label(prob_l),
        "model_used": "XGBoost" if model_l else "clinical_heuristic",
        "organ": "hepatic"
    })

    # ── Sort by probability descending ───────────────────────────────────────
    predictions.sort(key=lambda x: x["probability_raw"], reverse=True)

    # ── Overall risk ──────────────────────────────────────────────────────────
    risk_order = ["VERY HIGH", "HIGH", "MODERATE", "LOW", "MINIMAL"]
    highest = max(predictions, key=lambda x: x["probability_raw"])
    overall = highest["risk_level"]

    return {
        "predictions": predictions,
        "overall_risk": overall,
        "highest_risk_disease": highest["disease"],
        "risk_factors_detected": risk_factors[:10],
        "total_diseases_assessed": len(predictions)
    }


# ── Blueprint Routes ──────────────────────────────────────────────────────────

@predictor_bp.route('/cdss/predict-diseases', methods=['POST'])
def predict_diseases():
    """
    POST /cdss/predict-diseases
    Body: patient features dict
    Returns: ranked disease probabilities
    """
    try:
        data = request.get_json(silent=True) or {}
        
        # Age calculation from DOB
        if not data.get("age") and data.get("dob"):
            try:
                birth = date.fromisoformat(str(data["dob"])[:10])
                data["age"] = (date.today() - birth).days // 365
            except Exception:
                data["age"] = 45
        
        logger.info(f"Disease prediction request for age={data.get('age', 'unknown')}")
        result = predict_all_diseases(data)
        
        return jsonify(result), 200

    except Exception as e:
        logger.error(f"Disease prediction error: {e}")
        return jsonify({"error": "Disease prediction failed", "details": str(e)}), 500
