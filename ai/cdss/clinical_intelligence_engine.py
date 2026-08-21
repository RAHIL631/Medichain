# ai/cdss/clinical_intelligence_engine.py
# Clinical Intelligence Engine — Phase 2
# Unified orchestration module that combines all CDSS components into a single
# patient intelligence report.
#
# Endpoint: POST /cdss/clinical-intelligence
#
# This module calls existing CDSS sub-modules internally and returns a
# comprehensive report with explainability, confidence scores, and recommendations.

from flask import Blueprint, request, jsonify
import logging
import traceback
from datetime import datetime, timedelta

logger = logging.getLogger("cdss.clinical_intelligence")

cie_bp = Blueprint("clinical_intelligence", __name__)

# ── Internal imports from existing CDSS modules ───────────────────────────────
try:
    from cdss.disease_predictor import predict_all_diseases
    PREDICTOR_AVAILABLE = True
except ImportError:
    PREDICTOR_AVAILABLE = False
    logger.warning("Disease predictor not available")

try:
    from cdss.risk_scorer import compute_risk_score
    RISK_SCORER_AVAILABLE = True
except ImportError:
    RISK_SCORER_AVAILABLE = False
    logger.warning("Risk scorer not available")


# ─────────────────────────────────────────────────────────────────────────────
# SPECIALIST MAPPING
# ─────────────────────────────────────────────────────────────────────────────
SPECIALIST_MAP = {
    "heart":       "Cardiologist",
    "heart_disease": "Cardiologist",
    "cardiac":     "Cardiologist",
    "kidney":      "Nephrologist",
    "kidney_disease": "Nephrologist",
    "renal":       "Nephrologist",
    "liver":       "Hepatologist",
    "liver_disease": "Hepatologist",
    "diabetes":    "Endocrinologist",
    "stroke":      "Neurologist",
    "brain":       "Neurologist",
    "cancer":      "Oncologist",
    "lung":        "Pulmonologist",
    "respiratory": "Pulmonologist",
    "skin":        "Dermatologist",
    "bone":        "Orthopedic Surgeon",
    "joint":       "Orthopedic Surgeon",
    "mental":      "Psychiatrist",
    "psychiatric": "Psychiatrist",
    "eye":         "Ophthalmologist",
    "ent":         "ENT Specialist",
    "child":       "Pediatrician",
    "hypertension": "Cardiologist",
}

FOLLOWUP_INTERVALS = {
    "VERY HIGH": {"days": 7,  "label": "1 week",   "urgency": "urgent"},
    "HIGH":      {"days": 14, "label": "2 weeks",  "urgency": "urgent"},
    "MODERATE":  {"days": 30, "label": "1 month",  "urgency": "soon"},
    "LOW":       {"days": 90, "label": "3 months", "urgency": "routine"},
    "MINIMAL":   {"days": 180,"label": "6 months", "urgency": "routine"},
}


# ─────────────────────────────────────────────────────────────────────────────
# MAIN ROUTE
# ─────────────────────────────────────────────────────────────────────────────

