# ai/cdss/health_assistant.py
# AI Health Assistant — Phase 9
# Rule-based contextual health assistant that explains medical information
# in plain English. No external API required.
#
# Endpoints:
#   POST /cdss/assistant/explain-report
#   POST /cdss/assistant/explain-disease
#   POST /cdss/assistant/explain-term
#   POST /cdss/assistant/explain-drug
#   POST /cdss/assistant/summarize
#   POST /cdss/assistant/explain-prediction

from flask import Blueprint, request, jsonify
import logging
import re
from datetime import datetime

logger = logging.getLogger("cdss.assistant")

assistant_bp = Blueprint("health_assistant", __name__)

# ─────────────────────────────────────────────────────────────────────────────
# MEDICAL KNOWLEDGE BASE
# ─────────────────────────────────────────────────────────────────────────────

DISEASE_EXPLANATIONS = {
    "heart disease": {
        "what": "Heart disease refers to a range of conditions that affect your heart's structure and function, including coronary artery disease (narrowing of arteries), heart failure, arrhythmias (irregular heartbeat), and valvular disease.",
        "causes": "Common causes include high cholesterol, high blood pressure, smoking, diabetes, obesity, sedentary lifestyle, and family history.",
        "symptoms": "Chest pain or pressure, shortness of breath, fatigue, swelling in legs (edema), palpitations, dizziness.",
        "management": "Medications (statins, beta-blockers, ACE inhibitors), lifestyle changes (diet, exercise, quit smoking), and sometimes procedures (angioplasty, bypass surgery).",
        "prevention": "Regular exercise, heart-healthy diet, no smoking, blood pressure control, cholesterol management.",
        "whenToSeek": "Seek IMMEDIATE emergency care if you experience chest pain, especially with shortness of breath, sweating, or arm/jaw pain.",
    },
    "diabetes": {
        "what": "Diabetes mellitus is a metabolic disease where the body cannot properly regulate blood sugar (glucose). Type 1 is autoimmune; Type 2 is lifestyle-related and most common.",
        "causes": "Type 2: insulin resistance from obesity, inactivity, poor diet. Type 1: autoimmune destruction of insulin-producing cells.",
        "symptoms": "Frequent urination, excessive thirst, fatigue, blurred vision, slow-healing wounds, frequent infections.",
        "management": "Blood sugar monitoring, medications (metformin, insulin, GLP-1 agonists), diet modification, regular exercise.",
        "prevention": "Type 2 can often be prevented or delayed with weight loss, regular exercise, and healthy diet.",
        "whenToSeek": "Seek urgent care if blood sugar is > 300 mg/dL with symptoms, or if you feel confused, extremely weak, or have fruity breath (diabetic ketoacidosis).",
    },
    "hypertension": {
        "what": "Hypertension (high blood pressure) means the force of blood against artery walls is consistently too high. Normal is < 120/80 mmHg; hypertension is ≥ 130/80 mmHg.",
        "causes": "Primary hypertension has no single cause; risk factors include age, obesity, salt intake, stress, family history, and lack of exercise. Secondary hypertension is due to kidney disease, thyroid problems, or certain medications.",
        "symptoms": "Often called the 'silent killer' because it usually has no symptoms. Severe cases may cause headache, dizziness, nose bleeds, or vision changes.",
        "management": "DASH diet (low sodium, high potassium), regular aerobic exercise, medications (ACE inhibitors, ARBs, calcium channel blockers, diuretics, beta-blockers).",
        "prevention": "Reduce sodium intake, maintain healthy weight, exercise regularly, limit alcohol, manage stress.",
        "whenToSeek": "Seek emergency care if BP is > 180/120 mmHg with symptoms like chest pain, vision changes, or severe headache (hypertensive crisis).",
    },
    "kidney disease": {
        "what": "Chronic Kidney Disease (CKD) is the gradual loss of kidney function. Kidneys filter waste and excess fluids from blood. CKD is staged 1–5 based on eGFR (kidney filtration rate).",
        "causes": "Diabetes and hypertension are the leading causes. Others include glomerulonephritis, polycystic kidney disease, and prolonged NSAID use.",
        "symptoms": "Often asymptomatic until advanced stages. Later: swelling (edema), fatigue, decreased urine output, nausea, itching, shortness of breath.",
        "management": "Blood pressure control, blood sugar control, low-protein diet, avoiding nephrotoxic drugs, dialysis (advanced stages), kidney transplant.",
        "prevention": "Manage diabetes and blood pressure, stay hydrated, avoid unnecessary NSAID/painkiller use, regular kidney function tests.",
        "whenToSeek": "See your nephrologist if creatinine is rising or if you have unexplained swelling, decreased urination, or extreme fatigue.",
    },
    "stroke": {
        "what": "A stroke occurs when blood supply to part of the brain is cut off (ischemic stroke — 87% of cases) or when a blood vessel in the brain bursts (hemorrhagic stroke). Brain cells die within minutes without oxygen.",
        "causes": "High blood pressure, atrial fibrillation, high cholesterol, diabetes, smoking, obesity, and prior stroke/TIA.",
        "symptoms": "FAST: Face drooping, Arm weakness, Speech difficulty, Time to call emergency. Also: sudden severe headache, vision problems, dizziness.",
        "management": "Ischemic: tPA (clot-buster) within 4.5 hours, mechanical thrombectomy. Hemorrhagic: surgical intervention. Rehabilitation is essential post-stroke.",
        "prevention": "Control blood pressure, treat atrial fibrillation, quit smoking, manage cholesterol and diabetes.",
        "whenToSeek": "⚠️ STROKE IS A MEDICAL EMERGENCY. Call 112/108 IMMEDIATELY. Every minute counts — 'Time is Brain'.",
    },
    "liver disease": {
        "what": "Liver disease includes conditions like hepatitis (inflammation), cirrhosis (scarring), fatty liver (NAFLD/NASH), and liver cancer. The liver performs 500+ vital functions.",
        "causes": "Alcohol, viral hepatitis (B and C), non-alcoholic fatty liver disease (from obesity/diabetes), autoimmune conditions.",
        "symptoms": "Jaundice (yellow skin/eyes), abdominal pain, fatigue, swollen abdomen (ascites), spider veins, easy bruising.",
        "management": "Alcohol cessation, antiviral therapy for hepatitis, weight loss for NAFLD, medications, liver transplant for end-stage disease.",
        "prevention": "Limit alcohol, hepatitis B vaccination, safe sex practices, healthy weight, avoid hepatotoxic medications.",
        "whenToSeek": "Seek urgent care for sudden yellowing of eyes/skin, severe abdominal pain, confusion (hepatic encephalopathy), or vomiting blood.",
    },
}

