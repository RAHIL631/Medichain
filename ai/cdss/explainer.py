# ai/cdss/explainer.py
# SHAP-based Explainable AI Module
# Generates SHAP explanations for disease prediction models.
# Returns feature importances and human-readable explanations.

from flask import Blueprint, request, jsonify
import numpy as np
import joblib
import logging
from pathlib import Path

logger = logging.getLogger("cdss.explainer")

BASE_DIR = Path(__file__).parent.parent
MODEL_DIR = BASE_DIR / "models"

# ── Optional SHAP import ──────────────────────────────────────────────────────
try:
    import shap
    SHAP_AVAILABLE = True
    logger.info("✅ SHAP available")
except ImportError:
    SHAP_AVAILABLE = False
    logger.warning("⚠️ SHAP not installed — using fallback feature importance")


FEATURE_NAMES = {
    "heart": [
        "Age", "Sex (M=1)", "Chest Pain Type", "Resting BP", "Cholesterol",
        "Fasting Blood Sugar", "Resting ECG", "Max Heart Rate", "Exercise Angina",
        "ST Depression", "Slope", "Vessels", "Thalassemia"
    ],
    "diabetes": [
        "Pregnancies", "Glucose", "Blood Pressure", "Skin Thickness",
        "Insulin", "BMI", "Diabetes Pedigree", "Age"
    ],
    "stroke": [
        "Gender", "Age", "Hypertension", "Heart Disease", "Ever Married",
        "Work Type", "Residence Type", "Avg Glucose", "BMI", "Smoking Status"
    ],
    "kidney": [
        "Age", "GFR (Kidney Function)", "Creatinine", "Urea", "Sodium",
        "Potassium", "Hemoglobin", "Systolic BP", "Diabetes History",
        "Hypertension History", "BMI"
    ],
    "liver": [
        "Age", "Sex", "Total Bilirubin", "Direct Bilirubin",
        "Alkaline Phosphatase", "ALT", "AST", "Albumin",
        "Child-Pugh Score", "Alcohol Use"
    ],
    "cancer": [
        "Age", "Sex (M=1)", "Smoking", "Alcohol Use", "Family History", "BMI", "Physical Inactivity", "Chronic Inflammation"
    ],
}

# Feature descriptions for plain-English explanation
FEATURE_CLINICAL_CONTEXT = {
    "Age": "Patient age — older patients have higher baseline risk for most conditions",
    "Glucose": "Blood glucose level — elevated glucose strongly indicates diabetes risk",
    "BMI": "Body Mass Index — obesity increases risk across multiple organ systems",
    "Resting BP": "Blood pressure — hypertension is a major modifiable cardiovascular risk factor",
    "Cholesterol": "Total cholesterol — elevated levels contribute to atherosclerosis",
    "GFR (Kidney Function)": "Glomerular Filtration Rate — lower GFR indicates impaired kidney function",
    "Creatinine": "Blood creatinine — elevated levels indicate reduced kidney filtration",
    "Hypertension": "Pre-existing hypertension significantly increases stroke and kidney disease risk",
    "Heart Disease": "Existing cardiac conditions increase stroke risk",
    "Smoking Status": "Active or former smoking is a major risk factor for cardiovascular disease",
    "Sex (M=1)": "Biological sex affects risk — males have higher risk of certain conditions",
    "Max Heart Rate": "Maximum heart rate achieved during exercise — lower max HR may indicate cardiac dysfunction",
    "Smoking": "Active smoking increases risk of multiple cancers (especially lung, bladder, throat)",
    "Alcohol Use": "Regular alcohol consumption is a known carcinogen linked to liver, breast, and GI cancers",
    "Family History": "Genetics and family history of malignancy increase personal oncology risk",
    "Physical Inactivity": "Sedentary lifestyle reduces metabolic efficiency and increases risk of colon and breast cancers",
    "Chronic Inflammation": "Prolonged systemic inflammation promotes cellular mutation and tumor progression",
}


