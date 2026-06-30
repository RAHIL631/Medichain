# ai/cdss/prescription_validator.py
# ─────────────────────────────────────────────────────────────────────────────
# MediChain AI — Unified Prescription Validation Pipeline
#
# POST /cdss/validate-prescription
#
# Pipeline (in order):
#   1. OCR Extraction       — medicines, dosages, frequencies from image/PDF
#   2. Disease Detection    — infer likely indications from drug classes
#   3. Duplicate Detection  — flag same therapeutic class prescribed twice
#   4. Overdose Check       — dose vs patient-adjusted max safe dose
#   5. Drug Interactions    — pairwise N×N matrix (RxNorm + local DB)
#   6. Allergy Check        — extracted drugs vs patient allergy list
#   7. Pregnancy Safety     — teratogenic / contraindicated drugs
#   8. Kidney Safety        — renally-cleared drugs vs GFR
#   9. Liver Safety         — hepatically metabolized drugs vs liver score
#  10. Safety Score         — 0–100 aggregate prescription safety score
#
# Returns: structured JSON with all check results
# ─────────────────────────────────────────────────────────────────────────────

import hashlib
import json
import logging
from datetime import datetime
from io import BytesIO
from typing import List, Optional

from flask import Blueprint, jsonify, request

logger = logging.getLogger("cdss.prescription_validator")

validator_bp = Blueprint("prescription_validator", __name__)


# ── Drug-to-Disease Indication Mapping ───────────────────────────────────────
DRUG_INDICATIONS = {
    # Diabetes
    "metformin": ["Type 2 Diabetes Mellitus"],
    "insulin": ["Type 1 / Type 2 Diabetes Mellitus"],
    "glipizide": ["Type 2 Diabetes Mellitus"],
    "glyburide": ["Type 2 Diabetes Mellitus"],
    "glimepiride": ["Type 2 Diabetes Mellitus"],
    "sitagliptin": ["Type 2 Diabetes Mellitus"],
    "empagliflozin": ["Type 2 Diabetes Mellitus", "Heart Failure", "Chronic Kidney Disease"],
    "dapagliflozin": ["Type 2 Diabetes Mellitus", "Heart Failure", "Chronic Kidney Disease"],
    "liraglutide": ["Type 2 Diabetes Mellitus", "Obesity"],
    "semaglutide": ["Type 2 Diabetes Mellitus", "Obesity"],
    # Cardiovascular
    "atorvastatin": ["Hyperlipidemia", "Cardiovascular Disease Prevention"],
    "simvastatin": ["Hyperlipidemia", "Cardiovascular Disease Prevention"],
    "rosuvastatin": ["Hyperlipidemia", "Cardiovascular Disease Prevention"],
    "amlodipine": ["Hypertension", "Angina Pectoris"],
    "lisinopril": ["Hypertension", "Heart Failure", "Diabetic Nephropathy"],
    "enalapril": ["Hypertension", "Heart Failure"],
    "ramipril": ["Hypertension", "Heart Failure", "Post-MI"],
    "losartan": ["Hypertension", "Diabetic Nephropathy"],
    "valsartan": ["Hypertension", "Heart Failure"],
    "metoprolol": ["Hypertension", "Heart Failure", "Atrial Fibrillation"],
    "atenolol": ["Hypertension", "Angina"],
    "furosemide": ["Heart Failure", "Edema", "Hypertension"],
    "spironolactone": ["Heart Failure", "Primary Aldosteronism"],
    "warfarin": ["Atrial Fibrillation", "Thrombosis", "Pulmonary Embolism"],
    "clopidogrel": ["Coronary Artery Disease", "Antiplatelet Therapy"],
    "aspirin": ["Pain / Fever", "Cardiovascular Disease Prevention", "Anti-inflammatory"],
    "digoxin": ["Heart Failure", "Atrial Fibrillation"],
    "nitroglycerin": ["Angina Pectoris"],
    "isosorbide": ["Angina Pectoris", "Heart Failure"],
    # Antibiotics
    "amoxicillin": ["Bacterial Infection"],
    "azithromycin": ["Bacterial Infection", "Community-Acquired Pneumonia"],
    "ciprofloxacin": ["Urinary Tract Infection", "Bacterial Infection"],
    "doxycycline": ["Bacterial Infection", "Acne Vulgaris"],
    "metronidazole": ["Anaerobic Infection", "H. pylori Eradication"],
    "clindamycin": ["Bacterial Infection", "Anaerobic Infection"],
    "vancomycin": ["MRSA / Resistant Bacterial Infection"],
    "penicillin": ["Bacterial Infection", "Streptococcal Infection"],
    "trimethoprim": ["Urinary Tract Infection"],
    "erythromycin": ["Bacterial Infection"],
    "clarithromycin": ["Bacterial Infection", "H. pylori Eradication"],
    "levofloxacin": ["Pneumonia", "Urinary Tract Infection"],
    # Pain/Inflammation
    "ibuprofen": ["Pain / Inflammation", "Fever"],
    "naproxen": ["Pain / Inflammation", "Arthritis"],
    "diclofenac": ["Pain / Inflammation", "Arthritis"],
    "celecoxib": ["Arthritis", "Pain"],
    "paracetamol": ["Pain / Fever"],
    "acetaminophen": ["Pain / Fever"],
    "tramadol": ["Moderate to Severe Pain"],
    "codeine": ["Mild to Moderate Pain", "Cough"],
    "morphine": ["Severe Pain", "Palliative Care"],
    "oxycodone": ["Moderate to Severe Pain"],
    # CNS / Psychiatry
    "fluoxetine": ["Depression", "Anxiety Disorders", "OCD"],
    "sertraline": ["Depression", "Anxiety Disorders", "PTSD"],
    "escitalopram": ["Depression", "Generalized Anxiety Disorder"],
    "venlafaxine": ["Depression", "Anxiety Disorders"],
    "amitriptyline": ["Depression", "Neuropathic Pain", "Migraine Prophylaxis"],
    "quetiapine": ["Schizophrenia", "Bipolar Disorder"],
    "olanzapine": ["Schizophrenia", "Bipolar Disorder"],
    "risperidone": ["Schizophrenia", "Bipolar Disorder"],
    "haloperidol": ["Schizophrenia", "Acute Psychosis"],
    "clonazepam": ["Epilepsy", "Anxiety", "Panic Disorder"],
    "diazepam": ["Anxiety", "Muscle Spasm", "Seizures"],
    "alprazolam": ["Anxiety", "Panic Disorder"],
    "lorazepam": ["Anxiety", "Insomnia", "Seizures"],
    "lithium": ["Bipolar Disorder"],
    "zolpidem": ["Insomnia"],
    # Respiratory
    "salbutamol": ["Asthma", "COPD"],
    "albuterol": ["Asthma", "COPD"],
    "budesonide": ["Asthma", "COPD", "Rhinitis"],
    "fluticasone": ["Asthma", "Rhinitis"],
    "montelukast": ["Asthma", "Allergic Rhinitis"],
    "cetirizine": ["Allergic Rhinitis", "Urticaria"],
    "loratadine": ["Allergic Rhinitis", "Urticaria"],
    "fexofenadine": ["Allergic Rhinitis", "Urticaria"],
    "prednisone": ["Inflammatory / Autoimmune Conditions"],
    "prednisolone": ["Inflammatory / Autoimmune Conditions"],
    "dexamethasone": ["Inflammatory / Autoimmune Conditions", "Allergic Reactions"],
    "theophylline": ["Asthma", "COPD"],
    # GI
    "omeprazole": ["Gastroesophageal Reflux Disease (GERD)", "Peptic Ulcer"],
    "pantoprazole": ["GERD", "Peptic Ulcer"],
    "esomeprazole": ["GERD", "Peptic Ulcer"],
    "ranitidine": ["GERD", "Peptic Ulcer"],
    "metoclopramide": ["Nausea / Vomiting", "Gastroparesis"],
    "ondansetron": ["Nausea / Vomiting", "Chemotherapy-Induced Nausea"],
    "loperamide": ["Diarrhea"],
    "lactulose": ["Constipation", "Hepatic Encephalopathy"],
    # Thyroid / Hormones
    "levothyroxine": ["Hypothyroidism"],
    "methimazole": ["Hyperthyroidism"],
    "tamoxifen": ["Breast Cancer"],
    "letrozole": ["Breast Cancer"],
    "hydroxychloroquine": ["Rheumatoid Arthritis", "Lupus", "Malaria"],
    "methotrexate": ["Rheumatoid Arthritis", "Psoriasis", "Cancer"],
}

