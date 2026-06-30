# ai/scripts/train_ensemble.py
# MediChain AI — Multi-Model Ensemble Training CLI
# Trains XGBoost, LightGBM, and CatBoost models for 8 target diseases.
# Saves estimators in ai/models/ directory.

import os
import sys
import numpy as np
import pandas as pd
import joblib
from pathlib import Path

# Ensure ai/ is importable
_AI_DIR = Path(__file__).parent.parent
if str(_AI_DIR) not in sys.path:
    sys.path.insert(0, str(_AI_DIR))

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import roc_auc_score, f1_score
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier

# Import models with graceful fallbacks
try:
    from xgboost import XGBClassifier
    XGB_AVAILABLE = True
except ImportError:
    XGB_AVAILABLE = False

try:
    from lightgbm import LGBMClassifier
    LGB_AVAILABLE = True
except ImportError:
    LGB_AVAILABLE = False

try:
    from catboost import CatBoostClassifier
    CAT_AVAILABLE = True
except ImportError:
    CAT_AVAILABLE = False

MODEL_DIR = _AI_DIR / "models"
MODEL_DIR.mkdir(exist_ok=True)
RNG = np.random.default_rng(42)

# ── Data Generators ───────────────────────────────────────────────────────────

def gen_heart_data(n=1000):
    age = RNG.integers(25, 80, n)
    gender = RNG.integers(0, 2, n)
    bp = RNG.integers(90, 200, n)
    chol = RNG.integers(150, 400, n)
    bmi = RNG.uniform(18, 45, n)
    smoking = (RNG.random(n) > 0.75).astype(int)
    risk = 0.04*age + 0.15*gender + 0.003*bp + 0.002*chol + 0.02*bmi + 0.3*smoking
    prob = 1 / (1 + np.exp(-risk + 3.2))
    target = (RNG.random(n) < prob).astype(int)
    return pd.DataFrame({'age': age, 'gender': gender, 'bp': bp, 'chol': chol, 'bmi': bmi, 'smoking': smoking}), target

def gen_diabetes_data(n=1000):
    age = RNG.integers(20, 80, n)
    bmi = RNG.uniform(18, 45, n)
    glucose = RNG.integers(60, 250, n)
    bp = RNG.integers(50, 120, n)
    family_hist = (RNG.random(n) > 0.8).astype(int)
    risk = 0.015*age + 0.04*bmi + 0.012*glucose + 0.002*bp + 0.4*family_hist
    prob = 1 / (1 + np.exp(-risk + 3.5))
    target = (RNG.random(n) < prob).astype(int)
    return pd.DataFrame({'age': age, 'bmi': bmi, 'glucose': glucose, 'bp': bp, 'family_hist': family_hist}), target

def gen_stroke_data(n=1000):
    age = RNG.integers(30, 85, n)
    gender = RNG.integers(0, 2, n)
    bp = RNG.integers(100, 210, n)
    chol = RNG.integers(160, 380, n)
    smoking = (RNG.random(n) > 0.70).astype(int)
    heart_disease = (RNG.random(n) > 0.90).astype(int)
    risk = 0.05*age + 0.1*gender + 0.006*bp + 0.001*chol + 0.2*smoking + 0.5*heart_disease
    prob = 1 / (1 + np.exp(-risk + 4.5))
    target = (RNG.random(n) < prob).astype(int)
    return pd.DataFrame({'age': age, 'gender': gender, 'bp': bp, 'chol': chol, 'smoking': smoking, 'heart_disease': heart_disease}), target

def gen_kidney_data(n=1000):
    age = RNG.integers(18, 85, n)
    gfr = RNG.uniform(10, 120, n)
    creatinine = RNG.uniform(0.5, 7.0, n)
    bp = RNG.integers(80, 190, n)
    diabetes = (RNG.random(n) > 0.80).astype(int)
    risk = 0.01*age - 0.03*gfr + 0.15*creatinine + 0.003*bp + 0.4*diabetes
    prob = 1 / (1 + np.exp(-risk + 1.2))
    target = (RNG.random(n) < prob).astype(int)
    return pd.DataFrame({'age': age, 'gfr': gfr, 'creatinine': creatinine, 'bp': bp, 'diabetes': diabetes}), target

def gen_liver_data(n=1000):
    age = RNG.integers(18, 80, n)
    gender = RNG.integers(0, 2, n)
    bilirubin = RNG.uniform(0.2, 10.0, n)
    alt = RNG.integers(10, 400, n)
    alcohol = (RNG.random(n) > 0.70).astype(int)
    risk = 0.02*age + 0.1*gender + 0.08*bilirubin + 0.002*alt + 0.5*alcohol
    prob = 1 / (1 + np.exp(-risk + 2.0))
    target = (RNG.random(n) < prob).astype(int)
    return pd.DataFrame({'age': age, 'gender': gender, 'bilirubin': bilirubin, 'alt': alt, 'alcohol': alcohol}), target

def gen_cancer_data(n=1000):
    age = RNG.integers(18, 90, n)
    gender = RNG.integers(0, 2, n)
    smoking = (RNG.random(n) > 0.75).astype(int)
    alcohol = (RNG.random(n) > 0.70).astype(int)
    family_history = (RNG.random(n) > 0.85).astype(int)
    bmi = RNG.uniform(15, 45, n)
    risk = 0.03*age + 0.1*gender + 0.4*smoking + 0.2*alcohol + 0.6*family_history + 0.015*bmi
    prob = 1 / (1 + np.exp(-risk + 3.6))
    target = (RNG.random(n) < prob).astype(int)
    return pd.DataFrame({'age': age, 'gender': gender, 'smoking': smoking, 'alcohol': alcohol, 'family_history': family_history, 'bmi': bmi}), target