LAB_TEST_EXPLANATIONS = {
    "hba1c": {
        "full_name": "Glycated Hemoglobin (HbA1c)",
        "what": "HbA1c measures your average blood sugar level over the past 2–3 months. It reflects the percentage of hemoglobin that has glucose attached to it.",
        "normal": "Normal: < 5.7% | Prediabetes: 5.7–6.4% | Diabetes: ≥ 6.5%",
        "high_means": "High HbA1c means blood sugar has been consistently elevated, increasing risk of diabetes complications (neuropathy, retinopathy, nephropathy).",
        "how_to_improve": "Regular exercise, dietary changes (reduce carbohydrates, sugar), medication adherence, and weight loss can lower HbA1c.",
    },
    "creatinine": {
        "full_name": "Serum Creatinine",
        "what": "Creatinine is a waste product from muscle metabolism, filtered by kidneys. Elevated creatinine suggests reduced kidney function.",
        "normal": "Men: 0.7–1.2 mg/dL | Women: 0.5–1.0 mg/dL",
        "high_means": "High creatinine = kidneys not filtering efficiently. Can indicate acute kidney injury or chronic kidney disease.",
        "how_to_improve": "Stay hydrated, control blood pressure and blood sugar, avoid NSAIDs, follow a low-protein diet if advised.",
    },
    "cholesterol": {
        "full_name": "Total Cholesterol / Lipid Panel",
        "what": "Cholesterol is a fatty substance essential for cells, but too much increases heart disease risk. LDL ('bad') builds plaque; HDL ('good') removes it.",
        "normal": "Total: < 200 mg/dL | LDL: < 100 mg/dL (< 70 for high-risk) | HDL: > 40 men, > 50 women | Triglycerides: < 150 mg/dL",
        "high_means": "High LDL/total cholesterol increases risk of atherosclerosis, heart attack, and stroke.",
        "how_to_improve": "Diet changes (reduce saturated fat, increase fiber), exercise, statins as prescribed.",
    },
    "egfr": {
        "full_name": "Estimated Glomerular Filtration Rate (eGFR)",
        "what": "eGFR estimates how well kidneys filter waste per minute. It's used to stage Chronic Kidney Disease (CKD).",
        "normal": "Normal: ≥ 90 mL/min/1.73m² | CKD Stage 1: ≥ 90 (with kidney damage) | Stage 2: 60–89 | Stage 3: 30–59 | Stage 4: 15–29 | Stage 5 (Failure): < 15",
        "high_means": "Low eGFR = reduced kidney function. Not 'high' — lower is worse.",
        "how_to_improve": "Control diabetes and blood pressure, stay hydrated, avoid nephrotoxic drugs, follow nephrologist advice.",
    },
    "troponin": {
        "full_name": "Cardiac Troponin (I or T)",
        "what": "Troponin is a protein released by damaged heart muscle cells. It is the most specific blood test for detecting heart attack.",
        "normal": "Normal: < 0.04 ng/mL (varies by assay) | High-sensitivity troponin: < 14 ng/L",
        "high_means": "Elevated troponin almost always indicates heart muscle damage — often a heart attack. Requires IMMEDIATE medical evaluation.",
        "how_to_improve": "Seek emergency care immediately if troponin is elevated. Not a lifestyle issue.",
    },
    "glucose": {
        "full_name": "Blood Glucose (Fasting)",
        "what": "Blood glucose measures the amount of sugar in your blood. Fasting glucose should be checked after at least 8 hours without eating.",
        "normal": "Fasting: 70–99 mg/dL | Prediabetes: 100–125 mg/dL | Diabetes: ≥ 126 mg/dL",
        "high_means": "Elevated fasting glucose suggests prediabetes or diabetes. Very high glucose (> 300) can cause diabetic emergencies.",
        "how_to_improve": "Reduce sugar and refined carbohydrate intake, exercise, lose weight, take diabetes medications as prescribed.",
    },
    "alt": {
        "full_name": "Alanine Aminotransferase (ALT)",
        "what": "ALT is an enzyme primarily found in the liver. When liver cells are damaged, ALT is released into the bloodstream.",
        "normal": "Men: 7–56 U/L | Women: 7–45 U/L",
        "high_means": "High ALT suggests liver inflammation or damage from hepatitis, fatty liver, alcohol, or medications.",
        "how_to_improve": "Reduce alcohol, lose weight, treat underlying hepatitis, review medications with your doctor.",
    },
}

