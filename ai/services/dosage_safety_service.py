# ai/services/dosage_safety_service.py
# MediChain AI — Dosage Safety Prediction Service
#
# Bridges between patient input and the trained ML ensemble to predict:
#   - Risk Level       (SAFE / LOW / MODERATE / HIGH / CRITICAL)
#   - Max Safe Dose    (patient-adjusted, mg)
#   - Toxic Dose       (estimated lethal/toxic threshold, mg)
#   - Accumulation Risk (0.0 – 1.0 probability)
#   - Drug Toxicity Class (low / medium / high)
#   - Emergency Flag   (bool)
#   - Severity Score   (0–100)
#   - Emergency Advice (string list)
#   - Ensemble confidence (per-model probability breakdown)
#
# Falls back gracefully to rule-based logic when ML models are absent.
# Pure Python — no Flask.

import json
import logging
import math
from pathlib import Path
from typing import Optional

import joblib
import numpy as np

logger = logging.getLogger("medichain.service.dosage_safety")

# ── Paths ──────────────────────────────────────────────────────────────────────
_AI_DIR    = Path(__file__).parent.parent
_MODEL_DIR = _AI_DIR / "models"
_META_PATH = _MODEL_DIR / "dosage_safety_meta.json"

# ── Drug reference (mirrors train script) ─────────────────────────────────────
DRUG_PROFILES = {
    "metformin":     {"max_single": 1000, "daily_max": 2550, "renal_risk": True,  "hepatic_risk": False, "narrow_index": False, "opioid": False},
    "aspirin":       {"max_single": 1000, "daily_max": 4000, "renal_risk": True,  "hepatic_risk": True,  "narrow_index": False, "opioid": False},
    "warfarin":      {"max_single": 10,   "daily_max": 10,   "renal_risk": True,  "hepatic_risk": True,  "narrow_index": True,  "opioid": False},
    "ibuprofen":     {"max_single": 800,  "daily_max": 3200, "renal_risk": True,  "hepatic_risk": True,  "narrow_index": False, "opioid": False},
    "acetaminophen": {"max_single": 1000, "daily_max": 3000, "renal_risk": False, "hepatic_risk": True,  "narrow_index": False, "opioid": False},
    "morphine":      {"max_single": 30,   "daily_max": 120,  "renal_risk": True,  "hepatic_risk": True,  "narrow_index": True,  "opioid": True},
    "lisinopril":    {"max_single": 40,   "daily_max": 40,   "renal_risk": True,  "hepatic_risk": False, "narrow_index": False, "opioid": False},
    "amoxicillin":   {"max_single": 1000, "daily_max": 3000, "renal_risk": True,  "hepatic_risk": False, "narrow_index": False, "opioid": False},
    "atorvastatin":  {"max_single": 80,   "daily_max": 80,   "renal_risk": False, "hepatic_risk": True,  "narrow_index": False, "opioid": False},
    "amlodipine":    {"max_single": 10,   "daily_max": 10,   "renal_risk": False, "hepatic_risk": True,  "narrow_index": False, "opioid": False},
    "furosemide":    {"max_single": 80,   "daily_max": 600,  "renal_risk": True,  "hepatic_risk": True,  "narrow_index": False, "opioid": False},
    "metoprolol":    {"max_single": 200,  "daily_max": 400,  "renal_risk": False, "hepatic_risk": True,  "narrow_index": False, "opioid": False},
    "omeprazole":    {"max_single": 40,   "daily_max": 80,   "renal_risk": False, "hepatic_risk": True,  "narrow_index": False, "opioid": False},
    "insulin":       {"max_single": 100,  "daily_max": 300,  "renal_risk": True,  "hepatic_risk": True,  "narrow_index": True,  "opioid": False},
    "paracetamol":   {"max_single": 1000, "daily_max": 3000, "renal_risk": False, "hepatic_risk": True,  "narrow_index": False, "opioid": False},
}

DRUG_NAMES   = list(DRUG_PROFILES.keys())
FREQ_VALUES  = {"once_daily": 1, "twice_daily": 2, "tds": 3, "qds": 4, "weekly": 0.14, "bd": 2,
                "twice daily": 2, "once daily": 1, "three times daily": 3, "four times daily": 4}
RISK_LABELS  = ["SAFE", "LOW", "MODERATE", "HIGH", "CRITICAL"]
RISK_COLORS  = {"SAFE": "#22c55e", "LOW": "#eab308", "MODERATE": "#f97316",
                "HIGH": "#ef4444", "CRITICAL": "#7f1d1d"}