def gen_copd_data(n=1000):
    age = RNG.integers(30, 85, n)
    smoking = (RNG.random(n) > 0.65).astype(int)
    occupational_exposure = (RNG.random(n) > 0.80).astype(int)
    air_pollution = RNG.integers(1, 6, n)
    asthma = (RNG.random(n) > 0.85).astype(int)
    risk = 0.04*age + 0.8*smoking + 0.5*occupational_exposure + 0.1*air_pollution + 0.4*asthma
    prob = 1 / (1 + np.exp(-risk + 4.2))
    target = (RNG.random(n) < prob).astype(int)
    return pd.DataFrame({'age': age, 'smoking': smoking, 'occupational_exposure': occupational_exposure, 'air_pollution': air_pollution, 'asthma': asthma}), target

def gen_thyroid_data(n=1000):
    age = RNG.integers(18, 80, n)
    gender = RNG.integers(0, 2, n)  # 1 = female (higher risk)
    tsh = RNG.uniform(0.1, 15.0, n)
    free_t4 = RNG.uniform(0.4, 3.0, n)
    family_history = (RNG.random(n) > 0.88).astype(int)
    risk = 0.01*age + 0.4*gender + 0.12*np.abs(tsh - 1.5) + 0.2*np.abs(free_t4 - 1.2) + 0.5*family_history
    prob = 1 / (1 + np.exp(-risk + 2.5))
    target = (RNG.random(n) < prob).astype(int)
    return pd.DataFrame({'age': age, 'gender': gender, 'tsh': tsh, 'free_t4': free_t4, 'family_history': family_history}), target

# ── Training Script ───────────────────────────────────────────────────────────

def train_ensemble_for_disease(disease_name, gen_fn):
    print(f"\nTraining Multi-Model Ensemble for: {disease_name.upper()}...")
    X, y = gen_fn(n=1200)

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    X_train, X_test, y_train, y_test = train_test_split(X_scaled, y, test_size=0.2, random_state=42)

    # 1. XGBoost model
    if XGB_AVAILABLE:
        model_xgb = XGBClassifier(n_estimators=100, max_depth=5, learning_rate=0.1, random_state=42, eval_metric='logloss')
        algo_xgb = "XGBoost"
    else:
        model_xgb = RandomForestClassifier(n_estimators=100, max_depth=5, random_state=42)
        algo_xgb = "RandomForest (Fallback)"
    model_xgb.fit(X_train, y_train)

    # 2. LightGBM model
    if LGB_AVAILABLE:
        model_lgb = LGBMClassifier(n_estimators=100, max_depth=5, learning_rate=0.1, random_state=42, verbosity=-1)
        algo_lgb = "LightGBM"
    else:
        model_lgb = GradientBoostingClassifier(n_estimators=100, max_depth=5, random_state=42)
        algo_lgb = "GradientBoosting (Fallback)"
    model_lgb.fit(X_train, y_train)

    # 3. CatBoost model
    if CAT_AVAILABLE:
        model_cat = CatBoostClassifier(iterations=100, depth=5, learning_rate=0.1, random_state=42, verbose=0)
        algo_cat = "CatBoost"
    else:
        model_cat = RandomForestClassifier(n_estimators=100, max_depth=5, criterion='entropy', random_state=42)
        algo_cat = "RandomForestEntropy (Fallback)"
    model_cat.fit(X_train, y_train)

    # Evaluate
    probs_xgb = model_xgb.predict_proba(X_test)[:, 1]
    probs_lgb = model_lgb.predict_proba(X_test)[:, 1]
    probs_cat = model_cat.predict_proba(X_test)[:, 1]
    
    # Simple average ensemble
    probs_ens = (probs_xgb + probs_lgb + probs_cat) / 3.0
    preds_ens = (probs_ens >= 0.5).astype(int)

    auc = roc_auc_score(y_test, probs_ens)
    f1 = f1_score(y_test, preds_ens)
    print(f"  [{algo_xgb}] Prob sample: {probs_xgb[:3]}")
    print(f"  [{algo_lgb}] Prob sample: {probs_lgb[:3]}")
    print(f"  [{algo_cat}] Prob sample: {probs_cat[:3]}")
    print(f"  Ensemble Test AUC: {auc:.4f} | F1 Score: {f1:.4f}")

    # Save
    joblib.dump(model_xgb, MODEL_DIR / f"xgb_ens_{disease_name}.pkl")
    joblib.dump(model_lgb, MODEL_DIR / f"lgb_ens_{disease_name}.pkl")
    joblib.dump(model_cat, MODEL_DIR / f"cat_ens_{disease_name}.pkl")
    joblib.dump(scaler, MODEL_DIR / f"scaler_ens_{disease_name}.pkl")
    print(f"  [OK] Saved ensemble assets for {disease_name}")

def main():
    diseases = {
        "heart": gen_heart_data,
        "diabetes": gen_diabetes_data,
        "stroke": gen_stroke_data,
        "kidney": gen_kidney_data,
        "liver": gen_liver_data,
        "cancer": gen_cancer_data,
        "copd": gen_copd_data,
        "thyroid": gen_thyroid_data
    }

    print("=" * 60)
    print("MediChain AI — Multi-Model Ensemble Trainer".center(60))
    print("=" * 60)
    print(f"XGBoost  Support : {'Yes' if XGB_AVAILABLE else 'No'}")
    print(f"LightGBM Support : {'Yes' if LGB_AVAILABLE else 'No'}")
    print(f"CatBoost Support : {'Yes' if CAT_AVAILABLE else 'No'}")
    print("=" * 60)

    for name, gen in diseases.items():
        train_ensemble_for_disease(name, gen)

    print("\n[COMPLETE] All ensemble models trained and saved to:", MODEL_DIR)

if __name__ == "__main__":
    main()