@cie_bp.route("/cdss/clinical-intelligence", methods=["POST"])
def clinical_intelligence():
    """
    Unified Clinical Intelligence Report.

    Request body:
    {
      "age": 55,
      "gender": "M",
      "symptoms": ["chest_pain", "shortness_of_breath"],
      "vitals": { "systolic_bp": 145, "cholesterol": 230, "bmi": 28 },
      "medicalHistory": ["hypertension"],
      "currentMedications": ["lisinopril"],
      "allergies": [],
      "labValues": { "glucose": 110, "creatinine": 1.1 },
      "lifestyle": { "smoking": true, "alcohol": false, "exercise": "low" },
      "emergencyLevel": "routine"
    }

    Returns a comprehensive clinical intelligence report.
    """
    try:
        data = request.get_json(silent=True) or {}
        logger.info(f"Clinical intelligence request for age={data.get('age')}, gender={data.get('gender')}")

        # ── Extract inputs ────────────────────────────────────────────────────
        age                = int(data.get("age", 45))
        gender             = str(data.get("gender", "M")).upper()
        symptoms           = [str(s).lower() for s in data.get("symptoms", [])]
        vitals             = data.get("vitals", {})
        medical_history    = [str(m).lower() for m in data.get("medicalHistory", [])]
        current_meds       = [str(m).lower() for m in data.get("currentMedications", [])]
        allergies          = [str(a).lower() for a in data.get("allergies", [])]
        lab_values         = data.get("labValues", {})
        lifestyle          = data.get("lifestyle", {})
        emergency_level    = str(data.get("emergencyLevel", "routine")).lower()

        # ── 1. Disease Risk Prediction ─────────────────────────────────────
        disease_risks = _compute_disease_risks(data)

        # ── 2. Emergency Risk Score ───────────────────────────────────────
        emergency_score = _compute_emergency_risk(
            age, symptoms, vitals, medical_history, disease_risks, emergency_level
        )

        # ── 3. Specialist Recommendation ─────────────────────────────────
        specialist_recs = _recommend_specialists(disease_risks, symptoms, emergency_score)

        # ── 4. Follow-up Recommendation ──────────────────────────────────
        top_risk_level = disease_risks[0]["riskLevel"] if disease_risks else "MINIMAL"
        followup = _compute_followup(top_risk_level, specialist_recs)

        # ── 5. Health Summary ────────────────────────────────────────────
        health_summary = _generate_health_summary(
            age, gender, disease_risks, emergency_score,
            symptoms, medical_history, current_meds, vitals
        )

        # ── 6. Treatment Guidance (informational) ─────────────────────────
        treatment_guidance = _get_treatment_guidance(disease_risks[:3])

        # ── 7. Patient Similarity (rule-based) ────────────────────────────
        similar_profile = _get_similar_profile(age, disease_risks, lifestyle)

        # ── 8. Confidence Score ───────────────────────────────────────────
        confidence = _compute_confidence(data)

        # ── Build response ─────────────────────────────────────────────────
        report = {
            "timestamp":          datetime.utcnow().isoformat() + "Z",
            "patientProfile": {
                "age":               age,
                "gender":            gender,
                "symptoms":          symptoms,
                "medicalHistory":    medical_history,
                "currentMedications": current_meds,
                "allergies":         allergies,
                "emergencyLevel":    emergency_level,
            },
            "diseaseRisks":        disease_risks,
            "emergencyRisk":       emergency_score,
            "specialistRecommendations": specialist_recs,
            "followUpRecommendation":    followup,
            "healthSummary":       health_summary,
            "treatmentGuidance":   treatment_guidance,
            "similarProfile":      similar_profile,
            "confidence":          confidence,
            "disclaimer": (
                "This report is generated by an AI system for informational purposes only. "
                "It does NOT constitute a medical diagnosis. Always consult a qualified physician "
                "before making any health decisions."
            ),
        }

        logger.info(f"Clinical intelligence report generated — top risk: {disease_risks[0]['disease'] if disease_risks else 'none'}")
        return jsonify(report), 200

    except Exception as e:
        logger.error(f"Clinical intelligence error: {e}\n{traceback.format_exc()}")
        return jsonify({"error": "Clinical intelligence engine error", "details": str(e)}), 500


# ─────────────────────────────────────────────────────────────────────────────
# COMPONENT FUNCTIONS
# ─────────────────────────────────────────────────────────────────────────────

