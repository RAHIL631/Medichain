# ai/scripts/train_dosage_safety.py
# MediChain AI — Dosage Safety Prediction Engine Training Script
#
# Trains an ensemble of ML models (Random Forest, Gradient Boosting, XGBoost)
# to predict dosage safety outcomes including:
#   - max_safe_dose, current_dose_ratio, daily_dose, weekly_dose
#   - toxic_dose_ratio, accumulation_risk, risk_level
#   - drug_toxicity_class, emergency_flag
#
# Features:
#   - Clinically-realistic synthetic dataset generation
#   - 3-model ensemble: RandomForest + GradientBoosting + XGBoost
#   - Standard scaler for all features
#   - Saves all models and scaler to ai/models/ as .pkl files
#   - Updates version_manifest.json
#
# Usage (run from ai/ directory):
#   python scripts/train_dosage_safety.py
#   python scripts/train_dosage_safety.py --samples 5000
#   python scripts/train_dosage_safety.py --model-dir ./models

import sys
import argparse
import logging
import json
from pathlib import Path
from datetime import datetime, timezone

import numpy as np
import pandas as pd
import joblib

# Ensure ai/ is importable
_AI_DIR = Path(__file__).parent.parent
if str(_AI_DIR) not in sys.path:
    sys.path.insert(0, str(_AI_DIR))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("medichain.train.dosage")

from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.metrics import (
    classification_report, roc_auc_score, f1_score, accuracy_score
)

try:
    from xgboost import XGBClassifier
    XGBOOST_AVAILABLE = True
except ImportError:
    XGBOOST_AVAILABLE = False
    logger.warning("XGBoost not installed — will train RF and GB only")

RNG = np.random.default_rng(42)

# ── Drug Reference Database (subset for synthetic generation) ─────────────────
DRUG_PROFILES = {
    "metformin":      {"max_single": 1000, "daily_max": 2550, "renal_risk": True,  "hepatic_risk": False, "narrow_index": False, "opioid": False},
    "aspirin":        {"max_single": 1000, "daily_max": 4000, "renal_risk": True,  "hepatic_risk": True,  "narrow_index": False, "opioid": False},
    "warfarin":       {"max_single": 10,   "daily_max": 10,   "renal_risk": True,  "hepatic_risk": True,  "narrow_index": True,  "opioid": False},
    "ibuprofen":      {"max_single": 800,  "daily_max": 3200, "renal_risk": True,  "hepatic_risk": True,  "narrow_index": False, "opioid": False},
    "acetaminophen":  {"max_single": 1000, "daily_max": 3000, "renal_risk": False, "hepatic_risk": True,  "narrow_index": False, "opioid": False},
    "morphine":       {"max_single": 30,   "daily_max": 120,  "renal_risk": True,  "hepatic_risk": True,  "narrow_index": True,  "opioid": True},
    "lisinopril":     {"max_single": 40,   "daily_max": 40,   "renal_risk": True,  "hepatic_risk": False, "narrow_index": False, "opioid": False},
    "amoxicillin":    {"max_single": 1000, "daily_max": 3000, "renal_risk": True,  "hepatic_risk": False, "narrow_index": False, "opioid": False},
    "atorvastatin":   {"max_single": 80,   "daily_max": 80,   "renal_risk": False, "hepatic_risk": True,  "narrow_index": False, "opioid": False},
    "amlodipine":     {"max_single": 10,   "daily_max": 10,   "renal_risk": False, "hepatic_risk": True,  "narrow_index": False, "opioid": False},
    "furosemide":     {"max_single": 80,   "daily_max": 600,  "renal_risk": True,  "hepatic_risk": True,  "narrow_index": False, "opioid": False},
    "metoprolol":     {"max_single": 200,  "daily_max": 400,  "renal_risk": False, "hepatic_risk": True,  "narrow_index": False, "opioid": False},
    "omeprazole":     {"max_single": 40,   "daily_max": 80,   "renal_risk": False, "hepatic_risk": True,  "narrow_index": False, "opioid": False},
    "insulin":        {"max_single": 100,  "daily_max": 300,  "renal_risk": True,  "hepatic_risk": True,  "narrow_index": True,  "opioid": False},
    "paracetamol":    {"max_single": 1000, "daily_max": 3000, "renal_risk": False, "hepatic_risk": True,  "narrow_index": False, "opioid": False},
}

