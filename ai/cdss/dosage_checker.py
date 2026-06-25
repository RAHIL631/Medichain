# ai/cdss/dosage_checker.py
# Dosage Safety Checker — validates medication doses against patient-specific parameters
# Considers: medicine, dose, frequency, age, weight, kidney function (GFR),
# liver function (Child-Pugh), pregnancy status, and allergies.

from flask import Blueprint, request, jsonify
import logging

logger = logging.getLogger("cdss.dosage")

dosage_bp = Blueprint('dosage', __name__)

# ── Safe Dosage Database ───────────────────────────────────────────────────────
# Each entry: max_dose_mg (per single dose), daily_max_mg, weight_adjusted (bool),
# renal_adjustment (reduction factor when GFR < 30), hepatic_adjustment (factor when liver_score >= 2),
# pregnancy_category (A/B/C/D/X), contraindicated_allergies
DOSAGE_DB = {
    "metformin": {
        "max_dose_mg": 1000, "daily_max_mg": 2550,
        "weight_adjusted": False,
        "renal_adjustment": {"gfr_threshold": 30, "factor": 0.0, "note": "Contraindicated when GFR < 30 (lactic acidosis risk)"},
        "hepatic_adjustment": {"threshold": 2, "factor": 0.5, "note": "Use with caution in hepatic impairment"},
        "pregnancy_category": "B",
        "contraindicated_allergies": [],
        "pediatric_min_age": 10,
    },
    "aspirin": {
        "max_dose_mg": 1000, "daily_max_mg": 4000,
        "weight_adjusted": False,
        "renal_adjustment": {"gfr_threshold": 10, "factor": 0.0, "note": "Avoid in severe renal failure"},
        "hepatic_adjustment": {"threshold": 3, "factor": 0.5, "note": "Use caution in severe liver disease"},
        "pregnancy_category": "C",
        "pregnancy_trimester_X": 3,
        "contraindicated_allergies": ["aspirin", "nsaid", "salicylate"],
        "pediatric_min_age": 16,
        "pediatric_note": "Risk of Reye's syndrome in children under 16",
    },
    "ibuprofen": {
        "max_dose_mg": 800, "daily_max_mg": 3200,
        "weight_adjusted": False,
        "renal_adjustment": {"gfr_threshold": 30, "factor": 0.0, "note": "Avoid in moderate-severe renal impairment"},
        "hepatic_adjustment": {"threshold": 2, "factor": 0.5, "note": "Use caution; risk of hepatotoxicity"},
        "pregnancy_category": "C",
        "pregnancy_trimester_X": 3,
        "contraindicated_allergies": ["nsaid", "aspirin", "ibuprofen"],
    },
    "acetaminophen": {
        "max_dose_mg": 1000, "daily_max_mg": 3000,
        "weight_adjusted": False,
        "renal_adjustment": {"gfr_threshold": 10, "factor": 0.75, "note": "Extend dosing interval in severe renal failure"},
        "hepatic_adjustment": {"threshold": 2, "factor": 0.5, "note": "Reduce dose in hepatic impairment; max 2g/day"},
        "pregnancy_category": "B",
        "contraindicated_allergies": ["acetaminophen", "paracetamol"],
    },
    "paracetamol": {
        "max_dose_mg": 1000, "daily_max_mg": 3000,
        "weight_adjusted": False,
        "renal_adjustment": {"gfr_threshold": 10, "factor": 0.75, "note": "Extend dosing interval in severe renal failure"},
        "hepatic_adjustment": {"threshold": 2, "factor": 0.5, "note": "Reduce dose in hepatic impairment"},
        "pregnancy_category": "B",
        "contraindicated_allergies": ["acetaminophen", "paracetamol"],
    },
    "warfarin": {
        "max_dose_mg": 10, "daily_max_mg": 10,
        "weight_adjusted": False,
        "renal_adjustment": {"gfr_threshold": 15, "factor": 0.75, "note": "Monitor INR closely in severe CKD"},
        "hepatic_adjustment": {"threshold": 2, "factor": 0.5, "note": "Hepatic impairment increases sensitivity; reduce dose"},
        "pregnancy_category": "X",
        "contraindicated_allergies": ["warfarin"],
    },
    "lisinopril": {
        "max_dose_mg": 40, "daily_max_mg": 40,
        "weight_adjusted": False,
        "renal_adjustment": {"gfr_threshold": 30, "factor": 0.5, "note": "Halve dose when GFR < 30; monitor potassium"},
        "hepatic_adjustment": {"threshold": 3, "factor": 0.75, "note": "Not hepatically metabolized; use with caution"},
        "pregnancy_category": "D",
        "contraindicated_allergies": ["ace inhibitor", "lisinopril"],
    },
    "amoxicillin": {
        "max_dose_mg": 1000, "daily_max_mg": 3000,
        "weight_adjusted": True, "weight_dose_mg_per_kg": 25,
        "renal_adjustment": {"gfr_threshold": 30, "factor": 0.5, "note": "Reduce dose in renal impairment"},
        "hepatic_adjustment": {"threshold": 3, "factor": 0.75, "note": "Generally safe; hepatic metabolism minimal"},
        "pregnancy_category": "B",
        "contraindicated_allergies": ["penicillin", "amoxicillin", "cephalosporin"],
    },
    "metoprolol": {
        "max_dose_mg": 200, "daily_max_mg": 400,
        "weight_adjusted": False,
        "renal_adjustment": {"gfr_threshold": 0, "factor": 1.0, "note": "No dose adjustment needed for renal impairment"},
        "hepatic_adjustment": {"threshold": 2, "factor": 0.5, "note": "Reduce dose in severe hepatic impairment"},
        "pregnancy_category": "C",
        "contraindicated_allergies": ["beta blocker", "metoprolol"],
    },
    "omeprazole": {
        "max_dose_mg": 40, "daily_max_mg": 80,
        "weight_adjusted": False,
        "renal_adjustment": {"gfr_threshold": 0, "factor": 1.0, "note": "No renal dose adjustment"},
        "hepatic_adjustment": {"threshold": 2, "factor": 0.5, "note": "Max 20mg/day in severe hepatic impairment"},
        "pregnancy_category": "C",
        "contraindicated_allergies": ["omeprazole", "ppi"],
    },
    "atorvastatin": {
        "max_dose_mg": 80, "daily_max_mg": 80,
        "weight_adjusted": False,
        "renal_adjustment": {"gfr_threshold": 0, "factor": 1.0, "note": "No dose adjustment for renal impairment"},
        "hepatic_adjustment": {"threshold": 1, "factor": 0.0, "note": "Contraindicated in active liver disease"},
        "pregnancy_category": "X",
        "contraindicated_allergies": ["statin", "atorvastatin"],
    },
    "amlodipine": {
        "max_dose_mg": 10, "daily_max_mg": 10,
        "weight_adjusted": False,
        "renal_adjustment": {"gfr_threshold": 0, "factor": 1.0, "note": "No dose adjustment needed"},
        "hepatic_adjustment": {"threshold": 2, "factor": 0.5, "note": "Start with 2.5mg in hepatic impairment"},
        "pregnancy_category": "C",
        "contraindicated_allergies": ["calcium channel blocker", "amlodipine"],
    },
    "furosemide": {
        "max_dose_mg": 80, "daily_max_mg": 600,
        "weight_adjusted": False,
        "renal_adjustment": {"gfr_threshold": 15, "factor": 0.5, "note": "Higher doses may be required in severe CKD"},
        "hepatic_adjustment": {"threshold": 2, "factor": 0.5, "note": "Use lowest effective dose in hepatic cirrhosis"},
        "pregnancy_category": "C",
        "contraindicated_allergies": ["sulfonamide", "furosemide"],
    },
    "insulin": {
        "max_dose_mg": None, "daily_max_mg": None,
        "weight_adjusted": True, "weight_dose_mg_per_kg": 1.0,
        "renal_adjustment": {"gfr_threshold": 30, "factor": 0.75, "note": "Reduce dose in renal impairment; longer half-life"},
        "hepatic_adjustment": {"threshold": 2, "factor": 0.75, "note": "Hepatic impairment increases risk of hypoglycemia"},
        "pregnancy_category": "B",
        "contraindicated_allergies": ["insulin"],
    },
    "morphine": {
        "max_dose_mg": 30, "daily_max_mg": 120,
        "weight_adjusted": True, "weight_dose_mg_per_kg": 0.3,
        "renal_adjustment": {"gfr_threshold": 30, "factor": 0.5, "note": "Active metabolite accumulates in renal failure; reduce dose"},
        "hepatic_adjustment": {"threshold": 2, "factor": 0.5, "note": "Increased bioavailability in liver disease; reduce dose"},
        "pregnancy_category": "C",
        "contraindicated_allergies": ["opioid", "morphine"],
    },
}