MEDICAL_TERMS = {
    "ischemic": "Relating to insufficient blood supply to an organ. Example: ischemic heart disease (reduced blood flow to heart), ischemic stroke (blocked brain artery).",
    "edema": "Abnormal accumulation of fluid in tissues, causing swelling. Commonly affects ankles, feet, and legs. Can be caused by heart failure, kidney disease, or liver disease.",
    "arrhythmia": "An irregular heartbeat — the heart may beat too fast (tachycardia), too slow (bradycardia), or with an irregular rhythm. Atrial fibrillation is the most common arrhythmia.",
    "systolic": "The top number in a blood pressure reading (e.g., 120 in 120/80). It measures pressure when the heart beats and pumps blood.",
    "diastolic": "The bottom number in blood pressure (e.g., 80 in 120/80). It measures pressure between heartbeats when the heart relaxes.",
    "cholesterol": "A waxy, fat-like substance made by your liver and found in foods. Needed for cell membranes and hormones, but excess (especially LDL) builds up in arteries.",
    "bmi": "Body Mass Index — a measure of body fat based on height and weight. BMI < 18.5: underweight | 18.5–24.9: normal | 25–29.9: overweight | ≥ 30: obese.",
    "comorbidity": "The presence of one or more additional diseases alongside a primary disease. Example: a patient with diabetes and hypertension has two comorbidities.",
    "tachycardia": "A heart rate above 100 beats per minute. Can be normal (during exercise) or abnormal (at rest, indicating a heart problem).",
    "bradycardia": "A resting heart rate below 60 beats per minute. Can be normal in athletes or a sign of a heart condition.",
    "atherosclerosis": "The buildup of fatty plaques (cholesterol, calcium) inside artery walls. Narrows arteries, restricts blood flow, and can cause heart attack or stroke.",
    "nephropathy": "Disease of the kidneys. Diabetic nephropathy is kidney damage caused by long-term diabetes.",
    "neuropathy": "Damage to nerves. Diabetic peripheral neuropathy causes numbness, tingling, or pain in hands and feet.",
    "retinopathy": "Damage to the retina (back of the eye). Diabetic retinopathy is a leading cause of blindness in people with diabetes.",
    "ecg": "Electrocardiogram — a test that measures the electrical activity of the heart to detect arrhythmias, heart attacks, and other cardiac conditions.",
    "mri": "Magnetic Resonance Imaging — uses magnetic fields and radio waves to create detailed images of organs and tissues. No radiation.",
    "ct scan": "Computed Tomography scan — uses X-rays and computers to create cross-sectional images of the body. Provides detailed structural information.",
    "dialysis": "A medical treatment that artificially filters waste and excess fluids from blood when kidneys fail to do so. Can be hemodialysis (machine) or peritoneal dialysis (abdominal cavity).",
    "shap": "SHapley Additive exPlanations — a mathematical technique used in AI to explain which factors contributed most to a prediction. Shows each feature's impact as a positive or negative value.",
    "confidence interval": "A range of values that estimates a population parameter with a certain level of certainty (e.g., 95%). A 95% CI means there's a 95% probability the true value falls within that range.",
    "sepsis": "A life-threatening condition where the body's response to an infection becomes dysregulated, causing organ damage. Symptoms include fever/chills, rapid heart rate, confusion, difficulty breathing.",
    "anemia": "A condition where you don't have enough healthy red blood cells to carry adequate oxygen to tissues. Causes fatigue, weakness, pale skin, shortness of breath.",
    "hypokalemia": "Abnormally low potassium in the blood (< 3.5 mEq/L). Can cause muscle weakness, cramps, and heart rhythm problems. Common with diuretic use.",
    "hyperkalemia": "Abnormally high potassium (> 5.0 mEq/L). Can cause dangerous heart rhythm disturbances. Risk with ACE inhibitors, ARBs, or kidney disease.",
}

