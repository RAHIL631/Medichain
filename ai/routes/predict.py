# ai/routes/predict.py
# MediChain AI — Legacy Disease Prediction Route
#
# Endpoint: POST /predict
# This endpoint is PRESERVED exactly as originally implemented.
# The handler is now a thin Flask layer that delegates to prediction_service.py.

import logging
from flask import Blueprint, request, jsonify

from services.prediction_service import predict_legacy

logger = logging.getLogger("medichain.routes.predict")

predict_bp = Blueprint("predict", __name__)


@predict_bp.route("/predict", methods=["POST"])
def predict():
    """
    POST /predict
    Legacy disease risk prediction endpoint — fully backward-compatible.

    Body (all fields optional with sensible defaults):
      {
        "age":               45,
        "dob":               "1979-01-15",      ← alternative to age
        "gender":            "M",
        "bloodPressure":     120,
        "cholesterol":       200,
        "glucose":           100,
        "bmi":               25.0,
        "smoking":           false,
        "existingConditions": ["hypertension"]
      }

    Response:
      {
        "overallRisk":    "LOW" | "MEDIUM" | "HIGH",
        "scores":         {"heartDisease": 12.3, "diabetes": 8.1, "stroke": 5.4},
        "riskLevels":     {"heartDisease": "LOW", ...},
        "recommendations": [...],
        "modelsUsed":     true,
        "risk_level":     "LOW",         ← duplicate for backward compat
        "heart_disease":  12.3,          ← duplicate for backward compat
        "diabetes":       8.1,
        "stroke":         5.4
      }
    """
    try:
        data = request.get_json(silent=True) or {}
        result = predict_legacy(data)
        return jsonify(result), 200

    except Exception as e:
        logger.error(f"Prediction error: {e}", exc_info=True)
        return jsonify({"error": "Internal server error during prediction"}), 500