FREQUENCY_DAILY_DOSES = {
    "once_daily": 1, "bd": 2, "twice_daily": 2,
    "tds": 3, "thrice_daily": 3, "three_times_daily": 3,
    "qds": 4, "four_times_daily": 4, "every_6_hours": 4,
    "every_8_hours": 3, "every_12_hours": 2,
    "prn": 1, "as_needed": 1, "stat": 1,
    "weekly": 0.14, "monthly": 0.033
}

def check_dosage_safety(
    medication: str,
    dose_mg: float,
    frequency: str,
    patient: dict
) -> dict:
    """
    Check if a given medication dose is safe for a specific patient.
    
    Args:
        medication: drug name string
        dose_mg: single-dose amount in mg
        frequency: dosing frequency string
        patient: dict with age, weight_kg, kidney_gfr, liver_score, pregnant, allergies
    
    Returns:
        dict with safe (bool), warnings, adjusted_max_dose, daily_dose, severity
    """
    med_key = medication.strip().lower()
    db_entry = DOSAGE_DB.get(med_key)
    
    warnings = []
    severity = "SAFE"
    
    # If drug not in DB, return basic info with unknown status
    if not db_entry:
        return {
            "medication": medication,
            "dose_mg": dose_mg,
            "frequency": frequency,
            "safe": True,
            "severity": "UNKNOWN",
            "warnings": [f"No dosage reference data found for '{medication}' — manual verification recommended"],
            "adjusted_max_single_dose": None,
            "calculated_daily_dose": None,
            "in_database": False
        }

    # Extract patient parameters
    age = int(patient.get("age", 45))
    weight_kg = float(patient.get("weight_kg", 70))
    kidney_gfr = float(patient.get("kidney_gfr", 90))
    liver_score = int(patient.get("liver_score", 0))  # Child-Pugh score (0-15)
    pregnant = bool(patient.get("pregnant", False))
    allergies = [a.lower() for a in patient.get("allergies", [])]
    
    max_single = db_entry["max_dose_mg"]
    daily_max = db_entry["daily_max_mg"]
    adjusted_max = max_single
    safe = True

    # ── 1. Allergy Check ──────────────────────────────────────────────────────
    contraindicated = db_entry.get("contraindicated_allergies", [])
    for allergen in allergies:
        if allergen in contraindicated or any(c in allergen for c in contraindicated):
            warnings.append(f"⚠️ ALLERGY ALERT: Patient has documented allergy to '{allergen}' — {medication} is contraindicated")
            safe = False
            severity = "CRITICAL"

    # ── 2. Pregnancy Check ────────────────────────────────────────────────────
    if pregnant:
        cat = db_entry.get("pregnancy_category", "C")
        trimester_x = db_entry.get("pregnancy_trimester_X")
        if cat == "X":
            warnings.append(f"🚫 PREGNANCY CONTRAINDICATION: {medication} (Category X) — proven fetal risk, absolutely contraindicated in pregnancy")
            safe = False
            severity = "CRITICAL"
        elif cat == "D":
            warnings.append(f"⚠️ PREGNANCY WARNING: {medication} (Category D) — evidence of human fetal risk. Use only if benefits outweigh risks")
            if severity not in ["CRITICAL"]:
                severity = "HIGH"
        elif trimester_x == 3:
            warnings.append(f"⚠️ THIRD-TRIMESTER WARNING: {medication} should be avoided in the third trimester")
            if severity not in ["CRITICAL", "HIGH"]:
                severity = "MODERATE"

    # ── 3. Pediatric Check ────────────────────────────────────────────────────
    min_age = db_entry.get("pediatric_min_age")
    if min_age and age < min_age:
        note = db_entry.get("pediatric_note", f"Not recommended for patients under {min_age} years")
        warnings.append(f"⚠️ PEDIATRIC CAUTION: {note}")
        if severity not in ["CRITICAL", "HIGH"]:
            severity = "MODERATE"

    # ── 4. Renal Adjustment ───────────────────────────────────────────────────
    renal = db_entry.get("renal_adjustment", {})
    if renal and kidney_gfr < renal.get("gfr_threshold", 0):
        factor = renal.get("factor", 1.0)
        note = renal.get("note", "Dose adjustment required for renal impairment")
        if factor == 0.0:
            warnings.append(f"🚫 RENAL CONTRAINDICATION: GFR={kidney_gfr}. {note}")
            safe = False
            if severity not in ["CRITICAL"]:
                severity = "HIGH"
            adjusted_max = 0
        else:
            adjusted_max = round(max_single * factor) if adjusted_max else None
            warnings.append(f"⚠️ RENAL DOSE ADJUSTMENT: GFR={kidney_gfr}. {note}. Recommended max: {adjusted_max}mg")
            if severity not in ["CRITICAL", "HIGH"]:
                severity = "MODERATE"

    # ── 5. Hepatic Adjustment ─────────────────────────────────────────────────
    hepatic = db_entry.get("hepatic_adjustment", {})
    if hepatic and liver_score >= hepatic.get("threshold", 99):
        factor = hepatic.get("factor", 1.0)
        note = hepatic.get("note", "Dose adjustment required for hepatic impairment")
        if factor == 0.0:
            warnings.append(f"🚫 HEPATIC CONTRAINDICATION: Child-Pugh score={liver_score}. {note}")
            safe = False
            if severity not in ["CRITICAL"]:
                severity = "HIGH"
        else:
            adj = round(max_single * factor) if max_single else None
            adjusted_max = min(adjusted_max, adj) if adjusted_max and adj else adj
            warnings.append(f"⚠️ HEPATIC DOSE ADJUSTMENT: Child-Pugh={liver_score}. {note}. Recommended max: {adjusted_max}mg")
            if severity not in ["CRITICAL", "HIGH"]:
                severity = "MODERATE"

    # ── 6. Weight-Adjusted Dosing ─────────────────────────────────────────────
    if db_entry.get("weight_adjusted"):
        dose_per_kg = db_entry.get("weight_dose_mg_per_kg", 1.0)
        weight_based_max = round(weight_kg * dose_per_kg, 1)
        if max_single:
            weight_based_max = min(weight_based_max, max_single)
        if adjusted_max:
            adjusted_max = min(adjusted_max, weight_based_max)
        else:
            adjusted_max = weight_based_max

    # ── 7. Dose Range Check ───────────────────────────────────────────────────
    daily_doses = FREQUENCY_DAILY_DOSES.get(frequency.lower(), 1)
    calculated_daily = dose_mg * daily_doses

    if max_single and dose_mg > max_single:
        warnings.append(f"❌ OVERDOSE: {medication} single dose {dose_mg}mg exceeds maximum {max_single}mg per dose")
        safe = False
        if severity not in ["CRITICAL", "HIGH"]:
            severity = "HIGH"
    elif adjusted_max and dose_mg > adjusted_max:
        warnings.append(f"⚠️ DOSE TOO HIGH for this patient: {dose_mg}mg exceeds patient-adjusted maximum of {adjusted_max}mg")
        if severity not in ["CRITICAL", "HIGH"]:
            severity = "MODERATE"

    if daily_max and calculated_daily > daily_max:
        warnings.append(f"❌ DAILY LIMIT EXCEEDED: Total daily dose {calculated_daily}mg ({dose_mg}mg × {daily_doses}) exceeds daily maximum {daily_max}mg")
        safe = False
        if severity not in ["CRITICAL", "HIGH"]:
            severity = "HIGH"

    # ── 8. Geriatric Check ────────────────────────────────────────────────────
    if age >= 65 and max_single and dose_mg >= max_single:
        warnings.append(f"⚠️ GERIATRIC CAUTION: In patients ≥65, consider 50-75% of standard dose for {medication} due to reduced clearance")
        if severity not in ["CRITICAL", "HIGH", "MODERATE"]:
            severity = "LOW"

    if not warnings:
        warnings.append(f"✅ Dose of {dose_mg}mg {frequency} for {medication} appears appropriate for this patient profile")

    return {
        "medication": medication,
        "dose_mg": dose_mg,
        "frequency": frequency,
        "daily_doses": daily_doses,
        "calculated_daily_dose_mg": calculated_daily,
        "reference_max_single_dose_mg": max_single,
        "patient_adjusted_max_dose_mg": adjusted_max,
        "reference_daily_max_mg": daily_max,
        "safe": safe,
        "severity": severity,
        "warnings": warnings,
        "pregnancy_category": db_entry.get("pregnancy_category", "Unknown"),
        "in_database": True
    }