DRUG_EXPLANATIONS = {
    "metformin": {
        "class": "Biguanide — first-line Type 2 diabetes medication",
        "how_it_works": "Decreases glucose production in the liver and improves insulin sensitivity in muscles.",
        "common_uses": "Type 2 diabetes management. Also used for prediabetes and PCOS.",
        "key_side_effects": "GI upset (nausea, diarrhea) — usually improves with food. Rare: lactic acidosis (risk in kidney failure).",
        "important_notes": "Avoid in severe kidney disease (eGFR < 30). Hold before contrast dye procedures. Does not cause hypoglycemia alone.",
    },
    "lisinopril": {
        "class": "ACE Inhibitor (Angiotensin-Converting Enzyme Inhibitor)",
        "how_it_works": "Blocks the enzyme that converts angiotensin I to angiotensin II, reducing blood vessel constriction and lowering blood pressure.",
        "common_uses": "Hypertension, heart failure, diabetic kidney disease, post-heart attack.",
        "key_side_effects": "Dry cough (common — 10–15%), dizziness, elevated potassium, rarely angioedema (swelling of face/throat — seek emergency care).",
        "important_notes": "AVOID in pregnancy. Monitor kidney function and potassium. Avoid with potassium supplements unless directed.",
    },
    "atorvastatin": {
        "class": "Statin (HMG-CoA Reductase Inhibitor)",
        "how_it_works": "Blocks an enzyme (HMG-CoA reductase) that the liver uses to produce cholesterol, reducing LDL levels.",
        "common_uses": "High cholesterol, cardiovascular risk reduction, prevention of heart attack and stroke.",
        "key_side_effects": "Muscle pain/weakness (myalgia) — report to doctor. Rare: myopathy or rhabdomyolysis (muscle breakdown). Liver enzyme elevation.",
        "important_notes": "Take at night (liver makes most cholesterol overnight). Avoid grapefruit juice (inhibits metabolism). AVOID in pregnancy.",
    },
    "aspirin": {
        "class": "Antiplatelet / NSAID",
        "how_it_works": "Irreversibly inhibits COX enzymes, reducing thromboxane A2 (a platelet activator), thus preventing blood clots.",
        "common_uses": "Heart attack and stroke prevention, pain relief, fever reduction.",
        "key_side_effects": "GI bleeding/ulcer risk, gastric irritation. Take with food. Avoid in peptic ulcer disease.",
        "important_notes": "Do not give to children with viral illness (Reye's syndrome risk). Avoid before surgery. Low-dose (81mg) for cardiac prevention.",
    },
    "warfarin": {
        "class": "Anticoagulant (Vitamin K Antagonist)",
        "how_it_works": "Blocks vitamin K-dependent clotting factors (II, VII, IX, X), reducing blood's ability to clot.",
        "common_uses": "Atrial fibrillation, DVT/PE treatment and prevention, mechanical heart valves.",
        "key_side_effects": "Bleeding (major concern), bruising, skin necrosis (rare).",
        "important_notes": "Requires regular INR monitoring. Many drug and food interactions (especially vitamin K foods like leafy greens). AVOID in pregnancy.",
    },
    "insulin": {
        "class": "Hormone — Antidiabetic",
        "how_it_works": "Allows cells to take up glucose from blood, lowering blood sugar. Replaces or supplements natural insulin production.",
        "common_uses": "Type 1 diabetes (essential), Type 2 diabetes (when oral medications insufficient), diabetic ketoacidosis.",
        "key_side_effects": "Hypoglycemia (low blood sugar — symptoms: shakiness, sweating, confusion), weight gain, injection site reactions.",
        "important_notes": "Never skip doses without physician guidance. Carry fast-acting glucose source. Store in refrigerator (do not freeze). Rotate injection sites.",
    },
}