DRUG_NAMES  = list(DRUG_PROFILES.keys())
FREQ_VALUES = {"once_daily": 1, "twice_daily": 2, "tds": 3, "qds": 4, "weekly": 0.14}

# Risk level labels (multiclass)
RISK_LEVELS = ["SAFE", "LOW", "MODERATE", "HIGH", "CRITICAL"]


# ── Synthetic Dataset Generator ───────────────────────────────────────────────

def generate_dosage_safety_dataset(n: int = 3000) -> pd.DataFrame:
    """
    Generate a clinically-realistic synthetic dataset for dosage safety ML.

    Each row represents a patient-drug-dose scenario.
    Target: risk_level (0=SAFE, 1=LOW, 2=MODERATE, 3=HIGH, 4=CRITICAL)
    Binary targets: is_toxic (bool), emergency_flag (bool)
    """
    logger.info(f"Generating {n} synthetic patient-drug records...")
    rows = []

    for _ in range(n):
        # ── Patient Demographics ──────────────────────────────────────────────
        age         = int(RNG.integers(5, 90))
        weight_kg   = float(round(float(RNG.uniform(15, 150)), 1))
        gender      = int(RNG.integers(0, 2))       # 0=male, 1=female
        pregnant    = 1 if (gender == 1 and 18 <= age <= 45 and RNG.random() < 0.10) else 0

        # ── Organ Function ────────────────────────────────────────────────────
        kidney_gfr  = float(round(float(RNG.uniform(5, 120)), 1))   # eGFR mL/min/1.73m2
        liver_score = int(RNG.integers(0, 16))               # Child-Pugh 0-15
        kidney_disease = 1 if kidney_gfr < 60 else 0
        liver_disease  = 1 if liver_score >= 7 else 0

        # ── Drug Selection ────────────────────────────────────────────────────
        drug_idx    = int(RNG.integers(0, len(DRUG_NAMES)))
        drug_name   = DRUG_NAMES[drug_idx]
        drug_prof   = DRUG_PROFILES[drug_name]
        max_single  = drug_prof["max_single"]
        daily_max   = drug_prof["daily_max"]
        narrow_index= int(drug_prof["narrow_index"])
        opioid      = int(drug_prof["opioid"])
        renal_risk  = int(drug_prof["renal_risk"])
        hepatic_risk= int(drug_prof["hepatic_risk"])

        # ── Dosage ────────────────────────────────────────────────────────────
        freq_key   = str(RNG.choice(list(FREQ_VALUES.keys())))
        freq_val   = FREQ_VALUES[freq_key]

        # Dose: 20% overdose, 60% within range, 20% underdose
        dose_fraction = float(RNG.choice(
            [RNG.uniform(0.3, 0.8), RNG.uniform(0.8, 1.0), RNG.uniform(1.0, 2.5)],
            p=[0.20, 0.60, 0.20]
        ))
        dose_mg        = float(round(max_single * dose_fraction, 1))
        daily_dose_mg  = float(round(dose_mg * freq_val, 1))
        weekly_dose_mg = float(round(daily_dose_mg * 7, 1))

        # ── Computed Clinical Features ────────────────────────────────────────
        dose_ratio      = float(round(dose_mg / max_single, 3))     # 1.0 = at limit
        daily_ratio     = float(round(daily_dose_mg / daily_max, 3)) if daily_max else 0.0
        toxic_threshold = max_single * 1.5
        toxic_ratio     = float(round(dose_mg / toxic_threshold, 3))

        # Accumulation risk: high if renal + narrow index + high dose + old age
        accum_score = (
            0.3 * min(1, max(0, (60 - kidney_gfr) / 60)) +  # renal penalty
            0.2 * narrow_index +
            0.2 * max(0, dose_ratio - 0.8) +
            0.1 * min(1, age / 80) +
            0.1 * liver_disease +
            0.1 * opioid
        )
        accumulation_risk = float(round(min(1.0, accum_score), 3))

        # ── Organ-specific Adjustments ────────────────────────────────────────
        renal_penalty  = 1 if (renal_risk and kidney_gfr < 30) else 0
        hepatic_penalty= 1 if (hepatic_risk and liver_score >= 7) else 0
        preg_penalty   = 1 if pregnant else 0
        age_penalty    = 1 if age >= 65 and dose_ratio >= 0.9 else 0
        ped_penalty    = 1 if age < 16 and drug_name in ["aspirin"] else 0

        # ── Risk Score Computation (clinical heuristic → ML target) ──────────
        risk_score = (
            2.5 * max(0, dose_ratio - 1.0) +        # overdose penalty
            1.5 * max(0, daily_ratio - 1.0) +        # daily limit breach
            1.0 * accumulation_risk +
            0.8 * renal_penalty +
            0.8 * hepatic_penalty +
            0.5 * preg_penalty +
            0.3 * age_penalty +
            0.4 * ped_penalty +
            0.5 * opioid * dose_ratio +              # opioid risk scaling
            0.3 * narrow_index * max(0, dose_ratio - 0.9)  # NTI near-miss
        )

        # Map risk_score → RISK_LEVEL (0-4)
        if risk_score < 0.3:
            risk_level = 0   # SAFE
        elif risk_score < 0.8:
            risk_level = 1   # LOW
        elif risk_score < 1.5:
            risk_level = 2   # MODERATE
        elif risk_score < 2.5:
            risk_level = 3   # HIGH
        else:
            risk_level = 4   # CRITICAL

        # Add slight noise to prevent perfect separability
        noise = RNG.integers(-1, 2)
        risk_level = int(np.clip(risk_level + noise, 0, 4))

        # Binary targets
        is_toxic       = 1 if dose_mg > toxic_threshold else 0
        emergency_flag = 1 if risk_level >= 3 else 0

        # Drug toxicity class: 0=low, 1=medium, 2=high
        if narrow_index or opioid:
            tox_class = 2
        elif renal_risk or hepatic_risk:
            tox_class = 1
        else:
            tox_class = 0

        rows.append({
            # Patient features
            "age":              age,
            "weight_kg":        weight_kg,
            "gender":           gender,
            "pregnant":         pregnant,
            "kidney_gfr":       kidney_gfr,
            "liver_score":      liver_score,
            "kidney_disease":   kidney_disease,
            "liver_disease":    liver_disease,
            # Drug features
            "drug_idx":         drug_idx,
            "narrow_index":     narrow_index,
            "opioid":           opioid,
            "renal_risk_drug":  renal_risk,
            "hepatic_risk_drug":hepatic_risk,
            # Dose features
            "dose_mg":          dose_mg,
            "freq_doses_per_day": freq_val,
            "max_safe_dose":    float(max_single),
            "daily_dose_mg":    daily_dose_mg,
            "weekly_dose_mg":   weekly_dose_mg,
            "daily_max_mg":     float(daily_max),
            # Computed
            "dose_ratio":       dose_ratio,
            "daily_ratio":      daily_ratio,
            "toxic_dose":       float(toxic_threshold),
            "toxic_ratio":      toxic_ratio,
            "accumulation_risk":accumulation_risk,
            # Organ adjustments
            "renal_penalty":    renal_penalty,
            "hepatic_penalty":  hepatic_penalty,
            "preg_penalty":     preg_penalty,
            "age_penalty":      age_penalty,
            # Targets
            "risk_level":       risk_level,
            "is_toxic":         is_toxic,
            "emergency_flag":   emergency_flag,
            "toxicity_class":   tox_class,
        })

    df = pd.DataFrame(rows)
    logger.info(f"Dataset created: {df.shape}")
    logger.info(f"Risk level distribution:\n{df['risk_level'].value_counts().sort_index()}")
    return df


