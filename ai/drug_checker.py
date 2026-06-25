# medichain/ai/drug_checker.py
# Drug interaction detection module using the free RxNorm API.
# RxNorm API: https://rxnav.nlm.nih.gov/REST/ — FREE, no API key needed.

import requests
import time
import logging

# --- Logging ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("drug_checker")

BASE_URL = "https://rxnav.nlm.nih.gov/REST"

# Module-level cache for RxCUI lookups to minimize API calls
_rxcui_cache = {}

def get_rxcui(drug_name: str) -> str | None:
    """
    Resolves a drug name to its RxNorm Concept Unique Identifier (RxCUI).
    Uses caching and approximate matching fallback.
    """
    drug_name = drug_name.strip().lower()
    if drug_name in _rxcui_cache:
        return _rxcui_cache[drug_name]

    try:
        # 1. Direct search
        resp = requests.get(
            f"{BASE_URL}/rxcui.json",
            params={"name": drug_name, "search": 1},
            timeout=5
        )
        resp.raise_for_status()
        data = resp.json()
        
        rxnorms = data.get('idGroup', {}).get('rxnormId', [])
        if rxnorms:
            rxcui = rxnorms[0]
            _rxcui_cache[drug_name] = rxcui
            return rxcui

        # 2. Approximate match fallback
        resp = requests.get(
            f"{BASE_URL}/approximateTerm.json",
            params={"term": drug_name, "maxEntries": 1},
            timeout=5
        )
        resp.raise_for_status()
        approx_data = resp.json()
        
        candidates = approx_data.get('approximateGroup', {}).get('candidate', [])
        if candidates:
            rxcui = candidates[0].get('rxcui')
            _rxcui_cache[drug_name] = rxcui
            return rxcui

    except Exception as e:
        logger.warning(f"Error resolving RxCUI for '{drug_name}': {e}")
        
    return None

def check_interaction(drug1: str, drug2: str) -> dict:
    """
    Checks for a documented interaction between two specific drugs.
    Returns a dictionary detailing the conflict status and severity.
    """
    rxcui1 = get_rxcui(drug1)
    rxcui2 = get_rxcui(drug2)

    if not rxcui1 or not rxcui2:
        return {
            "conflict": False, 
            "reason": "drug_not_found",
            "missing": drug1 if not rxcui1 else drug2
        }

    try:
        # Interaction API for a single RxCUI
        resp = requests.get(
            f"{BASE_URL}/interaction/interaction.json",
            params={"rxcui": rxcui1},
            timeout=8
        )
        resp.raise_for_status()
        data = resp.json()

        # Traverse the RxNorm interaction response structure
        interaction_groups = data.get("interactionTypeGroup", [])
        for group in interaction_groups:
            for interaction_type in group.get("interactionType", []):
                for pair in interaction_type.get("interactionPair", []):
                    # Check if drug2 RxCUI is the interactant
                    interactant = pair.get("interactionConcept", [])[1].get("minConceptItem", {})
                    if interactant.get("rxcui") == rxcui2:
                        return {
                            "conflict": True,
                            "drug1": drug1,
                            "drug2": drug2,
                            "severity": pair.get("severity", "N/A").upper(),
                            "description": pair.get("description", "No description available.")
                        }

    except Exception as e:
        logger.warning(f"Error checking interaction between {drug1} and {drug2}: {e}")

    return {
        "conflict": False, 
        "drug1": drug1, 
        "drug2": drug2, 
        "severity": "NONE", 
        "description": "No interaction detected."
    }

def check_all_interactions(new_drug: str, current_medications: list) -> dict:
    """
    Checks a new drug against a list of existing medications.
    Blocks upload if HIGH or MODERATE severity interactions are detected.
    """
    conflicts = []
    high_risk_count = 0
    warning_count = 0

    for med in current_medications:
        if not med or med.lower() == new_drug.lower():
            continue
            
        result = check_interaction(new_drug, med)
        
        if result.get("conflict"):
            conflicts.append(result)
            severity = result.get("severity", "")
            if severity in ["HIGH", "CRITICAL"]:
                high_risk_count += 1
            elif severity == "MODERATE":
                warning_count += 1
        
        # Be nice to the free API
        time.sleep(0.5)

    # Business Logic: Block if any High or Moderate risks found
    safe_to_upload = not any(c['severity'] in ['HIGH', 'MODERATE', 'CRITICAL'] for c in conflicts)

    return {
        "conflicts": conflicts,
        "safeToUpload": safe_to_upload,
        "warningCount": warning_count,
        "highRiskCount": high_risk_count,
        "new_drug": new_drug
    }

def get_drug_info(drug_name: str) -> dict:
    """
    Retrieves basic RxNorm metadata for a drug.
    """
    try:
        resp = requests.get(f"{BASE_URL}/drugs.json", params={"name": drug_name}, timeout=5)
        resp.raise_for_status()
        data = resp.json()
        
        concept_group = data.get("drugGroup", {}).get("conceptGroup", [])
        # Find first group with concept names
        for group in concept_group:
            concepts = group.get("conceptProperties", [])
            if concepts:
                return {
                    "rxcui": concepts[0].get("rxcui"),
                    "name": concepts[0].get("name"),
                    "synonym": concepts[0].get("synonym", "N/A")
                }
    except Exception as e:
        logger.error(f"Error fetching info for {drug_name}: {e}")
        
    return {"error": "Drug info not found"}

if __name__ == "__main__":
    # Example Usage
    print("--- MediChain Drug Interaction Test ---")
    test_new_drug = "Warfarin"
    test_current_meds = ["Aspirin", "Metformin", "Lisinopril"]
    
    print(f"Checking {test_new_drug} against {test_current_meds}...")
    results = check_all_interactions(test_new_drug, test_current_meds)
    
    print(f"\nSafe to Upload: {results['safeToUpload']}")
    print(f"High Risk Conflicts: {results['highRiskCount']}")
    print(f"Warnings: {results['warningCount']}")
    
    if results['conflicts']:
        print("\nDetails:")
        for c in results['conflicts']:
            print(f"- {c['drug2']}: [{c['severity']}] {c['description']}")
