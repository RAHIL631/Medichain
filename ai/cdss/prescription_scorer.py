# ai/cdss/prescription_scorer.py
# AI-Generated Prescription Safety Score (0–100) with severity levels and clinical explanations.
# Aggregates: interaction analysis + dosage checks → unified safety score + recommendations.

from flask import Blueprint, request, jsonify
from datetime import datetime
import logging

from .interaction_engine import analyze_all_interactions
from .dosage_checker import check_prescription_dosages

logger = logging.getLogger("cdss.scorer")

scorer_bp = Blueprint('scorer', __name__)

# Severity thresholds for the 0–100 score
SCORE_SEVERITY = [
    (90, "SAFE",     "🟢", "Prescription appears clinically safe. No significant concerns identified."),
    (75, "LOW",      "🟡", "Minor considerations noted. Prescription is generally safe with standard monitoring."),
    (55, "MODERATE", "🟠", "Moderate concerns identified. Prescriber review recommended before dispensing."),
    (30, "HIGH",     "🔴", "Significant safety concerns detected. Clinical review required. Consider alternatives."),
    (0,  "CRITICAL", "🚨", "Critical safety issues detected. Do not dispense without immediate prescriber consultation."),
]

def compute_safety_score(
    interactions_result: dict,
    dosage_results: list[dict],
    patient: dict
) -> dict:
    """
    Compute a 0–100 prescription safety score from interaction + dosage analysis.
    100 = perfectly safe, 0 = critically dangerous.
    
    Returns:
        safety_score, severity, color_code, clinical_explanation, recommendations, score_breakdown
    """
    score = 100.0
    deductions = []
    recommendations = []
    
    # ── Interaction deductions ────────────────────────────────────────────────
    interaction_score = interactions_result.get("overall_interaction_score", 0)
    sev_counts = interactions_result.get("severity_counts", {})
    conflicts = interactions_result.get("conflicts", [])
    
    if sev_counts.get("CRITICAL", 0) > 0:
        score -= 60
        deductions.append({"reason": "Critical drug-drug interaction(s) detected", "deduction": 60})
        recommendations.append("Immediately discontinue or substitute one of the interacting drugs")
        recommendations.append("Consult clinical pharmacist or specialist before dispensing")
    
    if sev_counts.get("HIGH", 0) > 0:
        deduct = min(40, sev_counts["HIGH"] * 20)
        score -= deduct
        deductions.append({"reason": f"{sev_counts['HIGH']} HIGH severity drug interaction(s)", "deduction": deduct})
        recommendations.append("Consider alternative medications to avoid high-severity interactions")
        recommendations.append("If proceeding, implement enhanced monitoring protocols")
    
    if sev_counts.get("MODERATE", 0) > 0:
        deduct = min(20, sev_counts["MODERATE"] * 8)
        score -= deduct
        deductions.append({"reason": f"{sev_counts['MODERATE']} MODERATE severity drug interaction(s)", "deduction": deduct})
        recommendations.append("Monitor patient closely for interaction-related adverse effects")
    
    if sev_counts.get("LOW", 0) > 0:
        deduct = min(8, sev_counts["LOW"] * 3)
        score -= deduct
        deductions.append({"reason": f"{sev_counts['LOW']} LOW severity interaction(s)", "deduction": deduct})
    
    # ── Dosage deductions ─────────────────────────────────────────────────────
    unsafe_dosages = [d for d in dosage_results if not d.get("safe", True)]
    unsafe_critical = [d for d in dosage_results if d.get("severity") == "CRITICAL"]
    unsafe_high = [d for d in dosage_results if d.get("severity") == "HIGH"]
    unsafe_mod = [d for d in dosage_results if d.get("severity") == "MODERATE"]

    if unsafe_critical:
        deduct = min(50, len(unsafe_critical) * 25)
        score -= deduct
        deductions.append({"reason": f"{len(unsafe_critical)} critically unsafe dose(s)", "deduction": deduct})
        for d in unsafe_critical:
            recommendations.append(f"CRITICAL dosage issue with {d['medication']}: {d['warnings'][0] if d.get('warnings') else 'Review required'}")
    
    if unsafe_high:
        deduct = min(30, len(unsafe_high) * 15)
        score -= deduct
        deductions.append({"reason": f"{len(unsafe_high)} high-risk dose(s)", "deduction": deduct})
        for d in unsafe_high:
            recommendations.append(f"Reduce {d['medication']} dose to patient-adjusted maximum of {d.get('patient_adjusted_max_dose_mg', 'N/A')}mg")
    
    if unsafe_mod:
        deduct = min(15, len(unsafe_mod) * 5)
        score -= deduct
        deductions.append({"reason": f"{len(unsafe_mod)} moderate dosage warning(s)", "deduction": deduct})
    
    # Unknown drugs penalty
    unknown_drugs = [d for d in dosage_results if not d.get("in_database", True)]
    if unknown_drugs:
        deduct = len(unknown_drugs) * 3
        score -= deduct
        deductions.append({"reason": f"{len(unknown_drugs)} drug(s) not in dosage reference DB", "deduction": deduct})
    
    # ── Patient-specific bonuses/penalties ────────────────────────────────────
    age = int(patient.get("age", 45))
    kidney_gfr = float(patient.get("kidney_gfr", 90))
    liver_score = int(patient.get("liver_score", 0))
    pregnant = bool(patient.get("pregnant", False))
    
    # High-risk patient profile
    if kidney_gfr < 30:
        score -= 5
        deductions.append({"reason": "Severe renal impairment (GFR < 30) — increased drug accumulation risk", "deduction": 5})
        recommendations.append("All renally-cleared medications require dose adjustment and closer monitoring")
    
    if liver_score >= 7:  # Child-Pugh C (severe)
        score -= 5
        deductions.append({"reason": "Severe hepatic impairment (Child-Pugh C) — reduced drug metabolism", "deduction": 5})
        recommendations.append("Hepatically metabolized drugs require dose reduction; monitor closely")
    
    if age >= 75:
        score -= 3
        deductions.append({"reason": "Very elderly patient (≥75) — pharmacokinetic changes increase risk", "deduction": 3})
        recommendations.append("Apply 'Start low, go slow' prescribing principle for all medications")
    
    if pregnant and interactions_result.get("conflicts"):
        score -= 5
        deductions.append({"reason": "Pregnancy + drug interactions — dual risk", "deduction": 5})
        recommendations.append("Consult obstetric pharmacist for pregnancy-safe alternatives")

    # ── Clamp score to 0–100 ──────────────────────────────────────────────────
    score = max(0, min(100, round(score, 1)))

    # ── Determine severity level ──────────────────────────────────────────────
    severity = "SAFE"
    color_code = "🟢"
    base_explanation = "Prescription appears clinically safe."
    for threshold, sev, color, explanation in SCORE_SEVERITY:
        if score >= threshold:
            severity = sev
            color_code = color
            base_explanation = explanation
            break

    # ── Build clinical explanation ────────────────────────────────────────────
    drug_names = [d.get("medication", "") for d in dosage_results]
    drug_str = ", ".join(drug_names) if drug_names else "the prescribed medications"
    
    lines = [f"Safety analysis for: {drug_str}."]
    if conflicts:
        lines.append(f"Identified {len(conflicts)} drug-drug interaction(s): " +
                     "; ".join([f"{c['drug1']} ↔ {c['drug2']} [{c['severity']}]" for c in conflicts[:3]]) +
                     ("..." if len(conflicts) > 3 else "."))
    if unsafe_dosages:
        lines.append(f"{len(unsafe_dosages)} dosage concern(s) flagged for: " +
                     ", ".join([d['medication'] for d in unsafe_dosages]) + ".")
    lines.append(base_explanation)
    
    clinical_explanation = " ".join(lines)
    
    # Add generic clinical recs if list is empty
    if not recommendations:
        recommendations.append("Continue standard monitoring and follow-up")
        recommendations.append("Patient counselling on medication adherence and side effects")
    
    # Deduplicate recommendations
    seen = set()
    unique_recs = []
    for rec in recommendations:
        if rec not in seen:
            seen.add(rec)
            unique_recs.append(rec)
    
    return {
        "safety_score": score,
        "severity": severity,
        "color_code": color_code,
        "clinical_explanation": clinical_explanation,
        "recommendations": unique_recs[:8],  # Max 8 recommendations
        "score_breakdown": {
            "starting_score": 100,
            "deductions": deductions,
            "final_score": score
        }
    }