# ── Feature Engineering ───────────────────────────────────────────────────────

FEATURE_COLS = [
    "age", "weight_kg", "gender", "pregnant",
    "kidney_gfr", "liver_score", "kidney_disease", "liver_disease",
    "drug_idx", "narrow_index", "opioid", "renal_risk_drug", "hepatic_risk_drug",
    "dose_mg", "freq_doses_per_day", "max_safe_dose", "daily_dose_mg", "weekly_dose_mg",
    "daily_max_mg", "dose_ratio", "daily_ratio", "toxic_dose", "toxic_ratio",
    "accumulation_risk", "renal_penalty", "hepatic_penalty", "preg_penalty", "age_penalty",
]


# ── Model Training ────────────────────────────────────────────────────────────

def train_classifier(name: str, model, X_train, y_train, X_test, y_test,
                     feature_names: list, model_dir: Path, prefix: str) -> dict:
    """Train a single classifier and return performance metrics."""
    logger.info(f"  Training {name}...")

    # Cross-validation (only for multiclass risk_level training)
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    try:
        cv_auc = cross_val_score(model, X_train, y_train, cv=cv, scoring="roc_auc_ovr_weighted").mean()
        logger.info(f"    CV AUC (OVR weighted): {cv_auc:.4f}")
    except Exception:
        cv_auc = None

    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)

    try:
        y_prob = model.predict_proba(X_test)
        auc = roc_auc_score(y_test, y_prob, multi_class="ovr", average="weighted")
    except Exception:
        auc = 0.0

    f1  = f1_score(y_test, y_pred, average="weighted", zero_division=0)
    acc = accuracy_score(y_test, y_pred)

    logger.info(f"    AUC={auc:.4f}  F1={f1:.4f}  Acc={acc:.4f}")
    logger.info(f"\n{classification_report(y_test, y_pred, target_names=RISK_LEVELS, zero_division=0)}")

    # Persist model
    model_path = model_dir / f"{prefix}_{name}_model.pkl"
    joblib.dump(model, model_path)
    logger.info(f"    Saved: {model_path.name}")

    return {"algorithm": name, "auc": round(auc, 4), "f1": round(f1, 4), "accuracy": round(acc, 4)}