FEATURE_COLS = [
    "age", "weight_kg", "gender", "pregnant",
    "kidney_gfr", "liver_score", "kidney_disease", "liver_disease",
    "drug_idx", "narrow_index", "opioid", "renal_risk_drug", "hepatic_risk_drug",
    "dose_mg", "freq_doses_per_day", "max_safe_dose", "daily_dose_mg", "weekly_dose_mg",
    "daily_max_mg", "dose_ratio", "daily_ratio", "toxic_dose", "toxic_ratio",
    "accumulation_risk", "renal_penalty", "hepatic_penalty", "preg_penalty", "age_penalty",
]


# ── Model Cache ────────────────────────────────────────────────────────────────

class _ModelCache:
    """Lazy singleton cache for dosage safety models."""
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._loaded = False
            cls._instance.scaler       = None
            cls._instance.rf           = None
            cls._instance.gb           = None
            cls._instance.xgb          = None
            cls._instance.tox_model    = None
            cls._instance.emerg_model  = None
            cls._instance.meta         = {}
        return cls._instance

    def load(self) -> None:
        if self._loaded:
            return
        try:
            self.scaler      = _try_load(_MODEL_DIR / "dosage_safety_scaler.pkl")
            self.rf          = _try_load(_MODEL_DIR / "dosage_dosage_safety_rf_model.pkl")
            self.gb          = _try_load(_MODEL_DIR / "dosage_dosage_safety_gb_model.pkl")
            self.xgb         = _try_load(_MODEL_DIR / "dosage_dosage_safety_xgb_model.pkl")
            self.tox_model   = _try_load(_MODEL_DIR / "dosage_dosage_toxicity_model.pkl")
            self.emerg_model = _try_load(_MODEL_DIR / "dosage_dosage_emergency_model.pkl")

            if _META_PATH.exists():
                with open(_META_PATH) as f:
                    self.meta = json.load(f)

            loaded = sum(1 for m in [self.rf, self.gb, self.xgb] if m is not None)
            logger.info(f"Dosage safety model cache: {loaded} risk models loaded")
            self._loaded = True
        except Exception as e:
            logger.warning(f"Dosage safety models could not be loaded: {e}")
            self._loaded = True  # Mark loaded to avoid retry loops


_cache = _ModelCache()


def _try_load(path: Path):
    try:
        if path.exists():
            return joblib.load(path)
    except Exception as e:
        logger.debug(f"Could not load {path.name}: {e}")
    return None


# ── Feature Extraction ─────────────────────────────────────────────────────────

