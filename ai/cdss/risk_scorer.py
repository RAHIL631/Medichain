# ai/cdss/risk_scorer.py
# Patient Health Risk Scorer — combines all 5 organ risk predictions
# into structured health risk profile with urgent flags and monitoring guidance.

from flask import Blueprint, request, jsonify
from datetime import date
import logging

from .disease_predictor import predict_all_diseases

logger = logging.getLogger("cdss.risk")

risk_bp = Blueprint('risk', __name__)

RISK_THRESHOLDS = {
    "VERY HIGH": {"score_min": 75, "color": "#EF4444", "urgency": "URGENT", "monitoring": "Weekly"},
    "HIGH":      {"score_min": 55, "color": "#F97316", "urgency": "PRIORITY", "monitoring": "Monthly"},
    "MODERATE":  {"score_min": 35, "color": "#EAB308", "urgency": "ROUTINE", "monitoring": "Quarterly"},
    "LOW":       {"score_min": 15, "color": "#22C55E", "urgency": "ROUTINE", "monitoring": "Annually"},
    "MINIMAL":   {"score_min": 0,  "color": "#10B981", "urgency": "ROUTINE", "monitoring": "Annually"},
}

ORGAN_LABELS = {
    "heart":    {"label": "Cardiovascular", "icon": "❤️",  "organ_key": "heart"},
    "kidney":   {"label": "Renal",          "icon": "🫘",  "organ_key": "kidney"},
    "liver":    {"label": "Hepatic",        "icon": "🟤",  "organ_key": "liver"},
    "diabetes": {"label": "Endocrine",      "icon": "🩸",  "organ_key": "diabetes"},
    "stroke":   {"label": "Neurological",   "icon": "🧠",  "organ_key": "stroke"},
}


