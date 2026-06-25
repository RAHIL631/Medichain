# ai/routes/drug_check.py
# MediChain AI — Legacy Drug Interaction Check Route
#
# Endpoint: POST /check-drugs
# This endpoint is PRESERVED exactly as originally implemented.
# The handler is now a thin Flask layer that delegates to drug_service.py.

import logging
from flask import Blueprint, request, jsonify

from services.drug_service import check_drugs

logger = logging.getLogger("medichain.routes.drug_check")

drug_check_bp = Blueprint("drug_check", __name__)


@drug_check_bp.route("/check-drugs", methods=["POST"])
def check_drugs_endpoint():
    """
    POST /check-drugs
    Legacy drug interaction check endpoint — fully backward-compatible.

    Body:
      {
        "currentMedications": ["Warfarin", "Lisinopril"],
        "newDrugs":  ["Aspirin", "Ibuprofen"],   ← array of new drugs
        "newDrug":   "Aspirin"                    ← OR single new drug string
      }

    Response:
      {
        "conflicts":      [{drug1, drug2, severity, description}, ...],
        "hasConflicts":   true,
        "checkedDrugs":   ["Aspirin"],
        "currentMeds":    ["Warfarin", "Lisinopril"],
        "safeToUpload":   false,
        "highRiskCount":  1,
        "warningCount":   0
      }
    """
    try:
        data = request.get_json(silent=True) or {}
        current_meds = data.get("currentMedications", [])

        new_drugs_list = data.get("newDrugs")
        new_drug_single = data.get("newDrug")

        if not new_drugs_list and not new_drug_single:
            return jsonify({
                "error": "newDrugs (array) or newDrug (string) is required"
            }), 400

        if new_drugs_list and isinstance(new_drugs_list, list):
            drugs_to_check = new_drugs_list
        elif new_drug_single:
            drugs_to_check = [new_drug_single]
        else:
            drugs_to_check = []

        result = check_drugs(drugs_to_check, current_meds)
        return jsonify(result), 200

    except Exception as e:
        logger.error(f"Drug check error: {e}", exc_info=True)
        return jsonify({"error": "Internal server error during drug check"}), 500