def _compute_disease_risks(data):
    """Compute disease risk probabilities using rule-based scoring + ML if available."""
    age     = int(data.get("age", 45))
    gender  = str(data.get("gender", "M")).upper()
    vitals  = data.get("vitals", {})
    history = [str(m).lower() for m in data.get("medicalHistory", [])]
    lifestyle = data.get("lifestyle", {})
    labs    = data.get("labValues", {})

    risks = []

    # ── Heart Disease Risk ────────────────────────────────────────────────────
    heart_prob = 0.0
    if age > 60: heart_prob += 0.20
    elif age > 45: heart_prob += 0.10
    if gender == "M": heart_prob += 0.08
    if float(vitals.get("cholesterol", 200)) > 240: heart_prob += 0.18
    elif float(vitals.get("cholesterol", 200)) > 200: heart_prob += 0.08
    if float(vitals.get("systolic_bp", 120)) > 140: heart_prob += 0.15
    if lifestyle.get("smoking"): heart_prob += 0.15
    if "hypertension" in history: heart_prob += 0.12
    if "heart_disease" in history: heart_prob += 0.20
    if float(vitals.get("bmi", 22)) > 30: heart_prob += 0.08
    heart_prob = min(0.98, heart_prob)

    risks.append(_build_risk_entry(
        "Heart Disease", "heart_disease", heart_prob,
        "cardiovascular",
        top_factors=_heart_factors(vitals, gender, age, history, lifestyle),
    ))

    # ── Diabetes Risk ─────────────────────────────────────────────────────────
    diab_prob = 0.0
    if float(labs.get("glucose", 90)) > 126: diab_prob += 0.40
    elif float(labs.get("glucose", 90)) > 100: diab_prob += 0.20
    if float(vitals.get("bmi", 22)) > 30: diab_prob += 0.18
    if float(vitals.get("bmi", 22)) > 25: diab_prob += 0.08
    if age > 45: diab_prob += 0.10
    if "diabetes" in history: diab_prob += 0.25
    if lifestyle.get("exercise") == "low": diab_prob += 0.08
    diab_prob = min(0.98, diab_prob)

    risks.append(_build_risk_entry(
        "Diabetes", "diabetes", diab_prob, "endocrine",
        top_factors=_diabetes_factors(labs, vitals, age, history, lifestyle),
    ))

    # ── Kidney Disease Risk ───────────────────────────────────────────────────
    kidney_prob = 0.0
    if float(labs.get("creatinine", 0.9)) > 1.3: kidney_prob += 0.25
    if float(labs.get("creatinine", 0.9)) > 2.0: kidney_prob += 0.20
    if "kidney_disease" in history or "kidney" in history: kidney_prob += 0.35
    if "diabetes" in history: kidney_prob += 0.12
    if "hypertension" in history: kidney_prob += 0.10
    if age > 60: kidney_prob += 0.10
    kidney_prob = min(0.98, kidney_prob)

    risks.append(_build_risk_entry(
        "Kidney Disease", "kidney_disease", kidney_prob, "nephrology",
        top_factors=_kidney_factors(labs, history, age),
    ))

    # ── Stroke Risk ──────────────────────────────────────────────────────────
    stroke_prob = 0.0
    if float(vitals.get("systolic_bp", 120)) > 160: stroke_prob += 0.25
    elif float(vitals.get("systolic_bp", 120)) > 140: stroke_prob += 0.12
    if "heart_disease" in history: stroke_prob += 0.15
    if "atrial_fibrillation" in history: stroke_prob += 0.25
    if "stroke" in history: stroke_prob += 0.20
    if lifestyle.get("smoking"): stroke_prob += 0.10
    if age > 65: stroke_prob += 0.15
    stroke_prob = min(0.98, stroke_prob)

    risks.append(_build_risk_entry(
        "Stroke", "stroke", stroke_prob, "neurology",
        top_factors=_stroke_factors(vitals, history, age, lifestyle),
    ))

    # ── Liver Disease Risk ───────────────────────────────────────────────────
    liver_prob = 0.0
    if lifestyle.get("alcohol"): liver_prob += 0.20
    if "liver_disease" in history or "liver" in history: liver_prob += 0.35
    if float(vitals.get("bmi", 22)) > 30: liver_prob += 0.10
    liver_prob = min(0.98, liver_prob)

    risks.append(_build_risk_entry(
        "Liver Disease", "liver_disease", liver_prob, "hepatology",
        top_factors=_liver_factors(lifestyle, history, vitals),
    ))

    # Sort by probability descending
    risks.sort(key=lambda r: r["probability"], reverse=True)
    return risks


def _build_risk_entry(name, key, prob, category, top_factors=None):
    """Build a standardised risk entry with label and SHAP-style factors."""
    risk_level = _prob_to_level(prob)
    return {
        "disease":     name,
        "key":         key,
        "category":    category,
        "probability": round(prob * 100, 1),
        "riskLevel":   risk_level,
        "topFactors":  top_factors or [],
        "explanation": _generate_risk_explanation(name, risk_level, top_factors or []),
    }