def compute_health_risks(patient: dict) -> dict:
    """
    Compute comprehensive patient health risk profile.
    
    Returns:
        organ_risks: dict of per-organ risk data (for radar chart)
        overall_risk: str
        overall_risk_score: 0-100
        urgent_flags: list of urgent clinical flags
        monitoring_schedule: dict of recommended monitoring
        lifestyle_recommendations: list of evidence-based lifestyle changes
    """
    # Get disease predictions
    prediction_result = predict_all_diseases(patient)
    predictions = prediction_result["predictions"]
    
    # Build per-organ risk data (mapped by disease_key)
    organ_risks = {}
    for pred in predictions:
        key = pred["disease_key"]
        prob = pred["probability"]  # 0-100 scale
        level = pred["risk_level"]
        
        meta = ORGAN_LABELS.get(key, {"label": key, "icon": "🏥", "organ_key": key})
        threshold = RISK_THRESHOLDS.get(level, RISK_THRESHOLDS["MINIMAL"])
        
        organ_risks[key] = {
            "disease": pred["disease"],
            "label": meta["label"],
            "icon": meta["icon"],
            "risk_score": prob,
            "risk_level": level,
            "color": threshold["color"],
            "urgency": threshold["urgency"],
            "recommended_monitoring": threshold["monitoring"],
            "model_used": pred["model_used"]
        }
    
    # Overall score = weighted mean biased towards worst
    probs = [p["probability_raw"] for p in predictions]
    if probs:
        max_prob = max(probs)
        mean_prob = sum(probs) / len(probs)
        # Weight 60% towards max, 40% towards mean
        overall_score = round((max_prob * 0.6 + mean_prob * 0.4) * 100, 1)
    else:
        overall_score = 0
    
    # Map to risk label
    risk_order = ["VERY HIGH", "HIGH", "MODERATE", "LOW", "MINIMAL"]
    overall_risk = prediction_result["overall_risk"]
    
    # ── Urgent flags ──────────────────────────────────────────────────────────
    urgent_flags = []
    
    very_high = [p for p in predictions if p["risk_level"] == "VERY HIGH"]
    high = [p for p in predictions if p["risk_level"] == "HIGH"]
    
    for p in very_high:
        urgent_flags.append({
            "flag": f"CRITICAL RISK: {p['disease']} ({p['probability']}%)",
            "action": f"Immediate specialist referral for {p['disease']} assessment",
            "urgency": "IMMEDIATE",
            "color": "#EF4444"
        })
    
    for p in high:
        urgent_flags.append({
            "flag": f"HIGH RISK: {p['disease']} ({p['probability']}%)",
            "action": f"Schedule {p['disease']} screening within 30 days",
            "urgency": "WITHIN_30_DAYS",
            "color": "#F97316"
        })
    
    # Clinical flags from patient profile
    age = int(patient.get("age", 45))
    gfr = float(patient.get("kidney_gfr", 90))
    bmi = float(patient.get("bmi", 25))
    bp = float(patient.get("bloodPressure", 120))
    glucose = float(patient.get("glucose", 100))
    
    if gfr < 30:
        urgent_flags.append({
            "flag": f"Severe CKD: GFR={gfr} mL/min",
            "action": "Nephrology consultation; all medications require dose adjustment",
            "urgency": "URGENT",
            "color": "#EF4444"
        })
    elif gfr < 60:
        urgent_flags.append({
            "flag": f"Moderate CKD: GFR={gfr} mL/min",
            "action": "Nephrology review; monitor electrolytes monthly",
            "urgency": "WITHIN_30_DAYS",
            "color": "#F97316"
        })
    
    if bp > 160:
        urgent_flags.append({
            "flag": f"Stage 2 Hypertension: BP={bp} mmHg",
            "action": "Antihypertensive therapy initiation or optimization required",
            "urgency": "WITHIN_7_DAYS",
            "color": "#EF4444"
        })
    elif bp > 140:
        urgent_flags.append({
            "flag": f"Stage 1 Hypertension: BP={bp} mmHg",
            "action": "Blood pressure review and lifestyle counselling",
            "urgency": "WITHIN_30_DAYS",
            "color": "#F97316"
        })
    
    if glucose > 200:
        urgent_flags.append({
            "flag": f"Hyperglycemia: Glucose={glucose} mg/dL",
            "action": "Urgent diabetes assessment; HbA1c measurement required",
            "urgency": "WITHIN_7_DAYS",
            "color": "#EF4444"
        })
    elif glucose > 126:
        urgent_flags.append({
            "flag": f"Elevated Glucose: {glucose} mg/dL (possible diabetes)",
            "action": "Fasting glucose and HbA1c testing",
            "urgency": "WITHIN_30_DAYS",
            "color": "#F97316"
        })
    
    # ── Monitoring schedule ───────────────────────────────────────────────────
    monitoring = {
        "blood_glucose": "Quarterly" if organ_risks.get("diabetes", {}).get("risk_score", 0) > 40 else "Annually",
        "blood_pressure": "Monthly" if bp > 140 else "Quarterly",
        "kidney_function": "Monthly" if gfr < 30 else ("Quarterly" if gfr < 60 else "Annually"),
        "liver_enzymes": "Quarterly" if organ_risks.get("liver", {}).get("risk_score", 0) > 40 else "Annually",
        "cholesterol": "Annually" if organ_risks.get("heart", {}).get("risk_score", 0) > 40 else "Every 2 years",
        "cardiac_assessment": "Annually" if organ_risks.get("heart", {}).get("risk_score", 0) > 55 else "As needed",
    }
    
    # ── Lifestyle recommendations ─────────────────────────────────────────────
    lifestyle_recs = ["Maintain adequate hydration (2–3L water daily)"]
    
    if bmi > 30:
        lifestyle_recs.append(f"Weight management: Target BMI 18.5–24.9 (current: {bmi:.1f})")
    
    if patient.get("smoking"):
        lifestyle_recs.append("Smoking cessation: Single most impactful cardiovascular risk reduction")
    
    if organ_risks.get("heart", {}).get("risk_score", 0) > 30:
        lifestyle_recs.append("Cardiovascular: 150 min/week moderate aerobic exercise; Mediterranean diet")
    
    if organ_risks.get("diabetes", {}).get("risk_score", 0) > 30:
        lifestyle_recs.append("Glucose management: Reduce refined carbohydrates; increase fiber intake")
    
    if organ_risks.get("kidney", {}).get("risk_score", 0) > 30:
        lifestyle_recs.append("Renal health: Limit sodium (<2g/day); avoid nephrotoxic NSAIDs")
    
    if organ_risks.get("liver", {}).get("risk_score", 0) > 30:
        lifestyle_recs.append("Hepatic health: Limit alcohol; avoid hepatotoxic supplements")
    
    if bp > 130:
        lifestyle_recs.append("DASH diet: Reduce sodium, increase potassium-rich foods")
    
    lifestyle_recs.append("Annual comprehensive health review with your primary care physician")
    
    return {
        "organ_risks": organ_risks,
        "overall_risk": overall_risk,
        "overall_risk_score": overall_score,
        "predictions_ranked": predictions,
        "urgent_flags": urgent_flags,
        "monitoring_schedule": monitoring,
        "lifestyle_recommendations": lifestyle_recs,
        "risk_factors_detected": prediction_result.get("risk_factors_detected", []),
        "risk_summary": {
            "organs_assessed": len(organ_risks),
            "high_risk_organs": len([o for o in organ_risks.values() if o["risk_score"] > 55]),
            "urgent_actions_required": len([f for f in urgent_flags if f["urgency"] in ["IMMEDIATE", "WITHIN_7_DAYS"]])
        }
    }


# ── Blueprint Routes ──────────────────────────────────────────────────────────

@risk_bp.route('/cdss/risks', methods=['POST'])
def patient_risks():
    """
    POST /cdss/risks
    Body: patient features dict
    Returns: comprehensive 5-organ health risk profile
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
        
        logger.info(f"Health risk assessment for age={data.get('age')}")
        result = compute_health_risks(data)
        
        return jsonify(result), 200

    except Exception as e:
        logger.error(f"Risk scoring error: {e}")
        return jsonify({"error": "Risk scoring failed", "details": str(e)}), 500
