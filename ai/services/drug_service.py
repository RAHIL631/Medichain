# ai/services/drug_service.py
# MediChain AI — Drug Interaction Service
#
# Pure Python business logic for drug interaction checking.
# No Flask imports — independently testable.
#
# Acts as the single point of truth for drug-related operations,
# preferring the richer cdss/interaction_engine.py over the legacy drug_checker.py.

import logging
from typing import List

logger = logging.getLogger("medichain.service.drug")


def check_drugs(new_drugs: List[str], current_medications: List[str]) -> dict:
    """
    Check one or more new drugs against a patient's current medications.
    Powers the legacy POST /check-drugs endpoint.

    Args:
        new_drugs:            List of drug names being newly prescribed.
        current_medications:  List of drugs the patient is already taking.

    Returns:
        {
          "conflicts":      [...],
          "hasConflicts":   bool,
          "checkedDrugs":   [...],
          "currentMeds":    [...],
          "safeToUpload":   bool,
          "highRiskCount":  int,
          "warningCount":   int
        }
    """
    from drug_checker import check_all_interactions  # legacy — backward compat

    logger.info(
        f"Checking {len(new_drugs)} new drug(s) against {len(current_medications)} current med(s)"
    )

    all_conflicts = []
    checked = []

    for drug in new_drugs:
        result = check_all_interactions(drug, current_medications)
        all_conflicts.extend(result.get("conflicts", []))
        checked.append(drug)

        # Also check new drugs against each other (intra-prescription interactions)
        if len(checked) > 1:
            for prev_drug in checked[:-1]:
                intra = check_all_interactions(drug, [prev_drug])
                all_conflicts.extend(intra.get("conflicts", []))

    has_conflicts = len(all_conflicts) > 0
    high_risk = [c for c in all_conflicts if c.get("severity") in ("HIGH", "CRITICAL")]
    warnings = [c for c in all_conflicts if c.get("severity") == "MODERATE"]
    safe_to_upload = not has_conflicts or (len(high_risk) == 0 and len(warnings) == 0)

    return {
        "conflicts": all_conflicts,
        "hasConflicts": has_conflicts,
        "checkedDrugs": checked,
        "currentMeds": current_medications,
        "safeToUpload": safe_to_upload,
        "highRiskCount": len(high_risk),
        "warningCount": len(warnings),
    }


def analyze_interactions(medications: List[str]) -> dict:
    """
    Full pairwise N×N interaction analysis across a list of medications.
    Powers POST /cdss/interactions.

    Args:
        medications: List of drug names to analyze (deduplication applied internally).

    Returns:
        Full interaction analysis result from cdss/interaction_engine.py
    """
    from cdss.interaction_engine import analyze_all_interactions

    # Deduplicate while preserving order
    seen: set = set()
    unique_meds = [m for m in medications if not (m.lower() in seen or seen.add(m.lower()))]

    logger.info(f"Pairwise interaction analysis: {len(unique_meds)} unique drugs")
    result = analyze_all_interactions(unique_meds)
    result["medications"] = unique_meds
    return result


def get_drug_info(drug_name: str) -> dict:
    """
    Fetch basic RxNorm metadata for a single drug.

    Args:
        drug_name: The drug name to look up.

    Returns:
        {rxcui, name, synonym} or {error: ...}
    """
    from drug_checker import get_drug_info as _get_info
    logger.debug(f"Fetching drug info for: {drug_name}")
    return _get_info(drug_name)
