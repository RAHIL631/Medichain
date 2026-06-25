# ai/cdss/interaction_engine.py
# Multi-Drug Interaction Analysis Engine
# Performs pairwise N×N interaction analysis for any number of medications.
# Uses RxNorm API as primary source + a curated local fallback database.

from flask import Blueprint, request, jsonify
import requests
import time
import logging
import itertools

logger = logging.getLogger("cdss.interaction")

interaction_bp = Blueprint('interaction', __name__)

RXNORM_BASE = "https://rxnav.nlm.nih.gov/REST"

# ── Local curated interaction database (fallback when API is offline) ─────────
# Format: frozenset({drug_a, drug_b}) → {severity, description}
LOCAL_INTERACTION_DB = {
    frozenset({"warfarin", "aspirin"}): {
        "severity": "HIGH",
        "description": "Warfarin + Aspirin: Concurrent use significantly increases bleeding risk. Both inhibit coagulation through different mechanisms."
    },
    frozenset({"warfarin", "ibuprofen"}): {
        "severity": "HIGH",
        "description": "Warfarin + Ibuprofen: NSAIDs displace warfarin from protein binding, elevating free warfarin levels and hemorrhage risk."
    },
    frozenset({"metformin", "alcohol"}): {
        "severity": "MODERATE",
        "description": "Metformin + Alcohol: Alcohol potentiates lactic acidosis risk with metformin, especially in hepatic impairment."
    },
    frozenset({"lisinopril", "potassium"}): {
        "severity": "MODERATE",
        "description": "Lisinopril + Potassium supplements: ACE inhibitors reduce potassium excretion; combined use may cause dangerous hyperkalemia."
    },
    frozenset({"simvastatin", "clarithromycin"}): {
        "severity": "HIGH",
        "description": "Simvastatin + Clarithromycin: CYP3A4 inhibition by clarithromycin dramatically increases simvastatin plasma levels, raising myopathy risk."
    },
    frozenset({"clopidogrel", "omeprazole"}): {
        "severity": "MODERATE",
        "description": "Clopidogrel + Omeprazole: Omeprazole inhibits CYP2C19, reducing conversion of clopidogrel to its active metabolite."
    },
    frozenset({"ssri", "tramadol"}): {
        "severity": "HIGH",
        "description": "SSRI + Tramadol: Serotonin syndrome risk. Both increase serotonergic activity synergistically."
    },
    frozenset({"digoxin", "amiodarone"}): {
        "severity": "HIGH",
        "description": "Digoxin + Amiodarone: Amiodarone inhibits P-glycoprotein, increasing digoxin plasma levels and risk of toxicity."
    },
    frozenset({"methotrexate", "nsaid"}): {
        "severity": "HIGH",
        "description": "Methotrexate + NSAIDs: NSAIDs reduce renal elimination of methotrexate, causing severe toxicity."
    },
    frozenset({"fluoroquinolone", "antacid"}): {
        "severity": "MODERATE",
        "description": "Fluoroquinolone + Antacids: Divalent cations in antacids chelate fluoroquinolones, reducing absorption by up to 90%."
    },
    frozenset({"maoi", "ssri"}): {
        "severity": "CRITICAL",
        "description": "MAOI + SSRI: Life-threatening serotonin syndrome. Contraindicated — do not use concurrently."
    },
    frozenset({"maoi", "tramadol"}): {
        "severity": "CRITICAL",
        "description": "MAOI + Tramadol: Fatal serotonin syndrome risk. Absolutely contraindicated."
    },
    frozenset({"sildenafil", "nitrate"}): {
        "severity": "CRITICAL",
        "description": "Sildenafil + Nitrates: Profound, potentially fatal hypotension. Absolutely contraindicated."
    },
    frozenset({"warfarin", "fluconazole"}): {
        "severity": "HIGH",
        "description": "Warfarin + Fluconazole: CYP2C9 inhibition by fluconazole markedly increases warfarin levels."
    },
    frozenset({"lithium", "nsaid"}): {
        "severity": "HIGH",
        "description": "Lithium + NSAIDs: NSAIDs reduce renal lithium clearance, causing lithium toxicity."
    },
    frozenset({"cyclosporine", "statin"}): {
        "severity": "HIGH",
        "description": "Cyclosporine + Statins: Cyclosporine inhibits statin metabolism, increasing myopathy/rhabdomyolysis risk."
    },
    frozenset({"heparin", "aspirin"}): {
        "severity": "MODERATE",
        "description": "Heparin + Aspirin: Additive anticoagulant effects increase bleeding risk."
    },
    frozenset({"ace inhibitor", "arb"}): {
        "severity": "HIGH",
        "description": "ACE inhibitor + ARB: Dual RAS blockade increases risk of hypotension, hyperkalemia, and renal impairment."
    },
    frozenset({"quinolone", "theophylline"}): {
        "severity": "MODERATE",
        "description": "Quinolone + Theophylline: CYP1A2 inhibition raises theophylline levels, risking toxicity."
    },
    frozenset({"alcohol", "acetaminophen"}): {
        "severity": "MODERATE",
        "description": "Alcohol + Acetaminophen (Paracetamol): Chronic alcohol use induces CYP2E1, increasing toxic metabolite NAPQI."
    },
}

