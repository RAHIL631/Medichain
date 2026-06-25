# ai/routes/cdss_routes.py
# MediChain AI — CDSS Unified Analyze Route
#
# Endpoint: POST /cdss/analyze
#
# This is the master CDSS pipeline endpoint.
# Individual sub-routes (/cdss/interactions, /cdss/risks, etc.)
# remain registered from their own CDSS blueprints (cdss/*.py).
# This module only owns the unified /cdss/analyze orchestration.

import logging
from flask import Blueprint, request, jsonify, current_app

from services.cdss_service import run_full_analysis

logger = logging.getLogger("medichain.routes.cdss")

cdss_main_bp = Blueprint("cdss_main", __name__)


@cdss_main_bp.route("/cdss/analyze", methods=["POST"])
def cdss_analyze():
    """
    POST /cdss/analyze
    Full prescription safety analysis pipeline in a single call:
      1. OCR extraction (if file provided)
      2. Multi-drug interaction analysis
      3. Per-drug dosage safety checks
      4. Aggregate prescription safety score (0–100)
      5. SHAP explainability

    Body:
      {
        "medications":  ["Warfarin", "Aspirin"],
        "dosages":      [{"drug": "Warfarin", "dose_mg": 5, "frequency": "once_daily"}],
        "patient":      {
          "age": 67, "weight_kg": 72,
          "kidney_gfr": 55, "liver_score": 1,
          "pregnant": false, "allergies": []
        },
        "file_base64":  "...",        ← optional: image/PDF for OCR extraction
        "mime_type":    "image/jpeg"
      }

    Response:
      {
        "ocr":              {...},     ← if file provided
        "ocr_extracted":    bool,
        "interactions":     {...},
        "dosage_checks":    {...},
        "safety_score":     72.5,
        "severity":         "MODERATE",
        "shap_explanation": {...}
      }
    """
    if not current_app.config.get("CDSS_LOADED"):
        return jsonify({
            "error": "CDSS modules not loaded",
            "message": "Install dependencies: pip install -r requirements.txt",
            "fallback": True,
        }), 503

    try:
        data = request.get_json(silent=True) or {}
        medications = data.get("medications", [])
        dosages = data.get("dosages", [])
        patient = data.get("patient", {})
        file_b64 = data.get("file_base64")
        mime_type = data.get("mime_type", "image/jpeg")

        result = run_full_analysis(
            medications=medications,
            dosages=dosages,
            patient=patient,
            file_b64=file_b64,
            mime_type=mime_type,
        )
        return jsonify(result), 200

    except ValueError as e:
        # Business logic validation errors (e.g. no medications provided)
        logger.warning(f"CDSS analyze validation error: {e}")
        return jsonify({
            "error": str(e),
            "safety_score": None,
            "severity": "UNKNOWN",
        }), 400

    except Exception as e:
        logger.error(f"CDSS analyze error: {e}", exc_info=True)
        return jsonify({
            "error": "CDSS analysis failed",
            "details": str(e),
        }), 500


@cdss_main_bp.route("/cdss/reload-model", methods=["POST"])
def reload_model():
    """
    POST /cdss/reload-model
    Hot-reload a single model from disk without restarting the service.
    Useful after re-training a specific model.

    Body: { "disease": "heart" }
    Response: { "reloaded": true, "disease": "heart" }
    """
    try:
        data = request.get_json(silent=True) or {}
        disease = data.get("disease", "").strip().lower()

        if not disease:
            return jsonify({"error": "disease field is required"}), 400

        from models_registry import registry
        success = registry.reload(disease)

        if success:
            return jsonify({
                "reloaded": True,
                "disease": disease,
                "version_info": registry.get_version_info().get(disease, {}),
            }), 200
        else:
            return jsonify({
                "reloaded": False,
                "disease": disease,
                "error": f"No model files found for disease: {disease}",
            }), 404

    except Exception as e:
        logger.error(f"Model reload error: {e}", exc_info=True)
        return jsonify({"error": "Model reload failed", "details": str(e)}), 500
