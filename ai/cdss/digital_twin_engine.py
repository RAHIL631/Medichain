# ai/cdss/digital_twin_engine.py
# MediChain AI — Digital Twin Patient Simulation Engine
# Simulates medication physiological impacts, organ risks, trajectories, and outcomes.

import numpy as np
import logging
from pathlib import Path
from cdss.disease_predictor import predict_all_diseases

logger = logging.getLogger("cdss.digital_twin")

# ── Medication Simulation Rules ───────────────────────────────────────────────

def simulate_medication_changes(baseline: dict, drug: str, dosage_mg: float) -> dict:
    """
    Simulate physiological updates based on clinical pharmacodynamics.
    """
    simulated = baseline.copy()
    drug_clean = str(drug).strip().lower()
    dosage = float(dosage_mg)

    if not drug_clean or dosage <= 0:
        return simulated

    if "lisinopril" in drug_clean:
        # ACE Inhibitor: Reduces blood pressure, protective for GFR
        sbp_reduction = min(35.0, 15.0 * (dosage / 10.0))
        dbp_reduction = min(20.0, 8.0 * (dosage / 10.0))
        simulated["bloodPressure"] = max(90.0, float(baseline.get("bloodPressure", 120)) - sbp_reduction)
        simulated["diastolic_bp"] = max(60.0, float(baseline.get("diastolic_bp", 80)) - dbp_reduction)
        simulated["kidney_gfr"] = min(120.0, float(baseline.get("kidney_gfr", 90)) + (2.5 * (dosage / 10.0)))
        
    elif "metformin" in drug_clean:
        # Biguanide: Reduces blood glucose, lowers weight
        glucose_reduction = min(80.0, 25.0 * (dosage / 500.0))
        bmi_reduction = min(4.0, 1.2 * (dosage / 500.0))
        simulated["glucose"] = max(70.0, float(baseline.get("glucose", 100)) - glucose_reduction)
        simulated["bmi"] = max(16.0, float(baseline.get("bmi", 24.5)) - bmi_reduction)
        
    elif "atorvastatin" in drug_clean:
        # HMG-CoA Reductase Inhibitor: Lowers cholesterol
        chol_reduction = min(150.0, 50.0 * (dosage / 20.0))
        simulated["cholesterol"] = max(110.0, float(baseline.get("cholesterol", 200)) - chol_reduction)
        
    elif "furosemide" in drug_clean:
        # Loop Diuretic: Reduces fluid, lowers BP, increases creatinine slightly
        sbp_reduction = min(30.0, 12.0 * (dosage / 40.0))
        dbp_reduction = min(18.0, 6.0 * (dosage / 40.0))
        simulated["bloodPressure"] = max(90.0, float(baseline.get("bloodPressure", 120)) - sbp_reduction)
        simulated["diastolic_bp"] = max(60.0, float(baseline.get("diastolic_bp", 80)) - dbp_reduction)
        simulated["creatinine"] = min(8.0, float(baseline.get("creatinine", 1.0)) * (1.0 + 0.08 * (dosage / 40.0)))
        simulated["kidney_gfr"] = max(10.0, float(baseline.get("kidney_gfr", 90)) - (3.0 * (dosage / 40.0)))

    return simulated

# ── Simulation Runner ─────────────────────────────────────────────────────────

