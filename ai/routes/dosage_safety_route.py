# ai/routes/dosage_safety_route.py
# MediChain AI — Dosage Safety Prediction Flask Route
#
# Endpoints:
#   POST /cdss/dosage-safety           — Predict safety for one medication
#   POST /cdss/dosage-safety/batch     — Predict safety for a prescription list
#   GET  /cdss/dosage-safety/status    — Check whether ML models are loaded

from flask import Blueprint, request, jsonify
import logging

logger = logging.getLogger("medichain.routes.dosage_safety")

dosage_safety_bp = Blueprint("dosage_safety", __name__)


@dosage_safety_bp.route("/cdss/dosage-safety", methods=["POST"])
def dosage_safety_predict():
    """
    POST /cdss/dosage-safety
    Single-medication ML dosage safety prediction.

    Request Body:
      {
        "medication": "Warfarin",
        "dose_mg":    7,
        "frequency":  "once_daily",
        "patient": {
          "age":           72,
          "weight_kg":     68,
          "gender":        0,
          "pregnant":      false,
          "kidney_gfr":    28,
          "liver_score":   4,
          "kidney_disease":true,
          "liver_disease": false
        }
      }

    Response:
      {
        "risk_level":          "HIGH",
        "max_safe_dose_mg":    5.0,
        "current_dose_mg":     7.0,
        "daily_dose_mg":       7.0,
        "weekly_dose_mg":      49.0,
        "toxic_dose_mg":       15.0,
        "accumulation_risk":   0.72,
        "drug_toxicity_class": "high",
        "is_toxic":            false,
        "emergency_flag":      true,
        "severity_score":      32,
        "emergency_advice":    [...],
        "ensemble_confidence": {...},
        ...
      }
    """
    try:
        data       = request.get_json(silent=True) or {}
        medication = data.get("medication", "").strip()
        dose_mg    = float(data.get("dose_mg", 0))
        frequency  = str(data.get("frequency", "once_daily"))
        patient    = data.get("patient", {})

        if not medication:
            return jsonify({"error": "medication name is required"}), 400
        if dose_mg <= 0:
            return jsonify({"error": "dose_mg must be a positive number"}), 400

        from services.dosage_safety_service import predict_dosage_safety
        result = predict_dosage_safety(medication, dose_mg, frequency, patient)

        logger.info(
            f"Dosage safety prediction: {medication} {dose_mg}mg {frequency} "
            f"→ risk={result.get('risk_level')} emergency={result.get('emergency_flag')}"
        )
        return jsonify(result), 200

    except ValueError as e:
        return jsonify({"error": "Invalid input data", "details": str(e)}), 400
    except Exception as e:
        logger.error(f"Dosage safety prediction error: {e}", exc_info=True)
        return jsonify({"error": "Dosage safety prediction failed", "details": str(e)}), 500


@dosage_safety_bp.route("/cdss/dosage-safety/batch", methods=["POST"])
def dosage_safety_batch():
    """
    POST /cdss/dosage-safety/batch
    Run ML dosage safety predictions for a full prescription list.

    Request Body:
      {
        "medications": [
          {"drug": "Warfarin",   "dose_mg": 7,   "frequency": "once_daily"},
          {"drug": "Ibuprofen",  "dose_mg": 600, "frequency": "tds"},
          {"drug": "Metoprolol", "dose_mg": 100, "frequency": "twice_daily"}
        ],
        "patient": {
          "age": 72, "weight_kg": 68, "gender": 0,
          "pregnant": false, "kidney_gfr": 28,
          "liver_score": 4, "kidney_disease": true, "liver_disease": false
        }
      }

    Response:
      {
        "individual_predictions":  [...],   ← per-drug ML results
        "overall_risk_level":      "HIGH",
        "overall_risk_index":      3,
        "emergency_drugs":         ["Warfarin"],
        "toxic_drugs":             [],
        "has_emergency":           true,
        "total_daily_dose_mg":     870.1,
        "ml_available":            true,
        ...
      }
    """
    try:
        data          = request.get_json(silent=True) or {}
        medications   = data.get("medications", [])
        patient       = data.get("patient", {})

        if not medications:
            return jsonify({"error": "medications array is required"}), 400

        from services.dosage_safety_service import predict_batch_dosage_safety
        result = predict_batch_dosage_safety(medications, patient)

        logger.info(
            f"Batch dosage safety: {len(medications)} meds "
            f"→ overall={result.get('overall_risk_level')} "
            f"emergency={result.get('has_emergency')}"
        )
        return jsonify(result), 200

    except Exception as e:
        logger.error(f"Batch dosage safety error: {e}", exc_info=True)
        return jsonify({"error": "Batch dosage safety prediction failed", "details": str(e)}), 500


@dosage_safety_bp.route("/cdss/dosage-safety/status", methods=["GET"])
def dosage_safety_status():
    """
    GET /cdss/dosage-safety/status
    Reports whether the dosage safety ML models are loaded and ready.
    """
    try:
        from services.dosage_safety_service import _cache
        _cache.load()

        models = {
            "random_forest":      _cache.rf is not None,
            "gradient_boosting":  _cache.gb is not None,
            "xgboost":            _cache.xgb is not None,
            "toxicity_detector":  _cache.tox_model is not None,
            "emergency_detector": _cache.emerg_model is not None,
            "scaler":             _cache.scaler is not None,
        }
        loaded_count = sum(1 for v in models.values() if v)
        ml_ready     = models["scaler"] and any([models["random_forest"], models["gradient_boosting"], models["xgboost"]])

        return jsonify({
            "ml_ready":       ml_ready,
            "models_loaded":  loaded_count,
            "models_total":   len(models),
            "model_status":   models,
            "fallback_mode":  not ml_ready,
            "meta":           _cache.meta,
        }), 200

    except Exception as e:
        logger.error(f"Dosage safety status error: {e}")
        return jsonify({"ml_ready": False, "error": str(e)}), 500