# ── Drug name normalization map ───────────────────────────────────────────────
DRUG_ALIASES = {
    "paracetamol": "acetaminophen",
    "tylenol": "acetaminophen",
    "motrin": "ibuprofen",
    "advil": "ibuprofen",
    "coumadin": "warfarin",
    "plavix": "clopidogrel",
    "zocor": "simvastatin",
    "glucophage": "metformin",
    "prozac": "fluoxetine",
    "fluoxetine": "ssri",
    "sertraline": "ssri",
    "escitalopram": "ssri",
    "paroxetine": "ssri",
    "citalopram": "ssri",
    "venlafaxine": "ssri",
    "phenelzine": "maoi",
    "tranylcypromine": "maoi",
    "selegiline": "maoi",
    "viagra": "sildenafil",
    "nitroglycerin": "nitrate",
    "isosorbide": "nitrate",
    "cipro": "fluoroquinolone",
    "ciprofloxacin": "fluoroquinolone",
    "levofloxacin": "fluoroquinolone",
    "naproxen": "nsaid",
    "diclofenac": "nsaid",
    "celecoxib": "nsaid",
    "atorvastatin": "statin",
    "rosuvastatin": "statin",
    "pravastatin": "statin",
    "lovastatin": "statin",
    "losartan": "arb",
    "valsartan": "arb",
    "irbesartan": "arb",
    "lisinopril": "ace inhibitor",
    "enalapril": "ace inhibitor",
    "ramipril": "ace inhibitor",
    "penicillin": "antibiotic",
    "amoxicillin": "antibiotic",
}

# ── RxCUI cache ───────────────────────────────────────────────────────────────
_rxcui_cache = {}

def normalize_drug_name(name: str) -> str:
    """Lowercase and resolve aliases for local DB lookup."""
    lower = name.strip().lower()
    return DRUG_ALIASES.get(lower, lower)

def get_rxcui(drug_name: str) -> str | None:
    """Resolve drug name to RxCUI via RxNorm API with caching."""
    key = drug_name.strip().lower()
    if key in _rxcui_cache:
        return _rxcui_cache[key]
    try:
        r = requests.get(
            f"{RXNORM_BASE}/rxcui.json",
            params={"name": drug_name, "search": 1},
            timeout=5
        )
        ids = r.json().get("idGroup", {}).get("rxnormId", [])
        if ids:
            _rxcui_cache[key] = ids[0]
            return ids[0]
        # Approximate fallback
        r2 = requests.get(
            f"{RXNORM_BASE}/approximateTerm.json",
            params={"term": drug_name, "maxEntries": 1},
            timeout=5
        )
        candidates = r2.json().get("approximateGroup", {}).get("candidate", [])
        if candidates:
            rxcui = candidates[0].get("rxcui")
            _rxcui_cache[key] = rxcui
            return rxcui
    except Exception as e:
        logger.warning(f"RxCUI lookup failed for '{drug_name}': {e}")
    return None