# ── Pregnancy Contraindication List ─────────────────────────────────────────
PREGNANCY_CONTRAINDICATED = {
    "warfarin": "Teratogenic; may cause fetal hemorrhage and embryopathy (warfarin syndrome).",
    "lisinopril": "ACE inhibitors cause fetal renal damage and oligohydramnios in 2nd/3rd trimester.",
    "enalapril": "ACE inhibitor — contraindicated in pregnancy.",
    "ramipril": "ACE inhibitor — contraindicated in pregnancy.",
    "losartan": "ARB — teratogenic; causes fetal renal damage.",
    "valsartan": "ARB — contraindicated in pregnancy.",
    "atorvastatin": "Statin — teratogenic; inhibits fetal sterol synthesis.",
    "simvastatin": "Statin — teratogenic; contraindicated in pregnancy.",
    "rosuvastatin": "Statin — teratogenic; contraindicated in pregnancy.",
    "methotrexate": "Potent teratogen and abortifacient — absolutely contraindicated.",
    "isotretinoin": "Highly teratogenic — absolutely contraindicated.",
    "thalidomide": "Severe teratogen — absolutely contraindicated.",
    "finasteride": "Risk of feminisation of male fetus.",
    "doxycycline": "Teratogenic in 2nd/3rd trimester; causes tooth discoloration in fetus.",
    "ciprofloxacin": "Fluoroquinolone — avoid in pregnancy (cartilage toxicity).",
    "levofloxacin": "Fluoroquinolone — avoid in pregnancy.",
    "ibuprofen": "NSAID — avoid in 3rd trimester (premature closure of ductus arteriosus).",
    "naproxen": "NSAID — avoid in 3rd trimester.",
    "diclofenac": "NSAID — avoid in 3rd trimester.",
    "tamoxifen": "Contraindicated — risk to fetus.",
    "letrozole": "Aromatase inhibitor — contraindicated in pregnancy.",
    "misoprostol": "Prostaglandin — induces uterine contractions and miscarriage.",
}