def _build_features(drug_key: str, dose_mg: float, frequency: str, patient: dict) -> dict:
    """
    Convert raw inputs to the 28-feature vector expected by the ML models.
    Uses DRUG_PROFILES for drug-specific properties.
    Falls back to safe defaults for unknown drugs.
    """
    age         = float(patient.get("age", 45))
    weight_kg   = float(patient.get("weight_kg", 70))
    gender      = int(patient.get("gender", 0))
    pregnant    = int(patient.get("pregnant", False) or patient.get("pregnancy", False))
    kidney_gfr  = float(patient.get("kidney_gfr", 90))
    liver_score = float(patient.get("liver_score", 0))

    kidney_disease = int(kidney_gfr < 60 or patient.get("kidney_disease", False))
    liver_disease  = int(liver_score >= 7 or patient.get("liver_disease", False))

    # Drug properties
    prof = DRUG_PROFILES.get(drug_key, {})
    max_single   = float(prof.get("max_single", 500))
    daily_max    = float(prof.get("daily_max", 2000))
    narrow_index = int(prof.get("narrow_index", False))
    opioid       = int(prof.get("opioid", False))
    renal_risk   = int(prof.get("renal_risk", False))
    hepatic_risk = int(prof.get("hepatic_risk", False))

    drug_idx  = DRUG_NAMES.index(drug_key) if drug_key in DRUG_NAMES else -1
    if drug_idx == -1:
        drug_idx = len(DRUG_NAMES) // 2  # Unknown drug → mid-range

    freq_key      = frequency.lower().replace("-", "_").replace(" ", "_")
    freq_val      = float(FREQ_VALUES.get(freq_key, FREQ_VALUES.get(frequency.lower(), 1)))

    daily_dose    = round(dose_mg * freq_val, 2)
    weekly_dose   = round(daily_dose * 7, 2)
    dose_ratio    = round(dose_mg / max_single, 4) if max_single else 0
    daily_ratio   = round(daily_dose / daily_max, 4) if daily_max else 0
    toxic_threshold = max_single * 1.5
    toxic_ratio   = round(dose_mg / toxic_threshold, 4) if toxic_threshold else 0

    # Accumulation risk (0–1)
    accum_score = (
        0.3 * min(1, max(0, (60 - kidney_gfr) / 60)) +
        0.2 * narrow_index +
        0.2 * max(0, dose_ratio - 0.8) +
        0.1 * min(1, age / 80) +
        0.1 * liver_disease +
        0.1 * opioid
    )
    accumulation_risk = round(min(1.0, accum_score), 4)

    renal_penalty  = 1 if (renal_risk and kidney_gfr < 30) else 0
    hepatic_penalty= 1 if (hepatic_risk and liver_score >= 7) else 0
    preg_penalty   = 1 if pregnant else 0
    age_penalty    = 1 if age >= 65 and dose_ratio >= 0.9 else 0

    return {
        "age":              age,           "weight_kg":        weight_kg,
        "gender":           float(gender), "pregnant":         float(pregnant),
        "kidney_gfr":       kidney_gfr,   "liver_score":      liver_score,
        "kidney_disease":   float(kidney_disease), "liver_disease": float(liver_disease),
        "drug_idx":         float(drug_idx),       "narrow_index":  float(narrow_index),
        "opioid":           float(opioid),          "renal_risk_drug": float(renal_risk),
        "hepatic_risk_drug":float(hepatic_risk),   "dose_mg":       dose_mg,
        "freq_doses_per_day": freq_val,            "max_safe_dose": max_single,
        "daily_dose_mg":    daily_dose,            "weekly_dose_mg":weekly_dose,
        "daily_max_mg":     daily_max,             "dose_ratio":    dose_ratio,
        "daily_ratio":      daily_ratio,            "toxic_dose":    toxic_threshold,
        "toxic_ratio":      toxic_ratio,            "accumulation_risk": accumulation_risk,
        "renal_penalty":    float(renal_penalty),  "hepatic_penalty":  float(hepatic_penalty),
        "preg_penalty":     float(preg_penalty),   "age_penalty":      float(age_penalty),
    }


def _feature_vector(feat: dict) -> list:
    return [feat[c] for c in FEATURE_COLS]


# ── Adjusted Max Safe Dose (rule-based, used in both ML and fallback) ──────────

def _compute_adjusted_max_dose(drug_key: str, patient: dict) -> float:
    prof = DRUG_PROFILES.get(drug_key, {})
    max_single = float(prof.get("max_single", 500))
    kidney_gfr  = float(patient.get("kidney_gfr", 90))
    liver_score = float(patient.get("liver_score", 0))
    pregnant    = bool(patient.get("pregnant", False) or patient.get("pregnancy", False))
    age         = float(patient.get("age", 45))
    weight_kg   = float(patient.get("weight_kg", 70))

    adjusted = max_single

    # Renal impairment
    if prof.get("renal_risk") and kidney_gfr < 30:
        adjusted = 0 if prof.get("narrow_index") else adjusted * 0.5
    elif prof.get("renal_risk") and kidney_gfr < 60:
        adjusted *= 0.75

    # Hepatic impairment
    if prof.get("hepatic_risk") and liver_score >= 7:
        adjusted *= 0.5
    elif prof.get("hepatic_risk") and liver_score >= 4:
        adjusted *= 0.75

    # Geriatric
    if age >= 65:
        adjusted *= 0.75

    # Pediatric
    if age < 18:
        adjusted = min(adjusted, weight_kg * 10)

    # Pregnancy
    if pregnant and drug_key in ["warfarin", "atorvastatin"]:
        adjusted = 0  # Contraindicated

    return round(adjusted, 1)


# ── Emergency Advice Generator ─────────────────────────────────────────────────