def check_rxnorm_interaction(drug1: str, drug2: str) -> dict | None:
    """Query RxNorm for interaction between two drugs. Returns conflict dict or None."""
    rxcui1 = get_rxcui(drug1)
    rxcui2 = get_rxcui(drug2)
    if not rxcui1 or not rxcui2:
        return None
    try:
        r = requests.get(
            f"{RXNORM_BASE}/interaction/interaction.json",
            params={"rxcui": rxcui1},
            timeout=8
        )
        data = r.json()
        for group in data.get("interactionTypeGroup", []):
            for itype in group.get("interactionType", []):
                for pair in itype.get("interactionPair", []):
                    concepts = pair.get("interactionConcept", [])
                    if len(concepts) >= 2:
                        interactant = concepts[1].get("minConceptItem", {})
                        if interactant.get("rxcui") == rxcui2:
                            return {
                                "conflict": True,
                                "drug1": drug1,
                                "drug2": drug2,
                                "severity": pair.get("severity", "N/A").upper(),
                                "description": pair.get("description", "Interaction detected."),
                                "source": "rxnorm"
                            }
    except Exception as e:
        logger.warning(f"RxNorm interaction query failed: {e}")
    return None

def check_local_interaction(drug1: str, drug2: str) -> dict | None:
    """Check local curated DB for interaction between two normalized drug names."""
    n1 = normalize_drug_name(drug1)
    n2 = normalize_drug_name(drug2)
    key = frozenset({n1, n2})
    # Also try with original names
    key_orig = frozenset({drug1.lower(), drug2.lower()})
    
    hit = LOCAL_INTERACTION_DB.get(key) or LOCAL_INTERACTION_DB.get(key_orig)
    if hit:
        return {
            "conflict": True,
            "drug1": drug1,
            "drug2": drug2,
            "severity": hit["severity"],
            "description": hit["description"],
            "source": "local_db"
        }
    return None

def check_pair(drug1: str, drug2: str) -> dict:
    """Check a single drug pair. Local DB first, then RxNorm API."""
    # 1. Local DB (fast, no network)
    local = check_local_interaction(drug1, drug2)
    if local:
        return local

    # 2. RxNorm API (network, rate-limited)
    rxnorm = check_rxnorm_interaction(drug1, drug2)
    if rxnorm:
        return rxnorm
    
    time.sleep(0.3)  # Be respectful to the free API

    return {
        "conflict": False,
        "drug1": drug1,
        "drug2": drug2,
        "severity": "NONE",
        "description": "No clinically significant interaction detected.",
        "source": "checked"
    }

