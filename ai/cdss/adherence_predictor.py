# ai/cdss/adherence_predictor.py
# Medication Adherence Prediction Module
# Predicts patient medication adherence using historical behavior patterns.
# Features: refill delays, missed dose rate, prescription count, chronic conditions, age.

from flask import Blueprint, request, jsonify
import numpy as np
import joblib
import logging
from pathlib import Path
from datetime import datetime, timedelta

logger = logging.getLogger("cdss.adherence")

adherence_bp = Blueprint('adherence', __name__)

BASE_DIR = Path(__file__).parent.parent
MODEL_DIR = BASE_DIR / "models"

# Load model if available
ADHERENCE_MODEL = None
ADHERENCE_SCALER = None

def _load_adherence_model():
    global ADHERENCE_MODEL, ADHERENCE_SCALER
    m_path = MODEL_DIR / "adherence_model.pkl"
    s_path = MODEL_DIR / "adherence_scaler.pkl"
    try:
        if m_path.exists():
            ADHERENCE_MODEL = joblib.load(m_path)
            logger.info("✅ Adherence model loaded")
        if s_path.exists():
            ADHERENCE_SCALER = joblib.load(s_path)
    except Exception as e:
        logger.warning(f"Adherence model load failed: {e}")

_load_adherence_model()


def extract_adherence_features(history: list[dict], patient: dict) -> np.ndarray:
    """
    Extract adherence ML features from prescription history.
    
    Feature vector (8 features):
    [0] avg_refill_delay_days   — average days late for refills
    [1] missed_dose_rate        — fraction of reported missed doses
    [2] prescription_count      — total active prescriptions
    [3] chronic_conditions_count— number of chronic conditions
    [4] age_group               — 0=<30, 1=30-50, 2=50-65, 3=65+
    [5] polypharmacy_flag       — 1 if 5+ medications
    [6] refill_consistency      — std dev of refill intervals (lower = more consistent)
    [7] days_since_last_refill  — recency of last refill
    """
    age = int(patient.get("age", 45))
    conditions = patient.get("chronicConditions", [])
    
    if age < 30: age_group = 0
    elif age < 50: age_group = 1
    elif age < 65: age_group = 2
    else: age_group = 3
    
    # Defaults
    avg_refill_delay = 0.0
    missed_dose_rate = 0.0
    prescription_count = int(patient.get("prescriptionCount", len(history)))
    refill_consistency = 5.0
    days_since_last_refill = 30.0
    
    if history:
        delays = []
        missed_counts = []
        total_doses = []
        refill_dates = []
        
        for event in history:
            delay = float(event.get("refill_delay_days", 0))
            delays.append(max(0, delay))
            
            missed = int(event.get("missed_doses", 0))
            total = int(event.get("total_doses", 30))
            missed_counts.append(missed)
            total_doses.append(total)
            
            ref_date = event.get("refill_date")
            if ref_date:
                try:
                    refill_dates.append(datetime.fromisoformat(str(ref_date)[:10]))
                except Exception:
                    pass
        
        if delays:
            avg_refill_delay = float(np.mean(delays))
        
        total_missed = sum(missed_counts)
        total_possible = sum(total_doses)
        if total_possible > 0:
            missed_dose_rate = total_missed / total_possible
        
        if len(refill_dates) >= 2:
            refill_dates.sort()
            intervals = [(refill_dates[i+1] - refill_dates[i]).days for i in range(len(refill_dates)-1)]
            refill_consistency = float(np.std(intervals)) if intervals else 5.0
            days_since_last_refill = float((datetime.now() - refill_dates[-1]).days)
        elif len(refill_dates) == 1:
            days_since_last_refill = float((datetime.now() - refill_dates[0]).days)
    
    polypharmacy = 1 if prescription_count >= 5 else 0
    
    features = np.array([
        avg_refill_delay,
        missed_dose_rate,
        prescription_count,
        len(conditions),
        age_group,
        polypharmacy,
        refill_consistency,
        days_since_last_refill
    ], dtype=float)
    
    return features