def _generate_emergency_advice(
    risk_label: str,
    drug_name: str,
    dose_mg: float,
    max_safe: float,
    is_toxic: bool,
    emergency_flag: bool,
    patient: dict,
    prof: dict,
) -> list[str]:
    advice = []
    age  = float(patient.get("age", 45))
    preg = bool(patient.get("pregnant", False) or patient.get("pregnancy", False))

    if is_toxic or risk_label == "CRITICAL":
        advice += [
            f"IMMEDIATE ACTION: Current dose of {dose_mg}mg exceeds toxic threshold — seek emergency care now.",
            "Call emergency services or proceed to the nearest A&E department immediately.",
            f"Do NOT administer another dose of {drug_name} until reviewed by a specialist.",
            "Activate poison control if accidental ingestion occurred.",
        ]
    elif emergency_flag or risk_label == "HIGH":
        advice += [
            f"URGENT: Dose of {dose_mg}mg is critically high for this patient profile.",
            f"Maximum safe dose for this patient is {max_safe}mg. Reduce immediately.",
            "Contact prescribing physician within the next 2 hours.",
            "Monitor for signs of toxicity: nausea, confusion, arrhythmia, respiratory depression.",
        ]
    elif risk_label == "MODERATE":
        advice += [
            f"Review {drug_name} dose with clinical pharmacist before next administration.",
            f"Recommended patient-adjusted maximum: {max_safe}mg per dose.",
            "Increase monitoring frequency for adverse effects.",
        ]

    # Drug-specific warnings
    if prof.get("opioid") and risk_label in ["HIGH", "CRITICAL"]:
        advice.append("OPIOID RISK: Have naloxone (Narcan) available. Watch for respiratory depression.")
    if prof.get("narrow_index") and dose_mg > max_safe:
        advice.append(f"NARROW THERAPEUTIC INDEX: {drug_name} has a very small safety margin — every mg matters.")
    if prof.get("renal_risk") and float(patient.get("kidney_gfr", 90)) < 30:
        advice.append(f"RENAL ALERT: Severe kidney impairment (GFR={patient.get('kidney_gfr')}) — {drug_name} may accumulate to toxic levels.")
    if prof.get("hepatic_risk") and float(patient.get("liver_score", 0)) >= 7:
        advice.append(f"HEPATIC ALERT: Severe liver impairment detected — {drug_name} metabolism severely reduced.")
    if preg:
        advice.append(f"PREGNANCY: Consult obstetric pharmacist immediately regarding {drug_name} safety in pregnancy.")
    if age >= 65 and risk_label not in ["SAFE", "LOW"]:
        advice.append(f"GERIATRIC: Elderly patient — reduce to 50–75% of standard dose. 'Start low, go slow.'")
    if age < 16 and drug_name == "aspirin":
        advice.append("PEDIATRIC: Aspirin contraindicated in patients under 16 — Reye's syndrome risk.")

    return advice[:8]  # Cap at 8 pieces of advice


# ── Main Prediction Function ───────────────────────────────────────────────────