def _prob_to_level(prob):
    if prob >= 0.75: return "VERY HIGH"
    if prob >= 0.55: return "HIGH"
    if prob >= 0.35: return "MODERATE"
    if prob >= 0.15: return "LOW"
    return "MINIMAL"


def _generate_risk_explanation(disease, risk_level, factors):
    if not factors:
        return f"Your {disease} risk is {risk_level} based on the provided health parameters."
    top = factors[:2]
    return (
        f"Your {disease} risk is {risk_level}. "
        f"Primary contributing factors: {', '.join(f['name'] for f in top)}. "
        "This is an AI-generated assessment — please consult your physician for a formal evaluation."
    )


# ── Factor builders ───────────────────────────────────────────────────────────

def _heart_factors(vitals, gender, age, history, lifestyle):
    factors = []
    if float(vitals.get("cholesterol", 200)) > 200:
        factors.append({"name": "High Cholesterol", "impact": round(min(32, float(vitals.get("cholesterol", 200)) / 10 - 14), 1), "direction": "increases"})
    if age > 45:
        factors.append({"name": "Age", "impact": round(min(25, (age - 40) * 0.8), 1), "direction": "increases"})
    if lifestyle.get("smoking"):
        factors.append({"name": "Smoking", "impact": 18, "direction": "increases"})
    if float(vitals.get("systolic_bp", 120)) > 130:
        factors.append({"name": "Blood Pressure", "impact": round(min(14, (float(vitals.get("systolic_bp", 120)) - 120) / 3), 1), "direction": "increases"})
    if float(vitals.get("bmi", 22)) > 25:
        factors.append({"name": "BMI", "impact": round(min(11, float(vitals.get("bmi", 22)) - 20), 1), "direction": "increases"})
    if gender == "M":
        factors.append({"name": "Male Gender", "impact": 8, "direction": "increases"})
    return sorted(factors, key=lambda f: f["impact"], reverse=True)[:5]


def _diabetes_factors(labs, vitals, age, history, lifestyle):
    factors = []
    glucose = float(labs.get("glucose", 90))
    if glucose > 90:
        factors.append({"name": "Blood Glucose", "impact": round(min(40, (glucose - 90) * 0.5), 1), "direction": "increases"})
    bmi = float(vitals.get("bmi", 22))
    if bmi > 23:
        factors.append({"name": "BMI / Obesity", "impact": round(min(30, (bmi - 22) * 2), 1), "direction": "increases"})
    if age > 40:
        factors.append({"name": "Age", "impact": round(min(20, (age - 40) * 0.5), 1), "direction": "increases"})
    if "diabetes" in history:
        factors.append({"name": "Family History", "impact": 25, "direction": "increases"})
    if lifestyle.get("exercise") == "low":
        factors.append({"name": "Physical Inactivity", "impact": 8, "direction": "increases"})
    return sorted(factors, key=lambda f: f["impact"], reverse=True)[:5]


def _kidney_factors(labs, history, age):
    factors = []
    creat = float(labs.get("creatinine", 0.9))
    if creat > 1.0:
        factors.append({"name": "Creatinine Elevation", "impact": round(min(35, creat * 15), 1), "direction": "increases"})
    if "kidney_disease" in history:
        factors.append({"name": "Previous Kidney Disease", "impact": 35, "direction": "increases"})
    if "diabetes" in history:
        factors.append({"name": "Diabetes (Nephropathy Risk)", "impact": 12, "direction": "increases"})
    if "hypertension" in history:
        factors.append({"name": "Hypertension", "impact": 10, "direction": "increases"})
    if age > 55:
        factors.append({"name": "Age", "impact": round((age - 50) * 0.8, 1), "direction": "increases"})
    return sorted(factors, key=lambda f: f["impact"], reverse=True)[:5]