def predict_adherence(patient: dict, history: list[dict]) -> dict:
    """
    Predict medication adherence for a patient.
    
    Returns:
        adherence_score: 0-100 (100 = perfect adherence)
        risk_category: GOOD/FAIR/POOR/CRITICAL
        predicted_next_refill_date: ISO date string
        contributing_factors: list of identified adherence barriers
        interventions: list of recommended interventions
    """
    features = extract_adherence_features(history, patient)
    
    # ── Model prediction ──────────────────────────────────────────────────────
    if ADHERENCE_MODEL and ADHERENCE_SCALER:
        try:
            scaled = ADHERENCE_SCALER.transform([features])
            # Model predicts adherence probability (1 = adherent)
            adherence_prob = float(ADHERENCE_MODEL.predict_proba(scaled)[0][1])
            adherence_score = round(adherence_prob * 100, 1)
        except Exception as e:
            logger.warning(f"Model inference failed: {e}; using heuristic")
            adherence_score = _heuristic_adherence(features)
    else:
        adherence_score = _heuristic_adherence(features)
    
    # ── Risk category ─────────────────────────────────────────────────────────
    if adherence_score >= 80:
        risk_category = "GOOD"
        category_color = "#22C55E"
        category_label = "Good Adherence"
    elif adherence_score >= 60:
        risk_category = "FAIR"
        category_color = "#EAB308"
        category_label = "Fair Adherence — Some Concerns"
    elif adherence_score >= 40:
        risk_category = "POOR"
        category_color = "#F97316"
        category_label = "Poor Adherence — Intervention Recommended"
    else:
        risk_category = "CRITICAL"
        category_color = "#EF4444"
        category_label = "Critical Non-Adherence — Urgent Review"
    
    # ── Predicted next refill ─────────────────────────────────────────────────
    prescription_count = int(patient.get("prescriptionCount", 1))
    avg_refill_delay = float(features[0])
    standard_refill_cycle = 30  # days
    
    expected_delay = round(avg_refill_delay * (1 + (100 - adherence_score) / 200))
    next_refill = datetime.now() + timedelta(days=standard_refill_cycle + expected_delay)
    
    # ── Contributing factors ──────────────────────────────────────────────────
    factors = []
    avg_delay = features[0]
    missed_rate = features[1]
    n_meds = features[2]
    n_conditions = features[3]
    age_group = int(features[4])
    polypharmacy = int(features[5])
    
    if avg_delay > 10:
        factors.append(f"Late refills: average {avg_delay:.0f} days delay")
    if missed_rate > 0.2:
        factors.append(f"High missed dose rate: {missed_rate*100:.0f}% of doses missed")
    if polypharmacy:
        factors.append(f"Polypharmacy: {int(n_meds)} concurrent medications (complexity burden)")
    if n_conditions > 2:
        factors.append(f"Multiple chronic conditions ({int(n_conditions)}) may cause pill fatigue")
    if age_group == 0:
        factors.append("Young age — often associated with lower adherence in chronic disease")
    if age_group == 3:
        factors.append("Elderly patient — may have cognitive or mobility barriers to adherence")
    if not factors:
        factors.append("No major adherence barriers identified")
    
    # ── Interventions ─────────────────────────────────────────────────────────
    interventions = []
    
    if risk_category in ["POOR", "CRITICAL"]:
        interventions.append("Motivational interviewing session with care coordinator")
        interventions.append("Pill organizer or blister pack dispensing")
        interventions.append("Automated SMS/app refill reminders")
    
    if avg_delay > 7:
        interventions.append("Refill synchronization — align all prescription renewals to single date")
    
    if int(n_meds) >= 5:
        interventions.append("Medication review: assess if any medications can be deprescribed")
        interventions.append("Once-daily formulations where available to reduce pill burden")
    
    if risk_category == "FAIR":
        interventions.append("Medication diary or mobile app tracking (e.g., Medisafe)")
        interventions.append("Pharmacy adherence packaging")
    
    if risk_category == "GOOD":
        interventions.append("Continue current regimen — reinforce at next visit")
        interventions.append("Positive reinforcement and adherence acknowledgement")
    
    return {
        "adherence_score": adherence_score,
        "risk_category": risk_category,
        "category_color": category_color,
        "category_label": category_label,
        "predicted_next_refill_date": next_refill.strftime("%Y-%m-%d"),
        "predicted_refill_delay_days": expected_delay,
        "contributing_factors": factors,
        "recommended_interventions": interventions,
        "feature_summary": {
            "avg_refill_delay_days": round(features[0], 1),
            "missed_dose_rate_pct": round(features[1] * 100, 1),
            "prescription_count": int(features[2]),
            "chronic_conditions": int(features[3]),
            "polypharmacy": bool(features[5])
        },
        "model_used": "RandomForest" if ADHERENCE_MODEL else "clinical_heuristic"
    }


def _heuristic_adherence(features: np.ndarray) -> float:
    """Evidence-based heuristic adherence score when model is not available."""
    score = 100.0
    
    avg_delay = features[0]
    missed_rate = features[1]
    n_meds = features[2]
    polypharmacy = features[5]
    
    # Each day of average refill delay = -2 points
    score -= min(30, avg_delay * 2)
    
    # Missed dose rate is the strongest predictor
    score -= min(40, missed_rate * 100 * 0.8)
    
    # Polypharmacy
    if polypharmacy:
        score -= 10
    elif n_meds > 3:
        score -= 5
    
    # Refill consistency (high std dev = irregular)
    consistency = features[6]
    score -= min(15, consistency * 0.5)
    
    return max(5, min(100, round(score, 1)))


# ── Blueprint Routes ──────────────────────────────────────────────────────────

@adherence_bp.route('/cdss/adherence', methods=['POST'])
def adherence_prediction():
    """
    POST /cdss/adherence
    Body:
      {
        "patient": { "age": 55, "chronicConditions": [...], "prescriptionCount": 4 },
        "history": [
          { "refill_delay_days": 5, "missed_doses": 2, "total_doses": 30, "refill_date": "2026-05-01" },
          ...
        ]
      }
    """
    try:
        data = request.get_json(silent=True) or {}
        patient = data.get("patient", {})
        history = data.get("history", [])
        
        logger.info(f"Adherence prediction: {len(history)} history events, age={patient.get('age')}")
        result = predict_adherence(patient, history)
        
        return jsonify(result), 200

    except Exception as e:
        logger.error(f"Adherence prediction error: {e}")
        return jsonify({"error": "Adherence prediction failed", "details": str(e)}), 500