# ─────────────────────────────────────────────────────────────────────────────
# ROUTES
# ─────────────────────────────────────────────────────────────────────────────

@assistant_bp.route("/cdss/assistant/explain-disease", methods=["POST"])
def explain_disease():
    """Explain a disease in plain English."""
    data     = request.get_json(silent=True) or {}
    disease  = str(data.get("disease", "")).strip().lower()

    if not disease:
        return jsonify({"error": "disease name is required"}), 400

    # Fuzzy match
    matched_key = None
    for key in DISEASE_EXPLANATIONS:
        if key in disease or disease in key:
            matched_key = key
            break

    if not matched_key:
        return jsonify({
            "disease":     disease,
            "found":       False,
            "message":     f"Detailed information for '{disease}' is not in the current knowledge base.",
            "suggestion":  "Please consult a medical professional or reputable source like Mayo Clinic or WebMD for information about this condition.",
            "disclaimer":  "Always consult a qualified physician for medical advice.",
        }), 200

    info = DISEASE_EXPLANATIONS[matched_key]
    return jsonify({
        "disease":      matched_key.title(),
        "found":        True,
        "explanation":  info,
        "disclaimer":   "This information is for educational purposes only. It does not constitute medical advice. Always consult a qualified physician.",
        "learnMore":    f"Visit https://medlineplus.gov/ency/article/ for detailed medical information.",
    }), 200


@assistant_bp.route("/cdss/assistant/explain-term", methods=["POST"])
def explain_term():
    """Explain a medical term in plain English."""
    data = request.get_json(silent=True) or {}
    term = str(data.get("term", "")).strip().lower()

    if not term:
        return jsonify({"error": "term is required"}), 400

    # Exact match
    if term in MEDICAL_TERMS:
        return jsonify({
            "term":        term,
            "found":       True,
            "explanation": MEDICAL_TERMS[term],
            "disclaimer":  "For clinical decisions, always rely on qualified medical professionals.",
        }), 200

    # Partial match
    for key, val in MEDICAL_TERMS.items():
        if term in key or key in term:
            return jsonify({
                "term":        key,
                "searchedFor": term,
                "found":       True,
                "explanation": val,
                "disclaimer":  "For clinical decisions, always rely on qualified medical professionals.",
            }), 200

    return jsonify({
        "term":        term,
        "found":       False,
        "message":     f"The term '{term}' is not in the current knowledge base.",
        "suggestion":  "Try searching on MedlinePlus (https://medlineplus.gov) for detailed medical terminology.",
    }), 200