# ── Kidney Safety Reference ──────────────────────────────────────────────────
KIDNEY_RISKY_DRUGS = {
    "metformin":      {"gfr_threshold": 30, "risk": "Lactic acidosis risk with severe renal impairment (GFR < 30)."},
    "ibuprofen":      {"gfr_threshold": 60, "risk": "NSAIDs reduce renal prostaglandin synthesis, reducing GFR and causing acute kidney injury."},
    "naproxen":       {"gfr_threshold": 60, "risk": "NSAID — nephrotoxic in patients with reduced renal function."},
    "diclofenac":     {"gfr_threshold": 60, "risk": "NSAID — avoid in renal impairment."},
    "celecoxib":      {"gfr_threshold": 60, "risk": "COX-2 inhibitor — nephrotoxic; avoid in significant renal impairment."},
    "lisinopril":     {"gfr_threshold": 30, "risk": "ACE inhibitor — can acutely worsen renal function in bilateral renal artery stenosis or severe CKD."},
    "enalapril":      {"gfr_threshold": 30, "risk": "ACE inhibitor — renal function monitoring required."},
    "ramipril":       {"gfr_threshold": 30, "risk": "ACE inhibitor — renal function monitoring required."},
    "losartan":       {"gfr_threshold": 30, "risk": "ARB — can worsen renal function in severe CKD."},
    "spironolactone": {"gfr_threshold": 30, "risk": "Potassium-sparing diuretic — hyperkalemia risk in CKD."},
    "warfarin":       {"gfr_threshold": 15, "risk": "Increased bleeding risk with severe renal impairment."},
    "digoxin":        {"gfr_threshold": 30, "risk": "Renally cleared; accumulates to toxic levels in severe renal impairment."},
    "lithium":        {"gfr_threshold": 30, "risk": "Renally cleared; narrow therapeutic index — nephrotoxic at high levels."},
    "vancomycin":     {"gfr_threshold": 30, "risk": "Nephrotoxic antibiotic — dose adjustment essential in renal impairment."},
    "gentamicin":     {"gfr_threshold": 60, "risk": "Aminoglycoside — nephrotoxic; avoid in renal impairment."},
    "trimethoprim":   {"gfr_threshold": 30, "risk": "Can falsely elevate serum creatinine and worsen renal impairment."},
    "methotrexate":   {"gfr_threshold": 45, "risk": "Renally cleared; severe toxicity risk with renal impairment."},
    "amphotericin":   {"gfr_threshold": 30, "risk": "Highly nephrotoxic antifungal — monitor closely."},
    "furosemide":     {"gfr_threshold": 15, "risk": "May be ineffective and ototoxic at very low GFR."},
    "hydrochlorothiazide": {"gfr_threshold": 30, "risk": "Thiazide diuretics become ineffective at GFR < 30 mL/min."},
    "acyclovir":      {"gfr_threshold": 25, "risk": "Crystallizes in renal tubules at high doses; dose reduction required."},
}

# ── Liver Safety Reference ────────────────────────────────────────────────────
LIVER_RISKY_DRUGS = {
    "acetaminophen": {"score_threshold": 5, "risk": "Hepatotoxic at high doses or with alcohol use. Major cause of acute liver failure."},
    "paracetamol":   {"score_threshold": 5, "risk": "Same as acetaminophen — hepatotoxic, dose-reduce in hepatic impairment."},
    "atorvastatin":  {"score_threshold": 7, "risk": "Statin — hepatotoxic; elevated liver enzymes common. Avoid in severe hepatic impairment."},
    "simvastatin":   {"score_threshold": 7, "risk": "Statin — hepatotoxic; contraindicated in active liver disease."},
    "rosuvastatin":  {"score_threshold": 7, "risk": "Statin — hepatotoxic; use with caution in hepatic impairment."},
    "methotrexate":  {"score_threshold": 5, "risk": "Hepatotoxic — causes hepatic fibrosis/cirrhosis with chronic use."},
    "amoxicillin":   {"score_threshold": 7, "risk": "Can cause cholestatic hepatitis (drug-induced liver injury)."},
    "clarithromycin":{"score_threshold": 7, "risk": "Macrolide — can cause drug-induced liver injury."},
    "erythromycin":  {"score_threshold": 7, "risk": "Can cause cholestatic hepatitis."},
    "azithromycin":  {"score_threshold": 9, "risk": "Rare drug-induced liver injury reported."},
    "isoniazid":     {"score_threshold": 5, "risk": "Hepatotoxic TB drug — monitor LFTs closely."},
    "fluconazole":   {"score_threshold": 7, "risk": "Azole antifungal — hepatotoxic in high doses."},
    "ketoconazole":  {"score_threshold": 5, "risk": "Highly hepatotoxic antifungal — avoid."},
    "carbamazepine": {"score_threshold": 7, "risk": "Anticonvulsant — can cause severe drug-induced liver injury."},
    "valproate":     {"score_threshold": 5, "risk": "Anticonvulsant — mitochondrial hepatotoxicity risk."},
    "rifampicin":    {"score_threshold": 5, "risk": "Potent enzyme inducer — hepatotoxic in combination therapy."},
    "tamoxifen":     {"score_threshold": 7, "risk": "Can cause hepatic steatosis and elevated liver enzymes."},
    "chlorpromazine":{"score_threshold": 7, "risk": "Phenothiazine — can cause cholestatic jaundice."},
    "haloperidol":   {"score_threshold": 9, "risk": "Rare drug-induced liver injury."},
    "ibuprofen":     {"score_threshold": 9, "risk": "NSAID — rare but can cause drug-induced liver injury."},
    "diclofenac":    {"score_threshold": 7, "risk": "NSAID — most hepatotoxic NSAID; elevated LFTs common."},
}

