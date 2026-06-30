# ai/routes/adherence_sys_routes.py
# MediChain AI — Medication Adherence Prediction API
# Exposes POST /cdss/adherence-sys/predict.

import logging
from flask import Blueprint, request, jsonify
from cdss.adherence_sys_predictor import compute_adherence_score

logger = logging.getLogger("medichain.routes.adherence_sys")

adherence_sys_bp = Blueprint("adherence_sys", __name__)

@adherence_sys_bp.route("/cdss/adherence-sys/predict", methods=["POST"])
def predict_adherence_sys():
    """
    POST /cdss/adherence-sys/predict
    Evaluates patient adherence risk, calculates an adherence score (0-100), 
    and advises on SMS, WhatsApp, and Family alert recommendations.
    """
    try:
        data = request.get_json(silent=True) or {}
        logger.info(f"[Adherence Sys Route] Request received for age={data.get('age')}")
        
        result = compute_adherence_score(data)
        return jsonify(result), 200

    except Exception as e:
        logger.error(f"[Adherence Sys Route] Error: {e}", exc_info=True)
        return jsonify({"error": "Adherence scoring failed", "details": str(e)}), 500
