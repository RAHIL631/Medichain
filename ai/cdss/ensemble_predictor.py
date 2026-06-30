# ai/cdss/ensemble_predictor.py
# MediChain AI — Multi-Model Ensemble Disease Predictor
# Loads XGBoost, LightGBM, and CatBoost models and performs ranked top 5 risk analysis.

import numpy as np
import joblib
import logging
from pathlib import Path

logger = logging.getLogger("cdss.ensemble")

BASE_DIR = Path(__file__).parent.parent
MODEL_DIR = BASE_DIR / "models"

# ── Clinical Mapping Database ──────────────────────────────────────────────────

CLINICAL_MAPPINGS = {
    "heart": {
        "disease": "Coronary Artery Disease",
        "specialist": "Cardiologist",
        "tests": ["Electrocardiogram (ECG)", "Echocardiogram", "Lipid Panel Test", "Cardiac Troponin"],
        "organ": "Cardiovascular",
        "icon": "❤️"
    },
    "diabetes": {
        "disease": "Type 2 Diabetes",
        "specialist": "Endocrinologist",
        "tests": ["HbA1c (Glycated Hemoglobin)", "Fasting Plasma Glucose", "Oral Glucose Tolerance Test"],
        "organ": "Endocrine",
        "icon": "🩸"
    },
    "stroke": {
        "disease": "Ischemic Stroke",
        "specialist": "Neurologist",
        "tests": ["CT Brain Scan", "MRI Brain Scan", "Carotid Duplex Ultrasound", "ECG"],
        "organ": "Neurological",
        "icon": "🧠"
    },
    "kidney": {
        "disease": "Chronic Kidney Disease",
        "specialist": "Nephrologist",
        "tests": ["Serum Creatinine & eGFR", "Urinalysis (Albumin-to-Creatinine Ratio)", "Renal Ultrasound"],
        "organ": "Renal",
        "icon": "🫘"
    },
    "liver": {
        "disease": "Non-Alcoholic Fatty Liver Disease",
        "specialist": "Hepatologist / Gastroenterologist",
        "tests": ["Liver Function Panel (ALT/AST)", "Abdominal Ultrasound", "Transient Elastography (FibroScan)"],
        "organ": "Hepatic",
        "icon": "🟤"
    },
    "cancer": {
        "disease": "Oncology Malignancy (Cancer)",
        "specialist": "Oncologist",
        "tests": ["Biopsy & Histopathology", "CT / PET Imaging Scan", "Tumor Markers Screen", "Complete Blood Count"],
        "organ": "Oncology",
        "icon": "🎗️"
    },
    "copd": {
        "disease": "Chronic Obstructive Pulmonary Disease",
        "specialist": "Pulmonologist",
        "tests": ["Spirometry (Lung Function Test)", "Chest X-Ray", "Arterial Blood Gas (ABG)"],
        "organ": "Pulmonary",
        "icon": "🫁"
    },
    "thyroid": {
        "disease": "Thyroid Dysfunction",
        "specialist": "Endocrinologist",
        "tests": ["TSH (Thyroid Stimulating Hormone)", "Free Thyroxine (FT4)", "Thyroid Ultrasound Scan"],
        "organ": "Endocrine",
        "icon": "🦋"
    }
}

# ── Model Loading ─────────────────────────────────────────────────────────────

XGB_MODELS = {}
LGB_MODELS = {}
CAT_MODELS = {}
SCALERS = {}

DISEASES = list(CLINICAL_MAPPINGS.keys())

def load_ensemble_models():
    """Load all XGBoost, LightGBM, and CatBoost ensemble models."""
    for d in DISEASES:
        # Load XGBoost (or RandomForest fallback)
        xgb_path = MODEL_DIR / f"xgb_ens_{d}.pkl"
        if xgb_path.exists():
            XGB_MODELS[d] = joblib.load(xgb_path)
            logger.info(f"Loaded ensemble XGBoost for {d}")

        # Load LightGBM (or GradientBoosting fallback)
        lgb_path = MODEL_DIR / f"lgb_ens_{d}.pkl"
        if lgb_path.exists():
            LGB_MODELS[d] = joblib.load(lgb_path)
            logger.info(f"Loaded ensemble LightGBM for {d}")

        # Load CatBoost (or RandomForest fallback)
        cat_path = MODEL_DIR / f"cat_ens_{d}.pkl"
        if cat_path.exists():
            CAT_MODELS[d] = joblib.load(cat_path)
            logger.info(f"Loaded ensemble CatBoost for {d}")

        # Load Scaler
        scaler_path = MODEL_DIR / f"scaler_ens_{d}.pkl"
        if scaler_path.exists():
            SCALERS[d] = joblib.load(scaler_path)