def full_prescription_analysis(
    drug_list: list[str],
    dosages: list[dict],
    patient: dict
) -> dict:
    """
    Complete prescription safety pipeline:
    1. Multi-drug interaction analysis
    2. Per-drug dosage safety checks  
    3. Aggregate safety score generation
    """
    # Step 1: Interaction analysis with patient context and dosages
    interactions = analyze_all_interactions(drug_list, patient=patient, dosages=dosages)
    
    # Step 2: Dosage checks
    dosage_results = check_prescription_dosages(dosages, patient) if dosages else []
    
    # Step 3: Score generation
    score_result = compute_safety_score(interactions, dosage_results, patient)
    
    return {
        **score_result,
        "interaction_analysis": interactions,
        "dosage_analysis": dosage_results,
        "medications_analyzed": drug_list,
        "combination_analysis": interactions.get("combination_analysis", []),
        "alternative_medicines": interactions.get("alternative_medicines", []),
        "emergency_recommendations": interactions.get("emergency_recommendations", []),
        "patient_contraindications": interactions.get("patient_contraindications", []),
        "patient_profile": {
            "age": patient.get("age"),
            "kidney_gfr": patient.get("kidney_gfr"),
            "liver_score": patient.get("liver_score"),
            "pregnant": patient.get("pregnant", False)
        },
        "analyzed_at": datetime.utcnow().isoformat() + "Z"
    }


# ── Blueprint Routes ──────────────────────────────────────────────────────────

@scorer_bp.route('/cdss/score', methods=['POST'])
def prescription_score():
    """
    POST /cdss/score
    Body:
      {
        "medications": ["Warfarin", "Aspirin"],
        "dosages": [
          {"drug": "Warfarin", "dose_mg": 5, "frequency": "once_daily"},
          {"drug": "Aspirin", "dose_mg": 100, "frequency": "once_daily"}
        ],
        "patient": { "age": 67, "weight_kg": 72, "kidney_gfr": 55, "liver_score": 1, "pregnant": false, "allergies": [] }
      }
    Returns:
      { safety_score, severity, clinical_explanation, recommendations, score_breakdown, ... }
    """
    try:
        data = request.get_json(silent=True) or {}
        medications = data.get("medications", [])
        dosages = data.get("dosages", [])
        patient = data.get("patient", {})

        if not medications:
            return jsonify({"error": "medications array is required"}), 400

        result = full_prescription_analysis(medications, dosages, patient)
        return jsonify(result), 200

    except Exception as e:
        logger.error(f"Prescription scoring error: {e}")
        return jsonify({"error": "Prescription scoring failed", "details": str(e)}), 500