def predict_dosage_safety(
    medication: str,
    dose_mg: float,
    frequency: str,
    patient: dict,
) -> dict:
    """
    Predict dosage safety for a single medication-patient scenario.

    Args:
        medication:  Drug name string
        dose_mg:     Single dose in mg
        frequency:   Dosing frequency (e.g. "twice_daily", "tds")
        patient:     Dict with age, weight_kg, gender, pregnant, kidney_gfr,
                     liver_score, kidney_disease, liver_disease

    Returns:
        Comprehensive safety prediction dict including ML ensemble results
        and rule-based clinical context.
    """
    _cache.load()
    drug_key = medication.strip().lower()
    prof = DRUG_PROFILES.get(drug_key, {})

    # ── Feature engineering ───────────────────────────────────────────────────
    feat    = _build_features(drug_key, float(dose_mg), str(frequency), patient)
    x_vec   = np.array([_feature_vector(feat)])

    # ── Scale features ────────────────────────────────────────────────────────
    if _cache.scaler:
        try:
            x_scaled = _cache.scaler.transform(x_vec)
        except Exception:
            x_scaled = x_vec
    else:
        x_scaled = x_vec

    # ── Ensemble Prediction — Risk Level ──────────────────────────────────────
    model_predictions = {}
    risk_probs_all    = []

    for model_name, model in [("Random Forest", _cache.rf), ("Gradient Boosting", _cache.gb), ("XGBoost", _cache.xgb)]:
        if model is None:
            continue
        try:
            proba = model.predict_proba(x_scaled)[0]
            pred  = int(model.predict(x_scaled)[0])
            model_predictions[model_name] = {
                "predicted_risk_level": RISK_LABELS[pred],
                "probabilities":        {RISK_LABELS[i]: round(float(p), 4) for i, p in enumerate(proba)},
            }
            risk_probs_all.append(proba)
        except Exception as e:
            logger.debug(f"{model_name} prediction failed: {e}")

    # Aggregate via probability averaging
    if risk_probs_all:
        avg_probs   = np.mean(risk_probs_all, axis=0)
        final_risk  = int(np.argmax(avg_probs))
        risk_label  = RISK_LABELS[final_risk]
        risk_conf   = float(round(avg_probs[final_risk], 4))
        risk_source = "ml_ensemble"
    else:
        # Fallback: rule-based risk
        final_risk, risk_label, risk_conf = _rule_based_risk(feat)
        avg_probs   = None
        risk_source = "rule_based"
        logger.info("Falling back to rule-based risk assessment (models not loaded)")

    # ── Binary Predictions: Toxicity & Emergency ──────────────────────────────
    is_toxic      = False
    emerg_flag    = False
    tox_prob      = 0.0
    emerg_prob    = 0.0

    for bin_model, attr, flag_attr, prob_attr in [
        (_cache.tox_model,   "is_toxic",      "is_toxic",    "tox_prob"),
        (_cache.emerg_model, "emergency_flag", "emerg_flag",  "emerg_prob"),
    ]:
        if bin_model is not None:
            try:
                proba = bin_model.predict_proba(x_scaled)[0][1]
                pred  = bool(bin_model.predict(x_scaled)[0])
                if attr == "is_toxic":
                    is_toxic, tox_prob = pred, round(float(proba), 4)
                else:
                    emerg_flag, emerg_prob = pred, round(float(proba), 4)
            except Exception as e:
                logger.debug(f"Binary model {attr} failed: {e}")

    # Fallback binary rules
    if _cache.tox_model is None:
        is_toxic = float(dose_mg) > feat["toxic_dose"]
    if _cache.emerg_model is None:
        emerg_flag = final_risk >= 3

    # ── Clinical Derived Values ───────────────────────────────────────────────
    max_safe_dose  = _compute_adjusted_max_dose(drug_key, patient)
    toxic_dose     = feat["toxic_dose"]
    daily_dose_mg  = feat["daily_dose_mg"]
    weekly_dose_mg = feat["weekly_dose_mg"]
    accum_risk     = feat["accumulation_risk"]

    # Toxicity class label
    if prof.get("narrow_index") or prof.get("opioid"):
        tox_class_label = "high"
    elif prof.get("renal_risk") or prof.get("hepatic_risk"):
        tox_class_label = "medium"
    else:
        tox_class_label = "low"

    # Severity score (0–100, inverse of risk)
    severity_score = max(0, round(100 - (final_risk / 4) * 100 - accum_risk * 15, 1))

    # Emergency advice
    emergency_advice = _generate_emergency_advice(
        risk_label, drug_key, float(dose_mg), max_safe_dose,
        is_toxic, emerg_flag, patient, prof
    )

    # ── Ensemble confidence breakdown ─────────────────────────────────────────
    ensemble_confidence = {
        "models_available": list(model_predictions.keys()),
        "agreement":        len(set(v["predicted_risk_level"] for v in model_predictions.values())),
        "individual":       model_predictions,
        "averaged_probabilities": {
            RISK_LABELS[i]: round(float(p), 4) for i, p in enumerate(avg_probs)
        } if avg_probs is not None else {},
    }

    result = {
        # ── Core ML Predictions ──────────────────────────────────────────
        "risk_level":         risk_label,
        "risk_index":         final_risk,
        "risk_confidence":    risk_conf,
        "risk_color":         RISK_COLORS.get(risk_label, "#gray"),
        "prediction_source":  risk_source,
        "ensemble_confidence":ensemble_confidence,

        # ── Dosage Metrics ───────────────────────────────────────────────
        "medication":         medication,
        "dose_mg":            float(dose_mg),
        "frequency":          str(frequency),
        "max_safe_dose_mg":   max_safe_dose,
        "current_dose_mg":    float(dose_mg),
        "daily_dose_mg":      daily_dose_mg,
        "weekly_dose_mg":     weekly_dose_mg,
        "toxic_dose_mg":      toxic_threshold_mg(drug_key),
        "dose_ratio":         feat["dose_ratio"],
        "daily_dose_ratio":   feat["daily_ratio"],

        # ── Risk Flags ───────────────────────────────────────────────────
        "is_toxic":           is_toxic,
        "toxicity_probability":tox_prob,
        "emergency_flag":     emerg_flag,
        "emergency_probability":emerg_prob,

        # ── Drug Safety Profile ──────────────────────────────────────────
        "accumulation_risk":  accum_risk,
        "drug_toxicity_class":tox_class_label,
        "narrow_therapeutic_index": bool(prof.get("narrow_index", False)),
        "opioid_class":       bool(prof.get("opioid", False)),
        "severity_score":     severity_score,

        # ── Emergency Guidance ───────────────────────────────────────────
        "emergency_advice":   emergency_advice,

        # ── Patient Context ──────────────────────────────────────────────
        "patient_profile": {
            "age":         patient.get("age"),
            "weight_kg":   patient.get("weight_kg"),
            "kidney_gfr":  patient.get("kidney_gfr"),
            "liver_score": patient.get("liver_score"),
            "pregnant":    bool(patient.get("pregnant", False) or patient.get("pregnancy", False)),
        },
        "drug_in_database": drug_key in DRUG_PROFILES,
    }

    return result