@assistant_bp.route("/cdss/assistant/explain-drug", methods=["POST"])
def explain_drug():
    """Explain a medication in plain English."""
    data = request.get_json(silent=True) or {}
    drug = str(data.get("drug", "")).strip().lower()

    if not drug:
        return jsonify({"error": "drug name is required"}), 400

    if drug in DRUG_EXPLANATIONS:
        info = DRUG_EXPLANATIONS[drug]
        return jsonify({
            "drug":        drug.title(),
            "found":       True,
            "information": info,
            "disclaimer":  "This information is for educational purposes only. NEVER change your medication without consulting your doctor or pharmacist.",
        }), 200

    # Partial match
    for key, val in DRUG_EXPLANATIONS.items():
        if drug in key or key in drug:
            return jsonify({
                "drug":        key.title(),
                "searchedFor": drug,
                "found":       True,
                "information": val,
                "disclaimer":  "This information is for educational purposes only. NEVER change your medication without consulting your doctor or pharmacist.",
            }), 200

    return jsonify({
        "drug":    drug,
        "found":   False,
        "message": f"Detailed information for '{drug}' is not in the current database.",
        "suggestion": "Consult your pharmacist for medication-specific information. Visit drugs.com or medlineplus.gov for online references.",
        "disclaimer": "Never adjust medication without physician/pharmacist guidance.",
    }), 200


@assistant_bp.route("/cdss/assistant/explain-lab", methods=["POST"])
def explain_lab():
    """Explain a lab test result in plain English."""
    data     = request.get_json(silent=True) or {}
    test     = str(data.get("test", "")).strip().lower()
    value    = data.get("value")
    unit     = str(data.get("unit", "")).strip()

    if not test:
        return jsonify({"error": "test name is required"}), 400

    # Match test
    matched_key = None
    for key in LAB_TEST_EXPLANATIONS:
        if key in test or test in key:
            matched_key = key
            break

    if not matched_key:
        return jsonify({
            "test":    test,
            "found":   False,
            "message": f"Lab test '{test}' is not in the current knowledge base.",
            "suggestion": "Ask your doctor or the lab for an interpretation of this result.",
        }), 200

    info = LAB_TEST_EXPLANATIONS[matched_key]
    response = {
        "test":        info["full_name"],
        "found":       True,
        "information": info,
        "disclaimer":  "Lab result interpretation depends on context, patient history, and other factors. Always discuss results with your physician.",
    }

    # Add value interpretation if provided
    if value is not None:
        response["yourValue"] = f"{value} {unit}".strip()
        response["interpretation"] = _interpret_lab_value(matched_key, float(value))

    return jsonify(response), 200


def _interpret_lab_value(test_key, value):
    interpretations = {
        "hba1c": (
            "⚠️ Diabetic range — requires physician management" if value >= 6.5
            else "⚠️ Prediabetic range — lifestyle modification recommended" if value >= 5.7
            else "✅ Normal range"
        ),
        "creatinine": (
            "⚠️ Significantly elevated — consult nephrologist" if value > 2.0
            else "⚠️ Mildly elevated — monitor kidney function" if value > 1.2
            else "✅ Normal range"
        ),
        "glucose": (
            "⚠️ Diabetic range" if value >= 126
            else "⚠️ Prediabetic range" if value >= 100
            else "✅ Normal range" if value >= 70
            else "⚠️ Low blood sugar — consult physician"
        ),
        "cholesterol": (
            "⚠️ High — discuss statin therapy with your doctor" if value >= 240
            else "⚠️ Borderline high" if value >= 200
            else "✅ Desirable"
        ),
    }
    return interpretations.get(test_key, "Please discuss this value with your physician for proper interpretation.")


@assistant_bp.route("/cdss/assistant/explain-prediction", methods=["POST"])
def explain_prediction():
    """Explain an AI disease prediction in plain English."""
    data       = request.get_json(silent=True) or {}
    disease    = str(data.get("disease", "")).strip()
    probability = float(data.get("probability", 0))
    risk_level  = str(data.get("riskLevel", "")).upper()
    top_factors = data.get("topFactors", [])

    if not disease:
        return jsonify({"error": "disease and probability are required"}), 400

    level_descriptions = {
        "VERY HIGH": "significantly elevated",
        "HIGH":      "elevated",
        "MODERATE":  "moderate",
        "LOW":       "low",
        "MINIMAL":   "minimal",
    }
    level_desc = level_descriptions.get(risk_level, "uncertain")

    explanation = (
        f"The AI model assessed your {disease} risk as {risk_level} "
        f"({probability:.1f}% probability). This means your risk is {level_desc} "
        f"based on the health parameters you provided."
    )

    factor_explanations = []
    for f in top_factors[:3]:
        name   = f.get("name", "")
        impact = f.get("impact", 0)
        direc  = f.get("direction", "increases")
        factor_explanations.append(
            f"{name} contributes {impact:.1f}% — this {direc} your overall risk."
        )

    recommendations = _get_risk_recommendations(disease.lower(), risk_level)

    return jsonify({
        "disease":       disease,
        "probability":   probability,
        "riskLevel":     risk_level,
        "plainLanguage": explanation,
        "factorExplanations": factor_explanations,
        "whatThisMeans": _risk_level_meaning(risk_level),
        "recommendations": recommendations,
        "disclaimer":    "AI predictions are for informational purposes only. They are not medical diagnoses. Please consult a qualified physician for clinical evaluation.",
    }), 200


