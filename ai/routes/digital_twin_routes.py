# ai/routes/digital_twin_routes.py
# MediChain AI — Patient Digital Twin Simulation API
# Exposes POST /cdss/digital-twin/simulate endpoint.

import logging
from flask import Blueprint, request, jsonify
from cdss.digital_twin_engine import run_twin_simulation

logger = logging.getLogger("medichain.routes.digital_twin")

twin_bp = Blueprint("digital_twin", __name__)

@twin_bp.route("/cdss/digital-twin/simulate", methods=["POST"])
def simulate_twin():
    """
    POST /cdss/digital-twin/simulate
    Runs virtual patient digital twin simulation given physiological baselines 
    and a simulated medication/dosage prescription.
    """
    try:
        data = request.get_json(silent=True) or {}
        baseline = data.get("baseline", {})
        drug = data.get("drug", "")
        dosage = float(data.get("dosage_mg", 0.0))

        logger.info(f"[Digital Twin API] Simulating drug={drug}, dosage={dosage}mg")
        
        result = run_twin_simulation(baseline, drug, dosage)
        return jsonify(result), 200

    except Exception as e:
        logger.error(f"[Digital Twin API] Error during simulation: {e}", exc_info=True)
        return jsonify({"error": "Digital twin simulation failed", "details": str(e)}), 500