# ── Multi-Drug Engine Reference Databases ──────────────────────────────────────
ALTERNATIVES_DB = {
    "warfarin": {
        "pregnancy": {
            "alternatives": ["Heparin", "Enoxaparin (Lovenox)"],
            "reason": "Warfarin is teratogenic and contraindicated in pregnancy."
        },
        "interaction": {
            "alternatives": ["Apixaban (Eliquis)", "Dabigatran (Pradaxa)"],
            "reason": "Warfarin has high interaction risk (e.g. bleeding with Aspirin/NSAIDs). Direct oral anticoagulants (DOACs) may have more predictable profiles."
        }
    },
    "ibuprofen": {
        "kidney": {
            "alternatives": ["Acetaminophen (Tylenol)"],
            "reason": "NSAIDs are nephrotoxic and should be avoided in kidney disease."
        },
        "interaction": {
            "alternatives": ["Acetaminophen (Tylenol)"],
            "reason": "NSAIDs have high interaction risk (e.g. bleeding with anticoagulants)."
        }
    },
    "naproxen": {
        "kidney": {
            "alternatives": ["Acetaminophen (Tylenol)"],
            "reason": "NSAIDs are nephrotoxic and should be avoided in kidney disease."
        },
        "interaction": {
            "alternatives": ["Acetaminophen (Tylenol)"],
            "reason": "NSAIDs have high interaction risk (e.g. bleeding with anticoagulants)."
        }
    },
    "metformin": {
        "kidney": {
            "alternatives": ["Insulin", "Glipizide", "Empagliflozin (Jardiance)"],
            "reason": "Metformin is contraindicated in severe renal impairment due to risk of lactic acidosis."
        }
    },
    "lisinopril": {
        "pregnancy": {
            "alternatives": ["Methyldopa", "Labetalol", "Nifedipine"],
            "reason": "ACE inhibitors are teratogenic and contraindicated in pregnancy."
        },
        "kidney": {
            "alternatives": ["Amlodipine"],
            "reason": "ACE inhibitors can cause acute hyperkalemia or worsening renal function in severe renal impairment."
        }
    },
    "losartan": {
        "pregnancy": {
            "alternatives": ["Methyldopa", "Labetalol", "Nifedipine"],
            "reason": "ARBs are teratogenic and contraindicated in pregnancy."
        }
    },
    "diazepam": {
        "elderly": {
            "alternatives": ["Buspirone", "Sertraline", "Melatonin"],
            "reason": "Benzodiazepines increase risk of cognitive impairment, delirium, falls, and fractures in older adults (Beers Criteria)."
        }
    },
    "lorazepam": {
        "elderly": {
            "alternatives": ["Buspirone", "Sertraline", "Melatonin"],
            "reason": "Benzodiazepines increase risk of cognitive impairment, delirium, falls, and fractures in older adults (Beers Criteria)."
        }
    },
    "alprazolam": {
        "elderly": {
            "alternatives": ["Buspirone", "Sertraline", "Melatonin"],
            "reason": "Benzodiazepines increase risk of cognitive impairment, delirium, falls, and fractures in older adults (Beers Criteria)."
        }
    },
    "amitriptyline": {
        "elderly": {
            "alternatives": ["SSRIs (Sertraline, Escitalopram)"],
            "reason": "Highly anticholinergic antidepressant, strongly discouraged in elderly patients."
        }
    },
    "diphenhydramine": {
        "elderly": {
            "alternatives": ["Loratadine", "Cetirizine"],
            "reason": "First-generation antihistamine with high anticholinergic risk in elderly patients."
        }
    },
    "atorvastatin": {
        "liver": {
            "alternatives": ["Pravastatin"],
            "reason": "Statins can be hepatotoxic and should be used with caution/reduced dose in liver disease. Pravastatin is hydrophilic and has lower hepatotoxicity risk."
        },
        "pregnancy": {
            "alternatives": ["Cholestyramine"],
            "reason": "Statins are teratogenic and contraindicated in pregnancy."
        }
    },
    "simvastatin": {
        "liver": {
            "alternatives": ["Pravastatin"],
            "reason": "Statins can be hepatotoxic and should be used with caution/reduced dose in liver disease. Pravastatin is hydrophilic and has lower hepatotoxicity risk."
        },
        "pregnancy": {
            "alternatives": ["Cholestyramine"],
            "reason": "Statins are teratogenic and contraindicated in pregnancy."
        }
    }
}

# Drug classes for cumulative warnings
CNS_DEPRESSANTS = {"diazepam", "lorazepam", "alprazolam", "morphine", "oxycodone", "tramadol", "zolpidem", "alcohol", "gabapentin", "pregabalin"}
QT_PROLONGING = {"amiodarone", "clarithromycin", "erythromycin", "haloperidol", "ondansetron", "citalopram", "levofloxacin", "methadone", "quinidine", "procainamide"}
BLEEDING_AGENTS = {"warfarin", "clopidogrel", "aspirin", "ibuprofen", "naproxen", "apixaban", "rivaroxaban", "heparin", "enoxaparin", "dabigatran", "prasugrel", "ticagrelor"}
SEROTONERGIC_AGENTS = {"fluoxetine", "sertraline", "escitalopram", "paroxetine", "citalopram", "tramadol", "linezolid", "selegiline", "phenelzine", "duloxetine", "venlafaxine"}

