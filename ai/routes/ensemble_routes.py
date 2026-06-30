# ai/routes/ensemble_routes.py
# MediChain AI — Ensemble Prediction REST API
# Exposes POST /cdss/ensemble/predict route.

import logging
from flask import Blueprint, request, jsonify
from datetime import date
from cdss.ensemble_predictor import compute_ensemble_predictions

logger = logging.getLogger("medichain.routes.ensemble")

ensemble_bp = Blueprint("ensemble_predict", __name__)

@ensemble_bp.route("/cdss/ensemble/predict", methods=["POST"])
def ensemble_predict():
    """
    POST /cdss/ensemble/predict
    Runs multi-model predictions across 8 diseases, averages them, 
    identifies top 5 risk diseases, maps clinical details and ratings.
    """
    try:
        data = request.get_json(silent=True) or {}
        
        # Calculate age if DOB provided
        if not data.get("age") and data.get("dob"):
            try:
                birth = date.fromisoformat(str(data["dob"])[:10])
                data["age"] = (date.today() - birth).days // 365
            except Exception:
                data["age"] = 45

        logger.info(f"[Ensemble API] Scoring patient, age resolved={data.get('age')}")
        result = compute_ensemble_predictions(data)
        
        return jsonify(result), 200

    except Exception as e:
        logger.error(f"[Ensemble API] Error: {e}", exc_info=True)
        return jsonify({"error": "Ensemble prediction failed", "details": str(e)}), 500