def _fallback_importance(model, feature_names: list, n_features: int) -> list:
    """Extract feature importance directly from sklearn/XGBoost when SHAP fails."""
    importance = []
    raw_importance = None
    
    try:
        if hasattr(model, 'feature_importances_'):
            raw_importance = model.feature_importances_
        elif hasattr(model, 'coef_'):
            raw_importance = np.abs(model.coef_[0]) if model.coef_.ndim > 1 else np.abs(model.coef_)
    except Exception:
        pass
    
    if raw_importance is not None and len(raw_importance) >= n_features:
        for i, name in enumerate(feature_names[:n_features]):
            importance.append({
                "feature": name,
                "importance": round(float(raw_importance[i]), 4),
                "shap_value": round(float(raw_importance[i]), 4),
                "clinical_context": FEATURE_CLINICAL_CONTEXT.get(name, "")
            })
        importance.sort(key=lambda x: abs(x["importance"]), reverse=True)
    else:
        # Equal importance fallback
        for name in feature_names[:n_features]:
            importance.append({
                "feature": name,
                "importance": round(1.0 / max(n_features, 1), 4),
                "shap_value": 0.0,
                "clinical_context": FEATURE_CLINICAL_CONTEXT.get(name, "")
            })
    
    return importance


def explain_prediction(
    disease_key: str,
    feature_vector: np.ndarray,
    model,
    scaler=None
) -> dict:
    """
    Generate SHAP explanation for a single prediction.
    
    Args:
        disease_key: one of heart/diabetes/stroke/kidney/liver
        feature_vector: raw (unscaled) feature array
        model: trained classifier
        scaler: fitted StandardScaler (optional)
    
    Returns:
        shap_values: per-feature SHAP values
        feature_importance: sorted list of features by impact
        base_value: expected model output (baseline)
        explanation_text: plain-English explanation
    """
    names = FEATURE_NAMES.get(disease_key, [f"Feature {i}" for i in range(len(feature_vector))])
    n = len(feature_vector)
    
    scaled = scaler.transform([feature_vector]) if scaler else [feature_vector]
    
    shap_values_list = None
    base_value = 0.5
    
    if SHAP_AVAILABLE:
        try:
            # TreeExplainer for tree-based models (RF, XGBoost, GBM)
            if hasattr(model, 'predict_proba'):
                explainer = shap.TreeExplainer(model)
                sv = explainer.shap_values(np.array(scaled))
                base_value = float(explainer.expected_value[1]) if hasattr(explainer.expected_value, '__len__') else float(explainer.expected_value)
                
                # Handle multi-output SHAP
                if isinstance(sv, list):
                    sv = sv[1]  # class 1 (disease present)
                
                shap_values_list = sv[0].tolist() if hasattr(sv[0], 'tolist') else list(sv[0])
        except Exception as e:
            logger.warning(f"SHAP TreeExplainer failed for {disease_key}: {e}")
            # Try LinearExplainer fallback
            try:
                background = np.zeros((1, n))
                explainer = shap.KernelExplainer(model.predict_proba, background)
                sv = explainer.shap_values(np.array(scaled), nsamples=50)
                shap_values_list = sv[0].tolist() if isinstance(sv[0], np.ndarray) else list(sv[0])
                base_value = float(explainer.expected_value[1]) if hasattr(explainer.expected_value, '__len__') else 0.5
            except Exception as e2:
                logger.warning(f"SHAP KernelExplainer also failed: {e2}")
    
    # ── Build feature importance list ─────────────────────────────────────────
    if shap_values_list and len(shap_values_list) >= n:
        feature_importance = []
        for i, name in enumerate(names[:n]):
            sv = shap_values_list[i] if i < len(shap_values_list) else 0.0
            feature_importance.append({
                "feature": name,
                "feature_value": round(float(feature_vector[i]), 3),
                "shap_value": round(float(sv), 4),
                "importance": round(abs(float(sv)), 4),
                "direction": "increases_risk" if sv > 0 else "decreases_risk",
                "clinical_context": FEATURE_CLINICAL_CONTEXT.get(name, "")
            })
        feature_importance.sort(key=lambda x: x["importance"], reverse=True)
        shap_raw = shap_values_list
        method = "SHAP_TreeExplainer"
    else:
        feature_importance = _fallback_importance(model, names, n)
        shap_raw = [f["shap_value"] for f in feature_importance]
        method = "feature_importance_fallback"
    
    # ── Generate plain-English explanation ────────────────────────────────────
    top_positive = [f for f in feature_importance if f.get("direction") == "increases_risk"][:3]
    top_negative = [f for f in feature_importance if f.get("direction") == "decreases_risk"][:2]
    
    explanation_parts = []
    
    if top_positive:
        pos_str = ", ".join([f"**{f['feature']}** ({f['feature_value']})" for f in top_positive])
        explanation_parts.append(f"The factors most contributing to elevated risk are: {pos_str}.")
    
    if top_negative:
        neg_str = ", ".join([f"**{f['feature']}**" for f in top_negative])
        explanation_parts.append(f"Protective factors reducing risk include: {neg_str}.")
    
    explanation_parts.append(
        "The model's prediction is based on the combined effect of all these factors. "
        "Individual factors are not independently diagnostic — this is a population-level statistical estimate."
    )
    
    return {
        "disease": disease_key,
        "shap_values": shap_raw,
        "feature_names": names[:n],
        "feature_importance": feature_importance[:10],  # Top 10
        "base_value": base_value,
        "explanation_text": " ".join(explanation_parts),
        "method": method,
        "shap_available": SHAP_AVAILABLE
    }