# Therapeutic classes for duplication check
STATINS = {"atorvastatin", "simvastatin", "pravastatin", "rosuvastatin", "lovastatin"}
NSAIDS = {"ibuprofen", "naproxen", "celecoxib", "diclofenac", "meloxicam"}
ACE_ARBS = {"lisinopril", "losartan", "valsartan", "enalapril", "ramipril", "candesartan", "irbesartan"}
BENZODIAZEPINES = {"diazepam", "lorazepam", "alprazolam", "clonazepam", "temazepam"}


def analyze_all_interactions(drug_list: list[str], patient: dict = None, dosages: list[dict] = None) -> dict:
    """
    Full pairwise N×N interaction analysis for a list of medications with clinical factors.
    
    Returns:
        interaction_matrix: dict of {drug_pair: result}
        conflicts: list of conflict dicts (conflict=True only)
        severity_counts: {CRITICAL, HIGH, MODERATE, LOW, NONE}
        overall_interaction_score: 0-100 (higher = more dangerous)
        safe_to_prescribe: bool
        combination_analysis: cumulative toxicity and therapeutic duplication alerts
        alternative_medicines: safe replacements for contraindicated/interacting drugs
        emergency_recommendations: urgent clinical action advisories
        patient_contraindications: drug-disease and demographic contraindications
    """
    patient = patient or {}
    dosages = dosages or []
    
    if not drug_list:
        return {
            "interaction_matrix": {},
            "conflicts": [],
            "severity_counts": {"CRITICAL": 0, "HIGH": 0, "MODERATE": 0, "LOW": 0, "NONE": 0},
            "overall_interaction_score": 0,
            "safe_to_prescribe": True,
            "checked_pairs": 0,
            "combination_analysis": [],
            "alternative_medicines": [],
            "emergency_recommendations": ["No medications to analyze."],
            "patient_contraindications": []
        }

    # 1. Pairwise Drug-Drug Interactions
    interaction_matrix = {}
    conflicts = []
    severity_counts = {"CRITICAL": 0, "HIGH": 0, "MODERATE": 0, "LOW": 0, "NONE": 0}
    
    if len(drug_list) >= 2:
        pairs = list(itertools.combinations(drug_list, 2))
        for d1, d2 in pairs:
            key = f"{d1} ↔ {d2}"
            result = check_pair(d1, d2)
            interaction_matrix[key] = result
            
            sev = result.get("severity", "NONE")
            if result.get("conflict"):
                conflicts.append(result)
                if sev in severity_counts:
                    severity_counts[sev] += 1
                else:
                    severity_counts["LOW"] += 1
            else:
                severity_counts["NONE"] += 1
    else:
        pairs = []

    # Compute overall interaction score (0–100)
    sev_weights = {"CRITICAL": 100, "HIGH": 75, "MODERATE": 45, "LOW": 20, "NONE": 0}
    if conflicts:
        max_score = max(sev_weights.get(c.get("severity", "NONE"), 0) for c in conflicts)
        bonus = min(len(conflicts) * 5, 20)
        overall_score = min(100, max_score + bonus)
    else:
        overall_score = 0

    # 2. Patient Profile contraindications (Demographics, Organ Diseases, Allergies)
    contraindications = []
    alternatives_suggestions = []
    
    age = int(patient.get("age") or 45)
    weight = float(patient.get("weight_kg") or patient.get("weight") or 70.0)
    gender = str(patient.get("gender") or "unknown").strip().lower()
    pregnant = bool(patient.get("pregnant") or patient.get("pregnancy") or False)
    
    # Resolve kidney GFR
    gfr_val = patient.get("kidney_gfr")
    kidney_gfr = float(gfr_val) if gfr_val is not None else 90.0
    
    # Resolve liver score
    l_val = patient.get("liver_score")
    liver_score = int(l_val) if l_val is not None else 0
    
    # Normalize lists
    allergies = [str(a).strip().lower() for a in (patient.get("allergies") or [])]
    chronic_conditions = [str(c).strip().lower() for c in (patient.get("chronicConditions") or patient.get("current_diseases") or [])]

    # Beers Criteria
    if age >= 65:
        BEERS_DRUGS = {"diazepam", "lorazepam", "alprazolam", "amitriptyline", "diphenhydramine", "zolpidem"}
        for drug in drug_list:
            nd = drug.strip().lower()
            if nd in BEERS_DRUGS:
                contra = {
                    "drug": drug,
                    "condition": "Elderly (Age >= 65)",
                    "severity": "HIGH",
                    "description": f"Elderly patient (age {age}). Benzodiazepine/Antihistamine/Tricyclic Antidepressant is on the Beers Criteria list. High risk of falls, delirium, and fractures."
                }
                contraindications.append(contra)
                
                alt_entry = ALTERNATIVES_DB.get(nd, {}).get("elderly")
                if alt_entry:
                    alternatives_suggestions.append({
                        "drug": drug,
                        "reason": alt_entry["reason"],
                        "alternatives": alt_entry["alternatives"]
                    })

    # Pregnancy teratogenicity
    if pregnant:
        PREG_CONTRA = {"warfarin", "lisinopril", "losartan", "methotrexate", "atorvastatin", "simvastatin"}
        for drug in drug_list:
            nd = drug.strip().lower()
            if nd in PREG_CONTRA:
                contra = {
                    "drug": drug,
                    "condition": "Pregnancy",
                    "severity": "CRITICAL",
                    "description": f"Pregnant patient. {drug} has teratogenic risks and is strictly contraindicated."
                }
                contraindications.append(contra)
                
                alt_entry = ALTERNATIVES_DB.get(nd, {}).get("pregnancy")
                if alt_entry:
                    alternatives_suggestions.append({
                        "drug": drug,
                        "reason": alt_entry["reason"],
                        "alternatives": alt_entry["alternatives"]
                    })

    # Renal impairment
    if kidney_gfr < 45 or "kidney" in chronic_conditions or "renal" in chronic_conditions:
        RENAL_CONTRA = {"ibuprofen", "naproxen", "metformin", "spironolactone", "lisinopril"}
        for drug in drug_list:
            nd = drug.strip().lower()
            if nd in RENAL_CONTRA:
                severity = "HIGH" if kidney_gfr >= 30 else "CRITICAL"
                contra = {
                    "drug": drug,
                    "condition": f"Kidney Disease (GFR {kidney_gfr:.1f})",
                    "severity": severity,
                    "description": f"Patient has kidney impairment. {drug} is nephrotoxic or can accumulate to toxic levels."
                }
                contraindications.append(contra)
                
                alt_entry = ALTERNATIVES_DB.get(nd, {}).get("kidney")
                if alt_entry:
                    alternatives_suggestions.append({
                        "drug": drug,
                        "reason": alt_entry["reason"],
                        "alternatives": alt_entry["alternatives"]
                    })

    # Hepatic impairment
    if liver_score >= 5 or "liver" in chronic_conditions or "hepatic" in chronic_conditions:
        HEPATIC_CONTRA = {"acetaminophen", "paracetamol", "atorvastatin", "simvastatin", "methotrexate"}
        for drug in drug_list:
            nd = drug.strip().lower()
            if nd in HEPATIC_CONTRA:
                contra = {
                    "drug": drug,
                    "condition": f"Liver Disease (Child-Pugh Class {'B' if liver_score < 10 else 'C'})",
                    "severity": "HIGH",
                    "description": f"Patient has hepatic impairment. {drug} is hepatotoxic or metabolized primarily by the liver."
                }
                contraindications.append(contra)
                
                alt_entry = ALTERNATIVES_DB.get(nd, {}).get("liver")
                if alt_entry:
                    alternatives_suggestions.append({
                        "drug": drug,
                        "reason": alt_entry["reason"],
                        "alternatives": alt_entry["alternatives"]
                    })

    # Allergy checks
    for drug in drug_list:
        nd = drug.strip().lower()
        for allergy in allergies:
            if allergy in nd or nd in allergy:
                contra = {
                    "drug": drug,
                    "condition": f"Known Allergy: {allergy.upper()}",
                    "severity": "CRITICAL",
                    "description": f"Documented patient allergy to {allergy}. Administration of {drug} is contraindicated due to risk of hypersensitivity or anaphylaxis."
                }
                contraindications.append(contra)
                
                alternatives_suggestions.append({
                    "drug": drug,
                    "reason": f"Patient is allergic to {allergy}.",
                    "alternatives": ["Erythromycin", "Azithromycin"] if "penicillin" in allergy else ["Alternative class (consult allergist)"]
                })

    # 3. Drug-Combination Analysis (Cumulative Toxicity & Therapeutic Duplication)
    combination_warnings = []
    
    # CNS Depression
    cns_overlap = [d for d in drug_list if d.strip().lower() in CNS_DEPRESSANTS]
    if len(cns_overlap) >= 2:
        combination_warnings.append({
            "name": "CNS Depression Risk",
            "severity": "CRITICAL" if any(x in [c.lower() for c in cns_overlap] for x in ("morphine", "oxycodone")) else "HIGH",
            "description": f"Combined use of multiple CNS depressants ({', '.join(cns_overlap)}). Synergistic drug effects dramatically increase risk of severe respiratory depression, profound sedation, coma, and death.",
            "drugs_involved": cns_overlap
        })
        
    # Bleeding Risk
    bleed_overlap = [d for d in drug_list if d.strip().lower() in BLEEDING_AGENTS]
    if len(bleed_overlap) >= 2:
        combination_warnings.append({
            "name": "Additive Bleeding Risk",
            "severity": "HIGH",
            "description": f"Combined use of anticoagulants, antiplatelets, or NSAIDs ({', '.join(bleed_overlap)}). Significantly increases bleeding risk, including potentially life-threatening gastrointestinal hemorrhage.",
            "drugs_involved": bleed_overlap
        })
        
    # QTc Prolongation
    qt_overlap = [d for d in drug_list if d.strip().lower() in QT_PROLONGING]
    if len(qt_overlap) >= 2:
        combination_warnings.append({
            "name": "QTc Prolongation Risk",
            "severity": "HIGH",
            "description": f"Combined use of multiple QTc-prolonging drugs ({', '.join(qt_overlap)}). Synergically increases risk of Torsades de Pointes, a life-threatening ventricular arrhythmia.",
            "drugs_involved": qt_overlap
        })
        
    # Serotonin Syndrome
    ser_overlap = [d for d in drug_list if d.strip().lower() in SEROTONERGIC_AGENTS]
    if len(ser_overlap) >= 2:
        combination_warnings.append({
            "name": "Serotonin Syndrome Risk",
            "severity": "CRITICAL" if any(x in [s.lower() for s in ser_overlap] for x in ("selegiline", "phenelzine", "linezolid")) else "HIGH",
            "description": f"Concurrent use of multiple serotonergic agents ({', '.join(ser_overlap)}). May lead to Serotonin Syndrome, characterized by autonomic instability, muscle rigidity, hyperthermia, and altered mental status.",
            "drugs_involved": ser_overlap
        })

    # Therapeutic Duplication
    classes = [
        ("STATINS", STATINS),
        ("NSAIDS", NSAIDS),
        ("ACE_ARBS", ACE_ARBS),
        ("BENZODIAZEPINES", BENZODIAZEPINES)
    ]
    for class_name, class_set in classes:
        overlap = [d for d in drug_list if d.strip().lower() in class_set]
        if len(overlap) >= 2:
            combination_warnings.append({
                "name": f"Therapeutic Duplication ({class_name})",
                "severity": "MODERATE",
                "description": f"Multiple drugs of the same class ({', '.join(overlap)}) prescribed. Therapeutic duplication increases toxicity risks without providing additive therapeutic benefits.",
                "drugs_involved": overlap
            })

    # Suggest alternatives for drug-drug interaction conflicts
    for conflict in conflicts:
        d1 = conflict["drug1"]
        d2 = conflict["drug2"]
        sev = conflict["severity"]
        if sev in ("HIGH", "CRITICAL"):
            for d in (d1, d2):
                nd = d.strip().lower()
                alt_entry = ALTERNATIVES_DB.get(nd, {}).get("interaction")
                if alt_entry and not any(a["drug"] == d for a in alternatives_suggestions):
                    alternatives_suggestions.append({
                        "drug": d,
                        "reason": f"Drug-drug interaction between {d1} and {d2} ({sev} severity).",
                        "alternatives": alt_entry["alternatives"]
                    })

    # 4. Emergency Recommendations
    emergency_recs = []
    
    has_critical_interaction = severity_counts.get("CRITICAL", 0) > 0 or any(c["severity"] == "CRITICAL" for c in contraindications)
    has_high_interaction = severity_counts.get("HIGH", 0) > 0 or any(c["severity"] == "HIGH" for c in contraindications)
    
    if has_critical_interaction:
        emergency_recs.append("CRITICAL WARNING: Do not start or dispense this medication combination without direct, immediate physician consultation.")
    elif has_high_interaction:
        emergency_recs.append("HIGH WARNING: A physician or pharmacist must review this prescription before it is administered to the patient.")
        
    if any(w["name"] == "CNS Depression Risk" for w in combination_warnings):
        emergency_recs.append("MONITOR: Watch for extreme drowsiness, shallow or slow breathing, pinpoint pupils, or unresponsiveness. Seek emergency care immediately if observed.")
    if any(w["name"] == "Additive Bleeding Risk" for w in combination_warnings):
        emergency_recs.append("MONITOR: Watch for unusual bruising, blood in urine or stool (black/tarry stools), frequent nosebleeds, or coughing up blood. Contact emergency services for severe, uncontrollable bleeding.")
    if any(w["name"] == "QTc Prolongation Risk" for w in combination_warnings):
        emergency_recs.append("MONITOR: Watch for sudden dizziness, lightheadedness, palpitations, or fainting. Seek immediate emergency evaluation.")
    if any(w["name"] == "Serotonin Syndrome Risk" for w in combination_warnings):
        emergency_recs.append("MONITOR: Watch for high fever, rapid heart rate, severe muscle twitching or rigidity, shivering, confusion, or agitation. Seek emergency care immediately.")
        
    if not emergency_recs:
        emergency_recs.append("Monitor patient for any unexpected side effects. Report minor symptoms to the prescribing physician.")

    safe_to_prescribe = severity_counts["CRITICAL"] == 0 and severity_counts["HIGH"] == 0 and not any(c["severity"] in ("CRITICAL", "HIGH") for c in contraindications)

    return {
        "interaction_matrix": interaction_matrix,
        "conflicts": conflicts,
        "severity_counts": severity_counts,
        "overall_interaction_score": round(overall_score, 1),
        "safe_to_prescribe": safe_to_prescribe,
        "checked_pairs": len(pairs),
        "combination_analysis": combination_warnings,
        "alternative_medicines": alternatives_suggestions,
        "emergency_recommendations": emergency_recs,
        "patient_contraindications": contraindications
    }

# ── Blueprint Routes ──────────────────────────────────────────────────────────

@interaction_bp.route('/cdss/interactions', methods=['POST'])
def drug_interactions():
    """
    POST /cdss/interactions
    Body: { "medications": ["Drug1", "Drug2", "Drug3", ...] }
    Returns: full pairwise interaction analysis
    """
    try:
        data = request.get_json(silent=True) or {}
        medications = data.get("medications", [])
        
        if not medications:
            return jsonify({"error": "medications array is required"}), 400
        if not isinstance(medications, list):
            return jsonify({"error": "medications must be an array"}), 400
        
        # Deduplicate while preserving order
        seen = set()
        unique_meds = [m for m in medications if not (m.lower() in seen or seen.add(m.lower()))]
        
        logger.info(f"Analyzing interactions for {len(unique_meds)} drugs")
        result = analyze_all_interactions(unique_meds)
        
        return jsonify({
            "medications": unique_meds,
            **result
        }), 200

    except Exception as e:
        logger.error(f"Interaction analysis error: {e}")
        return jsonify({"error": "Interaction analysis failed", "details": str(e)}), 500