def run_twin_simulation(baseline: dict, drug: str = "", dosage_mg: float = 0.0) -> dict:
    """
    Executes baseline risk assessment, applies medication simulation, 
    re-scores risk metrics, and projects 1, 3, 5-year progression pathways.
    """
    # 1. Evaluate baseline risks
    baseline_risks = predict_all_diseases(baseline)
    
    # 2. Simulate medication impact
    simulated_params = simulate_medication_changes(baseline, drug, dosage_mg)
    
    # 3. Evaluate simulated risks
    simulated_risks = predict_all_diseases(simulated_params)

    # 4. Trajectory Projections (1, 3, 5 Years)
    # Project risk trajectories based on age progression and disease dampening
    years = [0, 1, 3, 5]
    baseline_traj = []
    simulated_traj = []

    # Map disease prediction keys between Flask outputs and UI labels
    disease_keys = ["heartDisease", "diabetes", "stroke", "chronic_kidney_disease", "hepatic_disease", "cancer"]

    for yr in years:
        # Baseline Trajectory: Risk increases over time (Aging & progression)
        b_risk = {}
        for dk in disease_keys:
            base_val = baseline_risks.get(dk, 0.1)
            # Progression modifier: +3% risk per year for heart/stroke, +2% for kidney/diabetes
            rate = 0.03 if dk in ["heartDisease", "stroke"] else 0.02
            b_risk[dk] = min(1.0, base_val + (yr * rate))
        baseline_traj.append({"year": f"Yr {yr}", **b_risk})

        # Simulated Trajectory: Active drug dampens progression rate
        s_risk = {}
        for dk in disease_keys:
            sim_val = simulated_risks.get(dk, 0.1)
            # Dampener modifiers based on simulated drug efficacy
            dampener = 1.0
            drug_clean = str(drug).strip().lower()
            if drug_clean:
                if "lisinopril" in drug_clean and dk in ["heartDisease", "stroke", "chronic_kidney_disease"]:
                    dampener = 0.35  # Reduces progression speed by 65%
                elif "metformin" in drug_clean and dk == "diabetes":
                    dampener = 0.25  # Reduces diabetes progression speed by 75%
                elif "atorvastatin" in drug_clean and dk in ["heartDisease", "stroke"]:
                    dampener = 0.40  # Reduces cardio progression speed by 60%
            
            rate = (0.03 if dk in ["heartDisease", "stroke"] else 0.02) * dampener
            s_risk[dk] = min(1.0, sim_val + (yr * rate))
        simulated_traj.append({"year": f"Yr {yr}", **s_risk})

    # 5. Treatment Outcomes
    recovery_prob = 1.0 - max(simulated_risks.get("heartDisease", 0.1), simulated_risks.get("stroke", 0.1))
    
    # Side-effect probabilities
    se_prob = 0.02
    drug_clean = str(drug).strip().lower()
    if "lisinopril" in drug_clean:
        se_prob = 0.08  # Cough risk
    elif "metformin" in drug_clean:
        se_prob = 0.12  # GI upset risk
    elif "atorvastatin" in drug_clean:
        se_prob = 0.06  # Muscle pain risk
    elif "furosemide" in drug_clean:
        se_prob = 0.15  # Electrolyte/dehydration risk

    # Adherence score simulation (higher side effects/complexity = lower adherence)
    adherence_outcome = 1.0 - (se_prob * 0.5) - (0.03 * float(baseline.get("chronic_diseases", 1)))
    
    # Clean output dict keys
    risk_labels = {
        "heartDisease": "Cardiovascular",
        "diabetes": "Endocrine",
        "stroke": "Neurological",
        "chronic_kidney_disease": "Renal",
        "hepatic_disease": "Hepatic",
        "cancer": "Oncology"
    }

    # Format output for React dashboard
    organ_risk_comparison = []
    for dk, label in risk_labels.items():
        organ_risk_comparison.append({
            "organ": label,
            "baseline": round(baseline_risks.get(dk, 0.1) * 100, 1),
            "simulated": round(simulated_risks.get(dk, 0.1) * 100, 1)
        })

    return {
        "baseline_params": baseline,
        "simulated_params": simulated_params,
        "organ_risk_comparison": organ_risk_comparison,
        "trajectories": {
            "baseline": [{k: (round(v * 100, 1) if k != "year" else v) for k, v in t.items()} for t in baseline_traj],
            "simulated": [{k: (round(v * 100, 1) if k != "year" else v) for k, v in t.items()} for t in simulated_traj]
        },
        "treatment_outcomes": {
            "recovery_probability": round(recovery_prob * 100, 1),
            "side_effect_probability": round(se_prob * 100, 1),
            "predicted_adherence": round(adherence_outcome * 100, 1)
        },
        "active_simulated_drug": drug if dosage_mg > 0 else "None",
        "active_simulated_dosage": dosage_mg
    }