def toxic_threshold_mg(drug_key: str) -> float:
    """Return estimated toxic threshold (1.5x max single dose)."""
    prof = DRUG_PROFILES.get(drug_key, {})
    return float(prof.get("max_single", 500)) * 1.5


def _rule_based_risk(feat: dict) -> tuple[int, str, float]:
    """Simple rule-based fallback when ML models are absent."""
    dr = feat["dose_ratio"]
    ar = feat["accumulation_risk"]
    rp = feat["renal_penalty"]
    hp = feat["hepatic_penalty"]
    nm = feat["narrow_index"]

    score = dr * 3 + ar * 1.5 + rp * 0.8 + hp * 0.8 + nm * 0.5

    if score < 1.0:
        return 0, "SAFE",     0.90
    elif score < 2.0:
        return 1, "LOW",      0.80
    elif score < 3.5:
        return 2, "MODERATE", 0.75
    elif score < 5.0:
        return 3, "HIGH",     0.70
    else:
        return 4, "CRITICAL", 0.85


# ── Batch Prediction ───────────────────────────────────────────────────────────

def predict_batch_dosage_safety(medications_with_doses: list[dict], patient: dict) -> dict:
    """
    Run dosage safety prediction for a list of medication-dose entries.

    Args:
        medications_with_doses: [{drug, dose_mg, frequency}, ...]
        patient: patient profile dict

    Returns:
        {
            "individual_predictions": [...],
            "overall_risk_level":     str,
            "overall_risk_index":     int,
            "highest_severity_score": float,
            "emergency_drugs":        [str],
            "toxic_drugs":            [str],
            "total_daily_dose_mg":    float,
            "ml_available":           bool,
        }
    """
    _cache.load()
    results = []
    max_risk_idx = 0

    for entry in medications_with_doses:
        drug   = str(entry.get("drug",      "unknown"))
        dose   = float(entry.get("dose_mg", 0))
        freq   = str(entry.get("frequency", "once_daily"))

        try:
            pred = predict_dosage_safety(drug, dose, freq, patient)
        except Exception as e:
            logger.error(f"Prediction failed for {drug}: {e}")
            pred = {
                "medication": drug, "dose_mg": dose, "frequency": freq,
                "risk_level": "UNKNOWN", "risk_index": 2, "error": str(e),
                "emergency_flag": False, "is_toxic": False,
                "emergency_advice": [f"Manual review required for {drug}"],
            }

        results.append(pred)
        max_risk_idx = max(max_risk_idx, pred.get("risk_index", 0))

    overall_label = RISK_LABELS[min(max_risk_idx, 4)]
    emergency_drugs = [r["medication"] for r in results if r.get("emergency_flag")]
    toxic_drugs     = [r["medication"] for r in results if r.get("is_toxic")]
    total_daily     = sum(r.get("daily_dose_mg", 0) for r in results)

    ml_available = any(m is not None for m in [_cache.rf, _cache.gb, _cache.xgb])

    return {
        "individual_predictions": results,
        "overall_risk_level":     overall_label,
        "overall_risk_index":     max_risk_idx,
        "overall_risk_color":     RISK_COLORS.get(overall_label, "#gray"),
        "highest_severity_score": max((r.get("severity_score", 100) for r in results), default=100),
        "emergency_drugs":        emergency_drugs,
        "toxic_drugs":            toxic_drugs,
        "has_emergency":          len(emergency_drugs) > 0,
        "has_toxic":              len(toxic_drugs) > 0,
        "total_medications":      len(results),
        "total_daily_dose_mg":    round(total_daily, 1),
        "ml_available":           ml_available,
    }