# ── Therapeutic Class Duplication Map ────────────────────────────────────────
THERAPEUTIC_CLASSES = {
    "STATIN":           {"atorvastatin", "simvastatin", "rosuvastatin", "pravastatin", "lovastatin", "fluvastatin"},
    "NSAID":            {"ibuprofen", "naproxen", "diclofenac", "celecoxib", "meloxicam", "indomethacin", "ketorolac"},
    "ACE_INHIBITOR":    {"lisinopril", "enalapril", "ramipril", "perindopril", "captopril", "quinapril"},
    "ARB":              {"losartan", "valsartan", "irbesartan", "candesartan", "olmesartan", "telmisartan"},
    "BETABLOCKER":      {"metoprolol", "atenolol", "propranolol", "carvedilol", "bisoprolol", "nebivolol"},
    "BENZODIAZEPINE":   {"diazepam", "lorazepam", "alprazolam", "clonazepam", "temazepam", "triazolam"},
    "SSRI":             {"fluoxetine", "sertraline", "escitalopram", "paroxetine", "citalopram", "fluvoxamine"},
    "PPI":              {"omeprazole", "pantoprazole", "esomeprazole", "lansoprazole", "rabeprazole"},
    "ANTIBIOTIC_PENICILLIN": {"amoxicillin", "ampicillin", "penicillin", "piperacillin"},
    "ANTIBIOTIC_FLUOROQUINOLONE": {"ciprofloxacin", "levofloxacin", "moxifloxacin", "ofloxacin"},
    "THIAZIDE_DIURETIC": {"hydrochlorothiazide", "chlorthalidone", "indapamide"},
    "OPIOID":           {"morphine", "oxycodone", "hydrocodone", "codeine", "tramadol", "fentanyl", "buprenorphine"},
    "CALCIUM_CHANNEL_BLOCKER": {"amlodipine", "nifedipine", "diltiazem", "verapamil", "felodipine"},
    "ANTIHISTAMINE":    {"cetirizine", "loratadine", "fexofenadine", "diphenhydramine", "chlorphenamine"},
}


# ── Core Pipeline Functions ───────────────────────────────────────────────────

def detect_diseases(medications: List[str]) -> List[dict]:
    """Map drug names to likely clinical indications."""
    result = []
    seen_diseases = set()
    for drug in medications:
        key = drug.strip().lower()
        indications = DRUG_INDICATIONS.get(key, [])
        for indication in indications:
            if indication not in seen_diseases:
                seen_diseases.add(indication)
                result.append({"indication": indication, "suggested_by": drug})
    return result


def detect_duplicates(medications: List[str]) -> List[dict]:
    """Flag therapeutic class duplications."""
    duplicates = []
    drug_lower = [m.strip().lower() for m in medications]
    for class_name, class_members in THERAPEUTIC_CLASSES.items():
        found = [medications[i] for i, d in enumerate(drug_lower) if d in class_members]
        if len(found) >= 2:
            duplicates.append({
                "class": class_name.replace("_", " ").title(),
                "drugs": found,
                "severity": "MODERATE",
                "message": (
                    f"Therapeutic duplication detected: {len(found)} drugs from the same "
                    f"{class_name.replace('_', ' ').title()} class prescribed together. "
                    f"This may increase toxicity risk without additional benefit."
                ),
            })
    return duplicates


def check_overdose(structured_medications: List[dict], patient: dict) -> List[dict]:
    """Compare prescribed doses against patient-adjusted safe doses."""
    from services.dosage_safety_service import DRUG_PROFILES, FREQ_VALUES, _compute_adjusted_max_dose
    results = []
    age = float(patient.get("age", 45))
    kidney_gfr = float(patient.get("kidney_gfr", 90))

    for item in structured_medications:
        drug = item.get("drug", "").strip().lower()
        dose_str = item.get("dose", "") or ""
        freq_str = item.get("frequency", "") or ""

        # Parse dose number from string like "500mg" or "500"
        import re
        dose_match = re.search(r"(\d+(?:\.\d+)?)", dose_str)
        if not dose_match:
            continue
        dose_mg = float(dose_match.group(1))

        prof = DRUG_PROFILES.get(drug, {})
        if not prof:
            results.append({
                "drug": item.get("drug"),
                "prescribed_dose_mg": dose_mg,
                "max_safe_dose_mg": None,
                "status": "UNKNOWN",
                "message": f"{item.get('drug')} not in dosage reference database — manual review required.",
                "frequency": freq_str,
            })
            continue

        max_safe = _compute_adjusted_max_dose(drug, patient)
        daily_max = float(prof.get("daily_max", 9999))
        freq_key = freq_str.lower().replace("-", "_").replace(" ", "_")
        freq_val = float(FREQ_VALUES.get(freq_key, FREQ_VALUES.get(freq_str.lower(), 1)))
        daily_dose = dose_mg * freq_val

        if dose_mg > max_safe * 1.5:
            status = "OVERDOSE"
            severity = "CRITICAL"
            msg = f"Prescribed dose {dose_mg}mg exceeds toxic threshold ({max_safe * 1.5:.0f}mg). Immediate review required."
        elif dose_mg > max_safe:
            status = "EXCEEDS_MAX"
            severity = "HIGH"
            msg = f"Prescribed dose {dose_mg}mg exceeds patient-adjusted maximum safe dose of {max_safe}mg."
        elif daily_dose > daily_max:
            status = "DAILY_LIMIT_EXCEEDED"
            severity = "MODERATE"
            msg = f"Total daily dose {daily_dose:.0f}mg exceeds maximum daily limit of {daily_max}mg."
        else:
            status = "SAFE"
            severity = "NONE"
            msg = f"Dose within safe range. Patient-adjusted maximum: {max_safe}mg per dose."

        results.append({
            "drug": item.get("drug"),
            "prescribed_dose_mg": dose_mg,
            "max_safe_dose_mg": max_safe,
            "daily_dose_mg": round(daily_dose, 1),
            "daily_max_mg": daily_max,
            "status": status,
            "severity": severity,
            "message": msg,
            "frequency": freq_str,
            "narrow_therapeutic_index": bool(prof.get("narrow_index", False)),
        })

    return results