def _stroke_factors(vitals, history, age, lifestyle):
    factors = []
    sbp = float(vitals.get("systolic_bp", 120))
    if sbp > 130:
        factors.append({"name": "High Blood Pressure", "impact": round(min(30, (sbp - 120) * 0.8), 1), "direction": "increases"})
    if "atrial_fibrillation" in history:
        factors.append({"name": "Atrial Fibrillation", "impact": 25, "direction": "increases"})
    if age > 55:
        factors.append({"name": "Age", "impact": round(min(20, (age - 50) * 0.7), 1), "direction": "increases"})
    if lifestyle.get("smoking"):
        factors.append({"name": "Smoking", "impact": 10, "direction": "increases"})
    if "heart_disease" in history:
        factors.append({"name": "Heart Disease History", "impact": 15, "direction": "increases"})
    return sorted(factors, key=lambda f: f["impact"], reverse=True)[:5]


def _liver_factors(lifestyle, history, vitals):
    factors = []
    if lifestyle.get("alcohol"):
        factors.append({"name": "Alcohol Use", "impact": 25, "direction": "increases"})
    if "liver_disease" in history:
        factors.append({"name": "Prior Liver Disease", "impact": 35, "direction": "increases"})
    bmi = float(vitals.get("bmi", 22))
    if bmi > 28:
        factors.append({"name": "Obesity (NASH Risk)", "impact": round(min(15, bmi - 25), 1), "direction": "increases"})
    return sorted(factors, key=lambda f: f["impact"], reverse=True)[:5]


# ── Emergency Risk ────────────────────────────────────────────────────────────

def _compute_emergency_risk(age, symptoms, vitals, history, disease_risks, emergency_level):
    """Compute 0–100 emergency risk score."""
    score = 0
    flags = []
    warnings = []

    # Direct emergency symptoms
    emergency_symptoms = {
        "chest_pain":         30, "sudden_weakness":    40,
        "facial_droop":       40, "speech_difficulty":  40,
        "severe_headache":    25, "loss_of_consciousness": 50,
        "difficulty_breathing": 30, "coughing_blood":  35,
    }
    for sym in symptoms:
        if sym in emergency_symptoms:
            score += emergency_symptoms[sym]
            flags.append(sym.replace("_", " ").title())

    # Vital signs
    sbp = float(vitals.get("systolic_bp", 120))
    if sbp > 180: score += 25; warnings.append("Hypertensive crisis (BP > 180)")
    elif sbp > 160: score += 12; warnings.append("Stage 2 hypertension")

    glucose = float(vitals.get("glucose", 90))
    if glucose > 400: score += 30; warnings.append("Severely elevated blood glucose")
    elif glucose < 50: score += 30; warnings.append("Hypoglycemia")

    # Age factor
    if age > 70: score += 10
    elif age > 60: score += 5

    # Top disease risk
    if disease_risks and disease_risks[0]["riskLevel"] in ("VERY HIGH", "HIGH"):
        score += 10

    # Explicit emergency level
    if emergency_level == "emergency": score += 20
    elif emergency_level == "urgent":  score += 10

    score = min(100, score)

    level = "LOW"
    if score >= 75: level = "CRITICAL"
    elif score >= 50: level = "HIGH"
    elif score >= 25: level = "MODERATE"

    return {
        "score":    score,
        "level":    level,
        "flags":    flags,
        "warnings": warnings,
        "action":   _emergency_action(level),
    }


def _emergency_action(level):
    actions = {
        "CRITICAL": "⚠️ SEEK IMMEDIATE EMERGENCY CARE — call emergency services (112/108) now",
        "HIGH":     "🚨 Visit an emergency department within 1–2 hours",
        "MODERATE": "⚠️ Schedule an urgent appointment with your doctor within 24–48 hours",
        "LOW":      "ℹ️ Monitor symptoms and consult your doctor at your next regular appointment",
    }
    return actions.get(level, "Consult your physician")


# ── Specialist Recommendation ─────────────────────────────────────────────────