def train_binary_classifier(name: str, model, X_train, y_train, X_test, y_test,
                             model_dir: Path, prefix: str) -> dict:
    """Train binary target (is_toxic or emergency_flag)."""
    logger.info(f"  Training binary {name}...")
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]

    auc = roc_auc_score(y_test, y_prob)
    f1  = f1_score(y_test, y_pred, zero_division=0)
    logger.info(f"    AUC={auc:.4f}  F1={f1:.4f}")

    model_path = model_dir / f"{prefix}_{name}_model.pkl"
    joblib.dump(model, model_path)
    logger.info(f"    Saved: {model_path.name}")

    return {"algorithm": name, "auc": round(auc, 4), "f1": round(f1, 4)}


def run_training(n_samples: int, data_dir: Path, model_dir: Path) -> dict:
    """Full training pipeline. Returns manifest update dict."""
    model_dir.mkdir(parents=True, exist_ok=True)
    data_dir.mkdir(parents=True, exist_ok=True)

    # ── 1. Generate or load dataset ───────────────────────────────────────────
    csv_path = data_dir / "dosage_safety.csv"
    if csv_path.exists():
        logger.info(f"Loading existing dataset: {csv_path}")
        df = pd.read_csv(csv_path)
    else:
        df = generate_dosage_safety_dataset(n_samples)
        df.to_csv(csv_path, index=False)
        logger.info(f"Dataset saved: {csv_path}")

    # ── 2. Prepare features ───────────────────────────────────────────────────
    X = df[FEATURE_COLS].fillna(0)
    y_risk    = df["risk_level"]
    y_toxic   = df["is_toxic"]
    y_emerg   = df["emergency_flag"]

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # Save feature names alongside scaler for the prediction service
    scaler_meta = {
        "feature_names": FEATURE_COLS,
        "drug_names":    DRUG_NAMES,
        "freq_values":   FREQ_VALUES,
        "risk_levels":   RISK_LEVELS,
        "trained_at":    datetime.now(tz=timezone.utc).isoformat(),
        "n_samples":     len(df),
    }
    meta_path = model_dir / "dosage_safety_meta.json"
    with open(meta_path, "w") as f:
        json.dump(scaler_meta, f, indent=2)
    logger.info(f"Feature metadata saved: {meta_path.name}")

    # Save scaler
    scaler_path = model_dir / "dosage_safety_scaler.pkl"
    joblib.dump(scaler, scaler_path)
    logger.info(f"Scaler saved: {scaler_path.name}")

    # ── 3. Train/test split ───────────────────────────────────────────────────
    X_train, X_test, y_risk_train, y_risk_test = train_test_split(
        X_scaled, y_risk, test_size=0.2, random_state=42, stratify=y_risk
    )
    _, _, y_tox_train, y_tox_test  = train_test_split(X_scaled, y_toxic, test_size=0.2, random_state=42)
    _, _, y_em_train,  y_em_test   = train_test_split(X_scaled, y_emerg, test_size=0.2, random_state=42)

    manifest_updates = {}

    # ── 4a. Risk Level — Random Forest ───────────────────────────────────────
    print("\n" + "="*60)
    print(" RISK LEVEL — Random Forest ".center(60, "="))
    print("="*60)
    rf = RandomForestClassifier(
        n_estimators=300, max_depth=12, min_samples_leaf=5,
        class_weight="balanced", random_state=42, n_jobs=-1
    )
    res_rf = train_classifier(
        "dosage_safety_rf", rf,
        X_train, y_risk_train, X_test, y_risk_test,
        FEATURE_COLS, model_dir, prefix="dosage"
    )
    manifest_updates["dosage_safety_rf"] = {**res_rf, "target": "risk_level", "trained_at": datetime.now(tz=timezone.utc).isoformat()}

    # ── 4b. Risk Level — Gradient Boosting ───────────────────────────────────
    print("\n" + "="*60)
    print(" RISK LEVEL — Gradient Boosting ".center(60, "="))
    print("="*60)
    gb = GradientBoostingClassifier(
        n_estimators=200, max_depth=5, learning_rate=0.1,
        subsample=0.8, random_state=42
    )
    res_gb = train_classifier(
        "dosage_safety_gb", gb,
        X_train, y_risk_train, X_test, y_risk_test,
        FEATURE_COLS, model_dir, prefix="dosage"
    )
    manifest_updates["dosage_safety_gb"] = {**res_gb, "target": "risk_level", "trained_at": datetime.now(tz=timezone.utc).isoformat()}

    # ── 4c. Risk Level — XGBoost ─────────────────────────────────────────────
    if XGBOOST_AVAILABLE:
        print("\n" + "="*60)
        print(" RISK LEVEL — XGBoost ".center(60, "="))
        print("="*60)
        xgb = XGBClassifier(
            n_estimators=300, max_depth=6, learning_rate=0.1,
            subsample=0.8, colsample_bytree=0.8,
            eval_metric="mlogloss",
            random_state=42, n_jobs=-1
        )
        res_xgb = train_classifier(
            "dosage_safety_xgb", xgb,
            X_train, y_risk_train, X_test, y_risk_test,
            FEATURE_COLS, model_dir, prefix="dosage"
        )
        manifest_updates["dosage_safety_xgb"] = {**res_xgb, "target": "risk_level", "trained_at": datetime.now(tz=timezone.utc).isoformat()}

    # ── 4d. Binary: Toxicity Flag — XGBoost / RF ─────────────────────────────
    print("\n" + "="*60)
    print(" TOXICITY FLAG — Binary Classifier ".center(60, "="))
    print("="*60)

    # Compute scale_pos_weight to handle class imbalance
    n_neg_tox = int((y_tox_train == 0).sum())
    n_pos_tox = max(1, int((y_tox_train == 1).sum()))
    spw_tox   = round(n_neg_tox / n_pos_tox, 2)
    logger.info(f"  Toxicity class balance: neg={n_neg_tox}, pos={n_pos_tox}, scale_pos_weight={spw_tox}")

    tox_model = XGBClassifier(
        n_estimators=200, max_depth=5, learning_rate=0.1,
        eval_metric="logloss", scale_pos_weight=spw_tox,
        random_state=42, n_jobs=-1
    ) if XGBOOST_AVAILABLE else RandomForestClassifier(
        n_estimators=200, random_state=42, n_jobs=-1, class_weight="balanced"
    )
    res_tox = train_binary_classifier(
        "dosage_toxicity", tox_model,
        X_train, y_tox_train, X_test, y_tox_test,
        model_dir, prefix="dosage"
    )
    manifest_updates["dosage_toxicity"] = {**res_tox, "target": "is_toxic", "trained_at": datetime.now(tz=timezone.utc).isoformat()}

    # ── 4e. Binary: Emergency Flag — XGBoost / RF ────────────────────────────
    print("\n" + "="*60)
    print(" EMERGENCY FLAG — Binary Classifier ".center(60, "="))
    print("="*60)

    # Compute scale_pos_weight to handle class imbalance
    n_neg_em = int((y_em_train == 0).sum())
    n_pos_em = max(1, int((y_em_train == 1).sum()))
    spw_em   = round(n_neg_em / n_pos_em, 2)
    logger.info(f"  Emergency class balance: neg={n_neg_em}, pos={n_pos_em}, scale_pos_weight={spw_em}")

    em_model = XGBClassifier(
        n_estimators=200, max_depth=5, learning_rate=0.1,
        eval_metric="logloss", scale_pos_weight=spw_em,
        random_state=42, n_jobs=-1
    ) if XGBOOST_AVAILABLE else RandomForestClassifier(
        n_estimators=200, random_state=42, n_jobs=-1, class_weight="balanced"
    )
    res_em = train_binary_classifier(
        "dosage_emergency", em_model,
        X_train, y_em_train, X_test, y_em_test,
        model_dir, prefix="dosage"
    )
    manifest_updates["dosage_emergency"] = {**res_em, "target": "emergency_flag", "trained_at": datetime.now(tz=timezone.utc).isoformat()}

    return manifest_updates


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="MediChain AI — Dosage Safety Prediction Engine Training"
    )
    parser.add_argument("--samples",   type=int,  default=3000,  help="Synthetic dataset size (default: 3000)")
    parser.add_argument("--model-dir", type=Path, default=None,  help="Override model output directory")
    parser.add_argument("--data-dir",  type=Path, default=None,  help="Override data directory")
    args = parser.parse_args()

    from config import settings
    model_dir = args.model_dir or settings.MODEL_DIR
    data_dir  = args.data_dir  or settings.DATA_DIR

    print("\n" + "="*70)
    print(" MediChain AI — Dosage Safety Prediction Engine ".center(70, "="))
    print("="*70)
    print(f"  Samples   : {args.samples}")
    print(f"  Model dir : {model_dir}")
    print(f"  Data dir  : {data_dir}")
    print("="*70 + "\n")

    manifest_updates = run_training(args.samples, data_dir, model_dir)

    # ── Update version manifest ───────────────────────────────────────────────
    try:
        from models_registry import registry
        registry.save_manifest(manifest_updates)
        logger.info("Version manifest updated with dosage safety models")
    except Exception as e:
        logger.warning(f"Could not update manifest: {e}")

    print("\n" + "="*70)
    print(" Training Summary ".center(70, "="))
    print("="*70)
    rows = []
    for key, val in manifest_updates.items():
        rows.append({
            "model":    key,
            "target":   val.get("target"),
            "algorithm":val.get("algorithm"),
            "auc":      val.get("auc"),
            "f1":       val.get("f1"),
        })
    print(pd.DataFrame(rows).to_string(index=False))
    print("="*70)
    print(f"\n[DONE] Dosage safety models saved to: {model_dir}")
    print("   Start AI service: python app.py\n")


if __name__ == "__main__":
    main()
