# ai/services/cdss_service.py
# MediChain AI — CDSS Orchestration Service
#
# Orchestrates the full clinical decision support pipeline:
#   1. OCR extraction (if image/PDF provided)
#   2. Multi-drug interaction analysis
#   3. Per-drug dosage safety checks
#   4. Aggregate prescription safety scoring
#   5. SHAP explainability
#
# Pure Python — no Flask.
# Extracted from the monolithic /cdss/analyze handler in app.py.

import base64
import logging
from typing import List, Optional

logger = logging.getLogger("medichain.service.cdss")


def run_full_analysis(
    medications: List[str],
    dosages: List[dict],
    patient: dict,
    file_b64: Optional[str] = None,
    mime_type: str = "image/jpeg",
) -> dict:
    """
    Execute the full CDSS prescription safety pipeline.

    Args:
        medications:  List of drug names (may be empty if file_b64 provided for OCR)
        dosages:      List of dosage dicts [{drug, dose_mg, frequency}]
        patient:      Patient features dict (age, weight_kg, kidney_gfr, liver_score, ...)
        file_b64:     Base64-encoded image or PDF bytes for OCR extraction (optional)
        mime_type:    MIME type of the file ("image/jpeg", "application/pdf", etc.)

    Returns:
        Comprehensive analysis dict:
        {
          "ocr":               {...}  ← if file provided
          "ocr_extracted":     bool,
          "interactions":      {...},
          "dosage_checks":     {...},
          "safety_score":      0-100,
          "severity":          str,
          "shap_explanation":  {...}
        }
    """
    result = {}
    ocr_extracted = False

    # ── Step 1: OCR ───────────────────────────────────────────────────────────
    if file_b64:
        try:
            from cdss.ocr_extractor import extract_from_bytes
            file_bytes = base64.b64decode(file_b64)
            ocr_result = extract_from_bytes(file_bytes, mime_type)
            result["ocr"] = ocr_result

            if not medications and ocr_result.get("medications"):
                medications = ocr_result["medications"]
                ocr_extracted = True
                logger.info(f"OCR extracted {len(medications)} medications")
        except Exception as e:
            logger.warning(f"OCR step failed: {e}")
            result["ocr"] = {"error": str(e), "ocr_available": False}

    if not medications:
        raise ValueError("medications required (or provide file for OCR extraction)")

    # ── Step 2: Full prescription scoring ─────────────────────────────────────
    try:
        from cdss.prescription_scorer import full_prescription_analysis
        analysis = full_prescription_analysis(medications, dosages, patient)
        result.update(analysis)
    except Exception as e:
        logger.error(f"Prescription scoring failed: {e}", exc_info=True)
        result["scoring_error"] = str(e)
        result["safety_score"] = None
        result["severity"] = "UNKNOWN"

    result["ocr_extracted"] = ocr_extracted

    # ── Step 3: SHAP explanation ──────────────────────────────────────────────
    try:
        from cdss.explainer import explain_all_diseases
        shap_result = explain_all_diseases(patient)
        result["shap_explanation"] = shap_result
    except Exception as e:
        logger.warning(f"SHAP explanation failed: {e}")
        result["shap_explanation"] = {"error": str(e), "shap_available": False}

    logger.info(
        f"CDSS analysis complete: {len(medications)} meds | "
        f"score={result.get('safety_score')} | severity={result.get('severity')}"
    )
    return result


def compute_health_risks(patient: dict) -> dict:
    """
    Compute comprehensive 5-organ patient health risk profile.
    Powers POST /cdss/risks.

    Args:
        patient: patient features dict (age, bmi, glucose, bloodPressure, kidney_gfr, ...)

    Returns:
        Full risk profile from cdss/risk_scorer.py
    """
    from cdss.risk_scorer import compute_health_risks as _compute
    logger.info(f"Health risk assessment: age={patient.get('age', 'unknown')}")
    return _compute(patient)


def predict_adherence(patient: dict) -> dict:
    """
    Predict medication adherence probability.
    Powers POST /cdss/adherence.

    Args:
        patient: patient features dict

    Returns:
        Adherence prediction result
    """
    from cdss.adherence_predictor import predict_adherence as _predict
    logger.info("Adherence prediction requested")
    return _predict(patient)