def check_allergies(medications: List[str], allergies: List[str]) -> List[dict]:
    """Check each drug against the patient's known allergy list."""
    results = []
    allergy_lower = [a.strip().lower() for a in (allergies or [])]
    for drug in medications:
        drug_lower = drug.strip().lower()
        matched = []
        for al in allergy_lower:
            if al in drug_lower or drug_lower in al:
                matched.append(al)
        if matched:
            results.append({
                "drug": drug,
                "matched_allergies": matched,
                "severity": "CRITICAL",
                "status": "CONTRAINDICATED",
                "message": (
                    f"Patient has documented allergy to {', '.join(matched).upper()}. "
                    f"Administering {drug} risks anaphylaxis or severe hypersensitivity reaction."
                ),
            })
        else:
            results.append({
                "drug": drug,
                "matched_allergies": [],
                "severity": "NONE",
                "status": "CLEAR",
                "message": f"No known allergy conflict for {drug}.",
            })
    return results


def check_pregnancy_safety(medications: List[str], pregnant: bool) -> List[dict]:
    """Flag drugs contraindicated in pregnancy."""
    results = []
    for drug in medications:
        drug_lower = drug.strip().lower()
        risk_info = PREGNANCY_CONTRAINDICATED.get(drug_lower)
        if pregnant and risk_info:
            results.append({
                "drug": drug,
                "status": "CONTRAINDICATED",
                "severity": "CRITICAL",
                "message": risk_info,
                "pregnancy_relevant": True,
            })
        else:
            results.append({
                "drug": drug,
                "status": "CLEAR" if pregnant else "NOT_APPLICABLE",
                "severity": "NONE",
                "message": f"No pregnancy contraindication for {drug}." if pregnant else "Patient not pregnant — check not applicable.",
                "pregnancy_relevant": False,
            })
    return results


def check_kidney_safety(medications: List[str], kidney_gfr: float) -> List[dict]:
    """Assess each drug's renal risk against patient's GFR."""
    results = []
    for drug in medications:
        drug_lower = drug.strip().lower()
        risk = KIDNEY_RISKY_DRUGS.get(drug_lower)
        if risk and kidney_gfr < risk["gfr_threshold"]:
            if kidney_gfr < 30:
                severity = "CRITICAL"
                status = "CONTRAINDICATED"
            elif kidney_gfr < 45:
                severity = "HIGH"
                status = "HIGH_RISK"
            else:
                severity = "MODERATE"
                status = "USE_WITH_CAUTION"
            results.append({
                "drug": drug,
                "patient_gfr": kidney_gfr,
                "gfr_threshold": risk["gfr_threshold"],
                "status": status,
                "severity": severity,
                "message": risk["risk"],
            })
        else:
            results.append({
                "drug": drug,
                "patient_gfr": kidney_gfr,
                "status": "SAFE",
                "severity": "NONE",
                "message": f"{drug} is safe at current GFR of {kidney_gfr} mL/min." if risk else f"No known renal toxicity for {drug}.",
            })
    return results


def check_liver_safety(medications: List[str], liver_score: int) -> List[dict]:
    """Assess each drug's hepatic risk against patient's Child-Pugh liver score."""
    results = []
    for drug in medications:
        drug_lower = drug.strip().lower()
        risk = LIVER_RISKY_DRUGS.get(drug_lower)
        if risk and liver_score >= risk["score_threshold"]:
            if liver_score >= 10:
                severity = "CRITICAL"
                status = "CONTRAINDICATED"
                class_label = "Child-Pugh C (Severe)"
            elif liver_score >= 7:
                severity = "HIGH"
                status = "HIGH_RISK"
                class_label = "Child-Pugh B/C"
            else:
                severity = "MODERATE"
                status = "USE_WITH_CAUTION"
                class_label = "Child-Pugh A/B"
            results.append({
                "drug": drug,
                "liver_score": liver_score,
                "liver_class": class_label,
                "status": status,
                "severity": severity,
                "message": risk["risk"],
            })
        else:
            results.append({
                "drug": drug,
                "liver_score": liver_score,
                "status": "SAFE",
                "severity": "NONE",
                "message": f"{drug} is safe at current liver score of {liver_score}." if risk else f"No known hepatotoxicity for {drug}.",
            })
    return results