def explain_all_diseases(patient_features: dict) -> dict:
    """
    Generate SHAP explanations for all available trained models.
    """
    from .disease_predictor import XGB_MODELS, XGB_SCALERS, SKLEARN_MODELS, SKLEARN_SCALERS
    import numpy as np
    
    explanations = {}
    
    # Heart explanation
    model_h = XGB_MODELS.get("heart") or SKLEARN_MODELS.get("heart")
    scaler_h = XGB_SCALERS.get("heart") or SKLEARN_SCALERS.get("heart")
    if model_h:
        f = np.array([
            patient_features.get("age", 45),
            1 if str(patient_features.get("gender", "M")).upper().startswith("M") else 0,
            patient_features.get("chest_pain_type", 0),
            patient_features.get("bloodPressure", 120),
            patient_features.get("cholesterol", 200),
            1 if patient_features.get("glucose", 100) > 126 else 0,
            0, 150, 0, 0.0, 1, 0, 2
        ], dtype=float)
        try:
            explanations["heart"] = explain_prediction("heart", f, model_h, scaler_h)
        except Exception as e:
            logger.error(f"Heart explanation failed: {e}")
    
    # Diabetes explanation
    model_d = XGB_MODELS.get("diabetes") or SKLEARN_MODELS.get("diabetes")
    scaler_d = XGB_SCALERS.get("diabetes") or SKLEARN_SCALERS.get("diabetes")
    if model_d:
        f = np.array([
            patient_features.get("pregnancies", 0),
            patient_features.get("glucose", 100),
            patient_features.get("bloodPressure", 80),
            patient_features.get("skin_thickness", 20),
            patient_features.get("insulin", 80),
            patient_features.get("bmi", 25.0),
            patient_features.get("diabetes_pedigree", 0.5),
            patient_features.get("age", 45)
        ], dtype=float)
        try:
            explanations["diabetes"] = explain_prediction("diabetes", f, model_d, scaler_d)
        except Exception as e:
            logger.error(f"Diabetes explanation failed: {e}")
    
    # Stroke explanation
    model_s = XGB_MODELS.get("stroke") or SKLEARN_MODELS.get("stroke")
    scaler_s = XGB_SCALERS.get("stroke") or SKLEARN_SCALERS.get("stroke")
    if model_s:
        conditions = [str(c).lower() for c in patient_features.get("chronicConditions", [])]
        f = np.array([
            1 if str(patient_features.get("gender", "M")).upper().startswith("M") else 0,
            patient_features.get("age", 45),
            1 if any("hypertension" in c for c in conditions) else 0,
            1 if any("heart" in c for c in conditions) else 0,
            1 if patient_features.get("married", True) else 0,
            1, 1,
            patient_features.get("glucose", 100),
            patient_features.get("bmi", 25.0),
            1 if patient_features.get("smoking", False) else 0
        ], dtype=float)
        try:
            explanations["stroke"] = explain_prediction("stroke", f, model_s, scaler_s)
        except Exception as e:
            logger.error(f"Stroke explanation failed: {e}")

    # Kidney explanation
    model_k = XGB_MODELS.get("kidney") or SKLEARN_MODELS.get("kidney")
    scaler_k = XGB_SCALERS.get("kidney") or SKLEARN_SCALERS.get("kidney")
    if model_k:
        f = np.array([
            patient_features.get("age", 45),
            patient_features.get("kidney_gfr", 90),
            patient_features.get("creatinine", 1.0),
            patient_features.get("urea", 20),
            patient_features.get("sodium", 140),
            patient_features.get("potassium", 4.0),
            patient_features.get("hemoglobin", 13.5),
            patient_features.get("bloodPressure", 120),
            1 if any("diabet" in c for c in conditions) else 0,
            1 if any("hypertension" in c or "blood pressure" in c for c in conditions) else 0,
            patient_features.get("bmi", 25.0)
        ], dtype=float)
        try:
            explanations["kidney"] = explain_prediction("kidney", f, model_k, scaler_k)
        except Exception as e:
            logger.error(f"Kidney explanation failed: {e}")

    # Liver explanation
    model_l = XGB_MODELS.get("liver") or SKLEARN_MODELS.get("liver")
    scaler_l = XGB_SCALERS.get("liver") or SKLEARN_SCALERS.get("liver")
    if model_l:
        f = np.array([
            patient_features.get("age", 45),
            1 if str(patient_features.get("gender", "M")).upper().startswith("M") else 0,
            patient_features.get("total_bilirubin", 0.8),
            patient_features.get("direct_bilirubin", 0.2),
            patient_features.get("alkaline_phosphatase", 90),
            patient_features.get("alt", 25),
            patient_features.get("ast", 25),
            patient_features.get("albumin", 4.0),
            patient_features.get("liver_score", 0),
            1 if patient_features.get("alcohol_use", False) else 0
        ], dtype=float)
        try:
            explanations["liver"] = explain_prediction("liver", f, model_l, scaler_l)
        except Exception as e:
            logger.error(f"Liver explanation failed: {e}")

    # Cancer explanation
    model_c = XGB_MODELS.get("cancer") or SKLEARN_MODELS.get("cancer")
    scaler_c = XGB_SCALERS.get("cancer") or SKLEARN_SCALERS.get("cancer")
    if model_c:
        f = np.array([
            patient_features.get("age", 45),
            1 if str(patient_features.get("gender", "M")).upper().startswith("M") else 0,
            1 if patient_features.get("smoking", False) else 0,
            1 if patient_features.get("alcohol_use", False) else 0,
            1 if patient_features.get("family_history_cancer", False) else 0,
            patient_features.get("bmi", 25.0),
            1 if patient_features.get("physical_inactivity", False) else 0,
            1 if patient_features.get("chronic_inflammation", False) else 0
        ], dtype=float)
        try:
            explanations["cancer"] = explain_prediction("cancer", f, model_c, scaler_c)
        except Exception as e:
            logger.error(f"Cancer explanation failed: {e}")

    return {
        "explanations": explanations,
        "shap_available": SHAP_AVAILABLE,
        "models_explained": list(explanations.keys())
    }


# ── Blueprint (no HTTP routes — called internally by /cdss/analyze) ───────────
# The explainer is invoked from the main CDSS analyze pipeline.
# If standalone API is needed, uncomment below:

from flask import Blueprint
explainer_bp = Blueprint('explainer', __name__)

@explainer_bp.route('/cdss/explain', methods=['POST'])
def explain():
    """
    POST /cdss/explain
    Body: patient features dict
    Returns: SHAP explanations for all available disease models
    """
    try:
        data = request.get_json(silent=True) or {}
        result = explain_all_diseases(data)
        return jsonify(result), 200
    except Exception as e:
        logger.error(f"Explainer error: {e}")
        return jsonify({"error": "Explanation failed", "details": str(e)}), 500