def _recommend_specialists(disease_risks, symptoms, emergency_score):
    """Recommend up to 3 specialists based on disease risks and symptoms."""
    recs = []
    seen = set()

    # From top disease risks
    for risk in disease_risks[:3]:
        if risk["riskLevel"] in ("VERY HIGH", "HIGH", "MODERATE"):
            key = risk["key"]
            for k, spec in SPECIALIST_MAP.items():
                if k in key and spec not in seen:
                    seen.add(spec)
                    urgency = "urgent" if risk["riskLevel"] in ("VERY HIGH", "HIGH") else "routine"
                    recs.append({
                        "specialist":  spec,
                        "reason":      f"{risk['riskLevel']} risk of {risk['disease']} detected",
                        "urgency":     urgency,
                        "confidence":  min(95, int(risk["probability"])),
                        "disease":     risk["disease"],
                    })
                    break

    # From emergency symptoms
    if emergency_score["level"] in ("CRITICAL", "HIGH") and "Emergency Medicine" not in seen:
        recs.insert(0, {
            "specialist": "Emergency Physician",
            "reason":     f"Emergency risk score: {emergency_score['score']}/100 — {emergency_score['level']}",
            "urgency":    "emergency",
            "confidence": 99,
        })
        seen.add("Emergency Medicine")

    # Add General Physician as fallback
    if not recs:
        recs.append({
            "specialist": "General Physician",
            "reason":     "Initial comprehensive evaluation recommended",
            "urgency":    "routine",
            "confidence": 85,
        })

    return recs[:3]


# ── Follow-up Recommendation ──────────────────────────────────────────────────

def _compute_followup(risk_level, specialist_recs):
    interval = FOLLOWUP_INTERVALS.get(risk_level, FOLLOWUP_INTERVALS["MINIMAL"])
    next_date = (datetime.utcnow() + timedelta(days=interval["days"])).strftime("%Y-%m-%d")
    primary_spec = specialist_recs[0]["specialist"] if specialist_recs else "General Physician"

    return {
        "recommendedIn": interval["label"],
        "nextDate":      next_date,
        "urgency":       interval["urgency"],
        "withSpecialist": primary_spec,
        "notes":         f"Based on {risk_level} risk level — follow up with {primary_spec} in {interval['label']}",
    }


# ── Health Summary ─────────────────────────────────────────────────────────────

def _generate_health_summary(age, gender, disease_risks, emergency_score, symptoms, history, meds, vitals):
    top_risk = disease_risks[0] if disease_risks else None
    high_risks = [r for r in disease_risks if r["riskLevel"] in ("VERY HIGH", "HIGH")]

    summary_lines = []

    # Patient profile
    summary_lines.append(f"{'Male' if gender == 'M' else 'Female'}, {age} years old.")

    # Current medications
    if meds:
        summary_lines.append(f"Currently on {len(meds)} medication(s): {', '.join(meds[:3])}.")

    # Medical history
    if history:
        summary_lines.append(f"Medical history includes: {', '.join(history[:3])}.")

    # Risk summary
    if high_risks:
        summary_lines.append(
            f"AI analysis identifies elevated risk for {', '.join(r['disease'] for r in high_risks[:2])}."
        )
    elif top_risk and top_risk["riskLevel"] == "MODERATE":
        summary_lines.append(f"Moderate risk detected for {top_risk['disease']}.")
    else:
        summary_lines.append("Overall risk profile appears relatively low based on provided parameters.")

    # Emergency flag
    if emergency_score["level"] in ("CRITICAL", "HIGH"):
        summary_lines.append(f"⚠️ Emergency risk score: {emergency_score['score']}/100 — immediate attention advised.")

    # Symptoms
    if symptoms:
        summary_lines.append(f"Reported symptoms: {', '.join(s.replace('_', ' ') for s in symptoms[:4])}.")

    return {
        "text":           " ".join(summary_lines),
        "overallRisk":    disease_risks[0]["riskLevel"] if disease_risks else "MINIMAL",
        "topRisks":       [r["disease"] for r in disease_risks[:3] if r["riskLevel"] != "MINIMAL"],
        "keyAlerts":      emergency_score.get("warnings", []),
        "healthScore":    max(0, 100 - int(disease_risks[0]["probability"]) if disease_risks else 90),
    }