def compute_final_safety_score(
    interactions_result: dict,
    overdose_results: List[dict],
    allergy_results: List[dict],
    pregnancy_results: List[dict],
    kidney_results: List[dict],
    liver_results: List[dict],
    duplicates: List[dict],
    patient: dict,
) -> dict:
    """Compute aggregate safety score (0–100) from all check results."""
    score = 100.0
    deductions = []

    # ── Allergy — highest priority ─────────────────────────────────────────
    allergy_critical = [r for r in allergy_results if r["status"] == "CONTRAINDICATED"]
    if allergy_critical:
        deduction = min(70, len(allergy_critical) * 35)
        score -= deduction
        deductions.append({"reason": f"{len(allergy_critical)} allergy contraindication(s) detected", "deduction": deduction})

    # ── Pregnancy ─────────────────────────────────────────────────────────
    preg_critical = [r for r in pregnancy_results if r["status"] == "CONTRAINDICATED"]
    if preg_critical:
        deduction = min(60, len(preg_critical) * 30)
        score -= deduction
        deductions.append({"reason": f"{len(preg_critical)} pregnancy contraindication(s)", "deduction": deduction})

    # ── Overdose ──────────────────────────────────────────────────────────
    for od in overdose_results:
        sev = od.get("severity", "NONE")
        if sev == "CRITICAL":
            score -= 30; deductions.append({"reason": f"Overdose (CRITICAL): {od['drug']}", "deduction": 30})
        elif sev == "HIGH":
            score -= 20; deductions.append({"reason": f"Overdose (HIGH): {od['drug']}", "deduction": 20})
        elif sev == "MODERATE":
            score -= 8; deductions.append({"reason": f"Overdose (MODERATE): {od['drug']}", "deduction": 8})

    # ── Drug Interactions ─────────────────────────────────────────────────
    sev_counts = interactions_result.get("severity_counts", {})
    if sev_counts.get("CRITICAL", 0) > 0:
        d = min(55, sev_counts["CRITICAL"] * 28)
        score -= d; deductions.append({"reason": f"{sev_counts['CRITICAL']} CRITICAL interaction(s)", "deduction": d})
    if sev_counts.get("HIGH", 0) > 0:
        d = min(35, sev_counts["HIGH"] * 18)
        score -= d; deductions.append({"reason": f"{sev_counts['HIGH']} HIGH interaction(s)", "deduction": d})
    if sev_counts.get("MODERATE", 0) > 0:
        d = min(15, sev_counts["MODERATE"] * 6)
        score -= d; deductions.append({"reason": f"{sev_counts['MODERATE']} MODERATE interaction(s)", "deduction": d})

    # ── Kidney ────────────────────────────────────────────────────────────
    kidney_critical = [r for r in kidney_results if r["severity"] == "CRITICAL"]
    kidney_high = [r for r in kidney_results if r["severity"] == "HIGH"]
    kidney_mod = [r for r in kidney_results if r["severity"] == "MODERATE"]
    if kidney_critical:
        d = min(25, len(kidney_critical) * 13)
        score -= d; deductions.append({"reason": f"{len(kidney_critical)} kidney contraindication(s)", "deduction": d})
    if kidney_high:
        d = min(15, len(kidney_high) * 8)
        score -= d; deductions.append({"reason": f"{len(kidney_high)} kidney high-risk drug(s)", "deduction": d})
    if kidney_mod:
        score -= min(8, len(kidney_mod) * 4)

    # ── Liver ─────────────────────────────────────────────────────────────
    liver_critical = [r for r in liver_results if r["severity"] == "CRITICAL"]
    liver_high = [r for r in liver_results if r["severity"] == "HIGH"]
    if liver_critical:
        d = min(25, len(liver_critical) * 13)
        score -= d; deductions.append({"reason": f"{len(liver_critical)} liver contraindication(s)", "deduction": d})
    if liver_high:
        d = min(15, len(liver_high) * 8)
        score -= d; deductions.append({"reason": f"{len(liver_high)} liver high-risk drug(s)", "deduction": d})

    # ── Duplicates ────────────────────────────────────────────────────────
    if duplicates:
        d = min(10, len(duplicates) * 5)
        score -= d; deductions.append({"reason": f"{len(duplicates)} therapeutic duplication(s)", "deduction": d})

    # ── Patient risk factors ──────────────────────────────────────────────
    gfr = float(patient.get("kidney_gfr", 90))
    ls = int(patient.get("liver_score", 0))
    age = float(patient.get("age", 45))
    if gfr < 30:
        score -= 5; deductions.append({"reason": "Severe renal impairment (GFR<30)", "deduction": 5})
    if ls >= 7:
        score -= 5; deductions.append({"reason": "Severe hepatic impairment (Child-Pugh C)", "deduction": 5})
    if age >= 75:
        score -= 3; deductions.append({"reason": "Very elderly patient (≥75)", "deduction": 3})

    score = max(0.0, min(100.0, round(score, 1)))

    # ── Severity label ────────────────────────────────────────────────────
    THRESHOLDS = [
        (90, "SAFE",     "#22c55e", "Prescription appears clinically safe with no significant concerns."),
        (75, "LOW",      "#eab308", "Minor considerations noted. Generally safe with standard monitoring."),
        (55, "MODERATE", "#f97316", "Moderate concerns identified. Prescriber review recommended."),
        (30, "HIGH",     "#ef4444", "Significant safety concerns. Clinical review required."),
        (0,  "CRITICAL", "#a855f7", "Critical safety issues. Do not dispense without immediate consultation."),
    ]
    severity = "CRITICAL"; color = "#a855f7"; explanation = "Critical safety issues detected."
    for threshold, sev, col, exp in THRESHOLDS:
        if score >= threshold:
            severity = sev; color = col; explanation = exp
            break

    return {
        "safety_score": score,
        "severity": severity,
        "severity_color": color,
        "clinical_explanation": explanation,
        "score_breakdown": {"starting_score": 100, "deductions": deductions, "final_score": score},
    }