def check_prescription_dosages(medications_with_doses: list[dict], patient: dict) -> list[dict]:
    """
    Check dosage safety for a list of medications with their doses.
    
    Args:
        medications_with_doses: [{"drug": str, "dose_mg": float, "frequency": str}, ...]
        patient: patient profile dict
    
    Returns:
        List of dosage check results
    """
    results = []
    for entry in medications_with_doses:
        drug = entry.get("drug", "")
        dose = float(entry.get("dose_mg", 0))
        freq = entry.get("frequency", "once_daily")
        
        result = check_dosage_safety(drug, dose, freq, patient)
        results.append(result)
    
    return results


# ── Blueprint Routes ──────────────────────────────────────────────────────────

@dosage_bp.route('/cdss/dosage', methods=['POST'])
def dosage_check():
    """
    POST /cdss/dosage
    Body:
      {
        "medications": [
          {"drug": "Metformin", "dose_mg": 500, "frequency": "twice_daily"},
          ...
        ],
        "patient": {
          "age": 67, "weight_kg": 72, "kidney_gfr": 45,
          "liver_score": 2, "pregnant": false, "allergies": ["Penicillin"]
        }
      }
    """
    try:
        data = request.get_json(silent=True) or {}
        medications_with_doses = data.get("medications", [])
        patient = data.get("patient", {})

        if not medications_with_doses:
            return jsonify({"error": "medications array is required"}), 400

        results = check_prescription_dosages(medications_with_doses, patient)

        # Aggregate severity
        sev_order = ["CRITICAL", "HIGH", "MODERATE", "LOW", "UNKNOWN", "SAFE"]
        overall_sev = "SAFE"
        for r in results:
            s = r.get("severity", "SAFE")
            if s in sev_order and sev_order.index(s) < sev_order.index(overall_sev):
                overall_sev = s

        safe_overall = all(r.get("safe", True) for r in results)

        return jsonify({
            "dosage_checks": results,
            "overall_severity": overall_sev,
            "safe_to_prescribe": safe_overall,
            "total_checked": len(results),
            "warnings_count": sum(1 for r in results if not r.get("safe", True))
        }), 200

    except Exception as e:
        logger.error(f"Dosage check error: {e}")
        return jsonify({"error": "Dosage check failed", "details": str(e)}), 500