def _risk_level_meaning(risk_level):
    meanings = {
        "VERY HIGH": "Your risk is in the highest category. This does not mean you definitely have this condition, but it strongly suggests consulting a specialist promptly for evaluation.",
        "HIGH":      "Your risk is elevated. This warrants a discussion with your doctor and possibly specialist referral.",
        "MODERATE":  "Your risk is above average. Consider lifestyle modifications and regular monitoring with your doctor.",
        "LOW":       "Your risk is below average. Continue healthy habits and maintain regular check-ups.",
        "MINIMAL":   "Your risk is very low based on the provided data. Maintain your current healthy practices.",
    }
    return meanings.get(risk_level, "Please consult a physician for interpretation of this risk assessment.")


def _get_risk_recommendations(disease, risk_level):
    if risk_level in ("VERY HIGH", "HIGH"):
        return [
            f"Consult a specialist ({_specialist_for(disease)}) promptly",
            "Do not delay medical evaluation — early intervention improves outcomes",
            "Discuss risk reduction strategies with your physician",
            "Review and optimize current medications with your doctor",
        ]
    elif risk_level == "MODERATE":
        return [
            "Discuss results with your primary care physician",
            "Review lifestyle factors: diet, exercise, smoking, alcohol",
            "Schedule regular monitoring as advised",
        ]
    else:
        return [
            "Continue healthy lifestyle practices",
            "Maintain regular annual health check-ups",
            "Monitor for any new symptoms",
        ]


def _specialist_for(disease):
    specialists = {
        "heart disease": "Cardiologist",
        "diabetes":      "Endocrinologist",
        "kidney disease": "Nephrologist",
        "stroke":        "Neurologist",
        "liver disease": "Hepatologist",
        "cancer":        "Oncologist",
        "hypertension":  "Cardiologist or General Physician",
    }
    return next((v for k, v in specialists.items() if k in disease), "Specialist")


@assistant_bp.route("/cdss/assistant/summarize", methods=["POST"])
def summarize_history():
    """Generate a plain-English patient health summary."""
    data = request.get_json(silent=True) or {}

    age             = int(data.get("age", 0))
    gender          = str(data.get("gender", "")).strip()
    conditions      = data.get("conditions", [])
    medications     = data.get("medications", [])
    allergies       = data.get("allergies", [])
    recent_records  = data.get("recentRecords", [])
    ai_risks        = data.get("aiRisks", [])

    lines = []

    if age and gender:
        lines.append(f"Patient: {gender}, {age} years old.")

    if conditions:
        lines.append(f"Known medical conditions: {', '.join(conditions)}.")
    else:
        lines.append("No known chronic medical conditions reported.")

    if medications:
        lines.append(f"Current medications: {', '.join(medications[:5])}.")
    else:
        lines.append("No current medications reported.")

    if allergies:
        lines.append(f"⚠️ Allergies: {', '.join(allergies)}.")

    if recent_records:
        count = len(recent_records)
        lines.append(f"Medical records: {count} record(s) on file.")

    if ai_risks:
        high_risks = [r for r in ai_risks if r.get("riskLevel") in ("VERY HIGH", "HIGH")]
        if high_risks:
            lines.append(
                f"AI Risk Assessment identifies elevated risk for: "
                f"{', '.join(r['disease'] for r in high_risks[:3])}."
            )
        else:
            lines.append("AI Risk Assessment shows moderate or low risk across monitored conditions.")

    summary_text = " ".join(lines)

    return jsonify({
        "summary":   summary_text,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "sections": {
            "demographics":  f"{'Male' if gender.upper() == 'M' else 'Female'}, {age} years old" if age else "Age not provided",
            "conditions":    conditions or ["None reported"],
            "medications":   medications or ["None reported"],
            "allergies":     allergies or ["None reported"],
            "aiRisks":       ai_risks or [],
        },
        "disclaimer": "This summary is AI-generated for informational purposes. It is not a substitute for professional medical evaluation.",
    }), 200