def generate_report_hash(report_data: dict) -> str:
    """SHA-256 hash of the report JSON for blockchain anchoring."""
    report_str = json.dumps(report_data, sort_keys=True, default=str)
    return hashlib.sha256(report_str.encode()).hexdigest()


def run_full_validation(
    file_bytes: bytes,
    mime_type: str,
    patient: dict,
    medications_override: Optional[List[str]] = None,
) -> dict:
    """
    Execute the full 10-step prescription validation pipeline.

    Args:
        file_bytes:            Raw file content (image or PDF)
        mime_type:             MIME type of the file
        patient:               Patient profile dict
        medications_override:  If provided, skip OCR and use this list

    Returns:
        Complete validation result dict
    """
    started_at = datetime.utcnow().isoformat() + "Z"

    # ── Step 1: OCR Extraction ────────────────────────────────────────────
    ocr_result = {}
    if medications_override:
        medications = [m.strip() for m in medications_override if m.strip()]
        structured_medications = [{"drug": m, "dose": None, "frequency": None} for m in medications]
        ocr_result = {
            "ocr_available": False,
            "medications": medications,
            "structured_medications": structured_medications,
            "dosages": [],
            "frequencies": [],
            "ocr_skipped": True,
        }
    else:
        try:
            from cdss.ocr_extractor import extract_from_bytes
            ocr_result = extract_from_bytes(file_bytes, mime_type)
        except Exception as e:
            logger.warning(f"OCR extraction failed: {e}")
            ocr_result = {"ocr_available": False, "medications": [], "structured_medications": [], "error": str(e)}
        medications = ocr_result.get("medications", [])
        structured_medications = ocr_result.get("structured_medications", [])

    # ── Step 2: Disease Detection ─────────────────────────────────────────
    detected_diseases = detect_diseases(medications)

    # ── Step 3: Duplicate Detection ───────────────────────────────────────
    duplicate_medicines = detect_duplicates(medications)

    # ── Step 4: Overdose Check ────────────────────────────────────────────
    overdose_results = []
    try:
        overdose_results = check_overdose(structured_medications, patient)
    except Exception as e:
        logger.warning(f"Overdose check failed: {e}")

    # ── Step 5: Drug Interactions ─────────────────────────────────────────
    interactions_result = {}
    try:
        from cdss.interaction_engine import analyze_all_interactions
        interactions_result = analyze_all_interactions(medications, patient=patient)
    except Exception as e:
        logger.warning(f"Interaction analysis failed: {e}")
        interactions_result = {"conflicts": [], "severity_counts": {}, "combination_analysis": []}

    # ── Step 6: Allergy Check ─────────────────────────────────────────────
    allergies = patient.get("allergies", [])
    allergy_results = check_allergies(medications, allergies) if medications else []

    # ── Step 7: Pregnancy Safety ──────────────────────────────────────────
    pregnant = bool(patient.get("pregnant", False) or patient.get("pregnancy", False))
    pregnancy_results = check_pregnancy_safety(medications, pregnant)

    # ── Step 8: Kidney Safety ─────────────────────────────────────────────
    kidney_gfr = float(patient.get("kidney_gfr", 90))
    kidney_results = check_kidney_safety(medications, kidney_gfr)

    # ── Step 9: Liver Safety ──────────────────────────────────────────────
    liver_score = int(patient.get("liver_score", 0))
    liver_results = check_liver_safety(medications, liver_score)

    # ── Step 10: Safety Score ─────────────────────────────────────────────
    score_result = compute_final_safety_score(
        interactions_result,
        overdose_results,
        allergy_results,
        pregnancy_results,
        kidney_results,
        liver_results,
        duplicate_medicines,
        patient,
    )

    # ── Build combined recommendations ────────────────────────────────────
    recommendations = list(interactions_result.get("emergency_recommendations", []))
    if any(r["status"] == "CONTRAINDICATED" for r in allergy_results):
        recommendations.insert(0, "CRITICAL: Discontinue all drugs matching patient allergy — anaphylaxis risk.")
    if any(r["status"] == "CONTRAINDICATED" for r in pregnancy_results):
        recommendations.insert(0, "CRITICAL: Remove teratogenic drugs immediately — consult obstetric pharmacist.")
    if any(r["severity"] in ("CRITICAL", "HIGH") for r in kidney_results):
        recommendations.append("Adjust all renally-cleared medications based on current GFR value.")
    if any(r["severity"] in ("CRITICAL", "HIGH") for r in liver_results):
        recommendations.append("Reduce doses of hepatically metabolized drugs; monitor LFTs closely.")
    if duplicate_medicines:
        recommendations.append("Review therapeutic duplications — remove redundant agents from the same class.")
    recommendations = list(dict.fromkeys(recommendations))[:10]  # deduplicate, cap at 10

    # ── Assemble final result ─────────────────────────────────────────────
    result = {
        # Metadata
        "validated_at": started_at,
        "patient_profile": {
            "age": patient.get("age"),
            "weight_kg": patient.get("weight_kg"),
            "kidney_gfr": kidney_gfr,
            "liver_score": liver_score,
            "pregnant": pregnant,
            "allergies": allergies,
        },

        # OCR
        "ocr": {
            "available": ocr_result.get("ocr_available", False),
            "medications": medications,
            "structured_medications": structured_medications,
            "dosages": ocr_result.get("dosages", []),
            "frequencies": ocr_result.get("frequencies", []),
            "confidence": ocr_result.get("confidence", 0.0),
            "doctor_name": ocr_result.get("doctor_name"),
            "prescription_date": ocr_result.get("prescription_date"),
            "raw_text": ocr_result.get("raw_text", "")[:3000],
        },

        # Step results
        "detected_diseases": detected_diseases,
        "duplicate_medicines": duplicate_medicines,
        "overdose_alerts": overdose_results,
        "interactions": {
            "conflicts": interactions_result.get("conflicts", []),
            "severity_counts": interactions_result.get("severity_counts", {}),
            "overall_score": interactions_result.get("overall_interaction_score", 0),
            "combination_analysis": interactions_result.get("combination_analysis", []),
            "safe_to_prescribe": interactions_result.get("safe_to_prescribe", True),
            "patient_contraindications": interactions_result.get("patient_contraindications", []),
        },
        "allergy_check": allergy_results,
        "pregnancy_safety": pregnancy_results,
        "kidney_safety": kidney_results,
        "liver_safety": liver_results,

        # Score
        **score_result,
        "recommendations": recommendations,

        # Summary counts for dashboard
        "summary": {
            "total_medications": len(medications),
            "detected_diseases": len(detected_diseases),
            "allergy_flags": sum(1 for r in allergy_results if r["status"] == "CONTRAINDICATED"),
            "pregnancy_flags": sum(1 for r in pregnancy_results if r["status"] == "CONTRAINDICATED"),
            "kidney_flags": sum(1 for r in kidney_results if r["severity"] in ("CRITICAL", "HIGH")),
            "liver_flags": sum(1 for r in liver_results if r["severity"] in ("CRITICAL", "HIGH")),
            "interaction_conflicts": len(interactions_result.get("conflicts", [])),
            "duplicate_classes": len(duplicate_medicines),
            "overdose_alerts": sum(1 for r in overdose_results if r.get("severity") not in ("NONE", None)),
        },
    }

    # ── Generate report hash ──────────────────────────────────────────────
    result["report_hash"] = generate_report_hash(result)

    return result