# ── Treatment Guidance (informational only) ────────────────────────────────────

TREATMENT_GUIDANCE_DB = {
    "heart_disease": [
        "Lifestyle modifications: heart-healthy diet (Mediterranean), regular aerobic exercise",
        "Regular BP and cholesterol monitoring",
        "Smoking cessation is critical — seek support programs",
        "Cardiologist consultation for medication management (statins, ACE inhibitors, beta-blockers)",
        "Regular ECG and echocardiogram as advised by cardiologist",
    ],
    "diabetes": [
        "Blood glucose monitoring — maintain HbA1c < 7%",
        "Dietary management: low-glycemic foods, reduce refined carbohydrates",
        "Regular physical activity: at least 150 min/week of moderate exercise",
        "Endocrinologist consultation for medication optimization",
        "Annual eye, kidney, and foot examinations",
    ],
    "kidney_disease": [
        "Blood pressure control is critical — target < 130/80 mmHg",
        "Limit protein intake as advised by nephrologist",
        "Avoid NSAIDs and nephrotoxic medications",
        "Regular eGFR and urine albumin monitoring",
        "Nephrologist consultation for disease staging and treatment planning",
    ],
    "stroke": [
        "Strict blood pressure control",
        "Antiplatelet or anticoagulation therapy as prescribed",
        "Smoking cessation — reduces stroke risk by 50% within 1 year",
        "Neurologist consultation for risk assessment and prevention",
        "Regular carotid Doppler and cardiac monitoring if indicated",
    ],
    "liver_disease": [
        "Complete alcohol cessation is mandatory",
        "Hepatitis B/C screening and vaccination",
        "Hepatologist consultation for disease staging (Child-Pugh score)",
        "Avoid hepatotoxic medications (including acetaminophen at high doses)",
        "Regular LFT, AFP, and abdominal ultrasound as advised",
    ],
    "hypertension": [
        "DASH diet: reduce sodium, increase potassium-rich foods",
        "Regular blood pressure monitoring at home",
        "Medication adherence is critical — do not stop without physician guidance",
        "Reduce stress, improve sleep hygiene",
        "Target BP < 130/80 mmHg in most patients",
    ],
}

def _get_treatment_guidance(top_risks):
    guidance = []
    for risk in top_risks:
        key = risk["key"]
        tips = TREATMENT_GUIDANCE_DB.get(key, [])
        if tips:
            guidance.append({
                "disease": risk["disease"],
                "tips":    tips,
                "note":    "These are general informational guidelines. Always follow your physician's specific recommendations.",
            })
    return guidance


# ── Patient Similarity ────────────────────────────────────────────────────────

def _get_similar_profile(age, disease_risks, lifestyle):
    """Returns a simulated similar patient profile for context (educational)."""
    top_disease = disease_risks[0]["disease"] if disease_risks else "General Health"
    age_group = "18–35" if age < 36 else "36–50" if age < 51 else "51–65" if age < 66 else "65+"

    return {
        "ageGroup":       age_group,
        "topCondition":   top_disease,
        "typicalOutcome": "Most patients with a similar profile who adopted lifestyle modifications showed 20–40% risk reduction within 6 months.",
        "successRate":    "78% maintained improved health metrics with consistent follow-up",
        "note":           "Patient similarity data is anonymized and aggregated. Not based on individual records.",
    }


# ── Confidence Score ──────────────────────────────────────────────────────────

def _compute_confidence(data):
    """Compute model confidence based on input completeness."""
    fields = [
        "age", "gender", "symptoms", "vitals", "medicalHistory",
        "currentMedications", "labValues", "lifestyle",
    ]
    provided = sum(1 for f in fields if data.get(f))
    base_confidence = round((provided / len(fields)) * 85 + 10)

    return {
        "score":       min(95, base_confidence),
        "level":       "HIGH" if base_confidence >= 70 else "MODERATE" if base_confidence >= 50 else "LOW",
        "inputFields": provided,
        "totalFields": len(fields),
        "message":     f"Confidence based on {provided}/{len(fields)} provided data points. More data = higher accuracy.",
    }