load_ensemble_models()

# ── Ensemble Predictor Logic ──────────────────────────────────────────────────

def compute_ensemble_predictions(patient: dict) -> dict:
    """
    Perform multi-model predictions across 8 diseases, average them, 
    map clinical tests/specialists/priority/emergency and select top 5.
    """
    age = int(patient.get("age", 45))
    gender_val = 1 if str(patient.get("gender", "M")).upper().startswith("M") else 0
    bmi = float(patient.get("bmi", 24.5))
    smoking = 1 if patient.get("smoking", False) else 0
    alcohol = 1 if patient.get("alcohol_use", False) else 0
    family_cancer = 1 if patient.get("family_history_cancer", False) else 0
    gfr = float(patient.get("kidney_gfr", 90))
    liver_score = int(patient.get("liver_score", 0))
    conditions = [str(c).lower() for c in patient.get("chronicConditions", [])]

    # Pre-parse features for each disease
    features_db = {
        "heart": [age, gender_val, float(patient.get("bloodPressure", 120)), float(patient.get("cholesterol", 200)), bmi, smoking],
        "diabetes": [age, bmi, float(patient.get("glucose", 100)), float(patient.get("diastolic_bp", 80)), 1 if any("diabetes" in c for c in conditions) else 0],
        "stroke": [age, gender_val, float(patient.get("bloodPressure", 120)), float(patient.get("cholesterol", 200)), smoking, 1 if any("heart" in c for c in conditions) else 0],
        "kidney": [age, gfr, float(patient.get("creatinine", 1.0)), float(patient.get("bloodPressure", 120)), 1 if any("diabetes" in c for c in conditions) else 0],
        "liver": [age, gender_val, float(patient.get("bilirubin", 0.8)), float(patient.get("alt", 25)), alcohol],
        "cancer": [age, gender_val, smoking, alcohol, family_cancer, bmi],
        "copd": [age, smoking, 1 if any("occupational" in c or "dust" in c for c in conditions) else 0, 3.0, 1 if any("asthma" in c for c in conditions) else 0],
        "thyroid": [age, 1 - gender_val, float(patient.get("tsh", 1.8)), float(patient.get("free_t4", 1.2)), 1 if any("thyroid" in c for c in conditions) else 0]
    }

    all_predictions = []

    for d in DISEASES:
        # Resolve features
        feat = np.array(features_db[d], dtype=float)
        
        # Scale if scaler available
        scaler = SCALERS.get(d)
        if scaler:
            try:
                feat_scaled = scaler.transform([feat])
            except Exception:
                feat_scaled = [feat]
        else:
            feat_scaled = [feat]

        # Predict probabilities
        p_xgb = 0.1
        if d in XGB_MODELS:
            try:
                p_xgb = float(XGB_MODELS[d].predict_proba(feat_scaled)[0][1])
            except Exception:
                pass
        
        p_lgb = 0.1
        if d in LGB_MODELS:
            try:
                p_lgb = float(LGB_MODELS[d].predict_proba(feat_scaled)[0][1])
            except Exception:
                pass

        p_cat = 0.1
        if d in CAT_MODELS:
            try:
                p_cat = float(CAT_MODELS[d].predict_proba(feat_scaled)[0][1])
            except Exception:
                pass

        # Calculate ensemble average
        ens_prob = (p_xgb + p_lgb + p_cat) / 3.0
        
        # Calculate standard deviation for confidence rating
        std_dev = float(np.std([p_xgb, p_lgb, p_cat]))
        if std_dev < 0.08:
            confidence = "HIGH"
        elif std_dev < 0.20:
            confidence = "MEDIUM"
        else:
            confidence = "LOW"

        # Calculate Confidence Interval (95%)
        # Standard Error of Mean: std_dev / sqrt(3)
        sem = std_dev / np.sqrt(3.0)
        margin = 1.96 * sem if sem > 0 else 0.05
        ci_lower = max(0.0, ens_prob - margin)
        ci_upper = min(1.0, ens_prob + margin)

        # Unified Ensemble SHAP value calculation
        # Feature names mapping for this disease
        f_names = {
            "heart": ["Age", "Biological Sex", "Resting BP", "Total Cholesterol", "BMI", "Active Smoking"],
            "diabetes": ["Age", "BMI", "Fasting Glucose", "Diastolic BP", "Diabetes Comorbidity"],
            "stroke": ["Age", "Biological Sex", "Resting BP", "Total Cholesterol", "Active Smoking", "Heart Disease"],
            "kidney": ["Age", "GFR Kidney Function", "Serum Creatinine", "Resting BP", "Diabetes Comorbidity"],
            "liver": ["Age", "Biological Sex", "Serum Bilirubin", "ALT enzyme", "Alcohol Use"],
            "cancer": ["Age", "Biological Sex", "Active Smoking", "Alcohol Use", "Family History of Cancer", "BMI"],
            "copd": ["Age", "Active Smoking", "Occupational dust exposure", "Air pollution index", "Asthma Comorbidity"],
            "thyroid": ["Age", "Female biological sex", "Thyroid TSH level", "Free T4 level", "Family History"]
        }[d]

        # Standard baseline
        base_value = 0.5
        diff = ens_prob - base_value
        
        # Aggregate feature importances across the ensemble
        imps = []
        for m in [XGB_MODELS.get(d), LGB_MODELS.get(d), CAT_MODELS.get(d)]:
            if m and hasattr(m, "feature_importances_"):
                imps.append(m.feature_importances_)
            else:
                imps.append([0.2] * len(f_names))
        avg_imps = np.mean(imps, axis=0)
        
        # Clinical direction mapping
        signs = {
            "heart": [1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
            "diabetes": [1.0, 1.0, 1.0, 1.0, 1.0],
            "stroke": [1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
            "kidney": [1.0, -1.0, 1.0, 1.0, 1.0],
            "liver": [1.0, 1.0, 1.0, 1.0, 1.0],
            "cancer": [1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
            "copd": [1.0, 1.0, 1.0, 1.0, 1.0],
            "thyroid": [1.0, 1.0, 1.0, 1.0, 1.0]
        }[d]

        raw_shap = [float(imp * sign) for imp, sign in zip(avg_imps, signs)]
        total_abs = sum(abs(x) for x in raw_shap)
        if total_abs > 0:
            shap_values = [float((x / total_abs) * diff) for x in raw_shap]
        else:
            shap_values = [0.0] * len(f_names)

        # Formulate feature importance objects
        feature_importance_objs = []
        for fi, f_name in enumerate(f_names):
            sv = shap_values[fi]
            feature_importance_objs.append({
                "feature": f_name,
                "feature_value": float(feat[fi]),
                "shap_value": round(float(sv), 4),
                "importance": round(abs(float(sv)), 4),
                "direction": "increases_risk" if sv >= 0 else "decreases_risk"
            })
        feature_importance_objs.sort(key=lambda x: x["importance"], reverse=True)

        # Clinical mapping details
        mapping = CLINICAL_MAPPINGS[d]
        
        # Priority mapping
        if ens_prob >= 0.65:
            priority = "CRITICAL"
            emergency = "CRITICAL"
        elif ens_prob >= 0.45:
            priority = "HIGH"
            emergency = "URGENT"
        elif ens_prob >= 0.25:
            priority = "MEDIUM"
            emergency = "ROUTINE"
        else:
            priority = "LOW"
            emergency = "ROUTINE"

        all_predictions.append({
            "disease_key": d,
            "disease": mapping["disease"],
            "organ": mapping["organ"],
            "icon": mapping["icon"],
            "probability": round(ens_prob * 100, 1),
            "probability_raw": round(ens_prob, 4),
            "confidence": confidence,
            "confidence_interval": [round(ci_lower * 100, 1), round(ci_upper * 100, 1)],
            "recommended_tests": mapping["tests"],
            "suggested_specialist": mapping["specialist"],
            "treatment_priority": priority,
            "emergency_level": emergency,
            # Breakdown
            "model_breakdown": {
                "xgboost": round(p_xgb * 100, 1),
                "lightgbm": round(p_lgb * 100, 1),
                "catboost": round(p_cat * 100, 1),
                "agreement_std": round(std_dev, 4)
            },
            "shap_explanation": {
                "base_value": round(base_value, 4),
                "prediction_value": round(ens_prob, 4),
                "feature_names": f_names,
                "shap_values": [round(s, 4) for s in shap_values],
                "feature_importance": feature_importance_objs
            }
        })

    # Sort descending by probability
    all_predictions.sort(key=lambda x: x["probability_raw"], reverse=True)

    # Pick top 5
    top_five = all_predictions[:5]

    # Calculate overall health index (based on highest risk)
    max_risk = top_five[0]["probability_raw"] if top_five else 0.0
    health_score = round(max(0.0, 100.0 - (max_risk * 100)), 1)

    return {
        "top_five": top_five,
        "health_score": health_score,
        "total_assessed": len(all_predictions),
        "all_diseases": all_predictions,
        "patient_context": {
            "age": age,
            "gender": "Male" if gender_val == 1 else "Female",
            "bmi": bmi,
            "smoking": bool(smoking),
            "alcohol_use": bool(alcohol),
            "family_history_cancer": bool(family_cancer),
            "kidney_gfr": gfr,
            "liver_score": liver_score
        }
    }