# ── Blueprint Routes ──────────────────────────────────────────────────────────

@validator_bp.route("/cdss/validate-prescription", methods=["POST"])
def validate_prescription():
    """
    POST /cdss/validate-prescription

    Accepts multipart/form-data OR JSON with base64:
      - file / file_base64 + mime_type: prescription image or PDF
      - patient (JSON): { age, weight_kg, kidney_gfr, liver_score, pregnant, allergies[] }
      - medications (optional): comma-separated override (skips OCR)

    Returns: Full validation result JSON
    """
    try:
        file_bytes = b""
        mime_type = "image/jpeg"
        patient = {}
        medications_override = None

        # ── Multipart form-data ───────────────────────────────────────────
        if request.content_type and "multipart/form-data" in request.content_type:
            if "file" in request.files:
                f = request.files["file"]
                file_bytes = f.read()
                mime_type = f.mimetype or "image/jpeg"

            # Parse patient JSON from form field
            patient_raw = request.form.get("patient", "{}")
            try:
                patient = json.loads(patient_raw) if isinstance(patient_raw, str) else patient_raw
            except Exception:
                patient = {}

            meds_raw = request.form.get("medications", "")
            if meds_raw:
                medications_override = [m.strip() for m in meds_raw.split(",") if m.strip()]

        # ── JSON body ─────────────────────────────────────────────────────
        else:
            data = request.get_json(silent=True) or {}
            file_b64 = data.get("file_base64", "")
            mime_type = data.get("mime_type", "image/jpeg")
            patient = data.get("patient", {})
            meds_raw = data.get("medications", [])
            if meds_raw:
                if isinstance(meds_raw, str):
                    medications_override = [m.strip() for m in meds_raw.split(",") if m.strip()]
                elif isinstance(meds_raw, list):
                    medications_override = [str(m).strip() for m in meds_raw if str(m).strip()]

            if file_b64:
                import base64
                try:
                    file_bytes = base64.b64decode(file_b64)
                except Exception:
                    return jsonify({"error": "Invalid base64 file encoding"}), 400

        if not file_bytes and not medications_override:
            return jsonify({"error": "Either file upload or medications list is required"}), 400

        logger.info(
            f"Prescription validation: {len(file_bytes)} bytes, {mime_type}, "
            f"patient_age={patient.get('age')}, override_meds={bool(medications_override)}"
        )

        result = run_full_validation(file_bytes, mime_type, patient, medications_override)
        return jsonify(result), 200

    except Exception as e:
        logger.error(f"Prescription validation error: {e}", exc_info=True)
        return jsonify({"error": "Prescription validation failed", "details": str(e)}), 500
