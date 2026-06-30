# ai/scripts/train_adherence_sys.py
# MediChain AI — Medication Adherence Prediction Model Trainer
# Features: age, education (0/1/2), history (0-100), missed_medicines (0-30), chronic_diseases (0-6)

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
from sklearn.ensemble import RandomForestClassifier

try:
    from xgboost import XGBClassifier
    XGB_AVAILABLE = True
except ImportError:
    XGB_AVAILABLE = False

MODEL_DIR = _AI_DIR / "models"
MODEL_DIR.mkdir(exist_ok=True)
RNG = np.random.default_rng(42)

def gen_adherence_data(n=2000):
    age = RNG.integers(18, 90, n)
    education = RNG.integers(0, 3, n) # 0 = Primary, 1 = Secondary, 2 = Higher
    history = RNG.uniform(30, 100, n).round(1) # past adherence percentage
    missed_medicines = RNG.integers(0, 20, n) # doses missed in last 30 days
    chronic_diseases = RNG.integers(0, 6, n) # number of chronic conditions

    # Adherence score calculation (linear combo + noise)
    # Higher history, higher education -> higher adherence
    # Higher missed doses, higher chronic disease -> lower adherence
    risk = (0.01 * age + 0.15 * education + 0.04 * history - 0.25 * missed_medicines - 0.08 * chronic_diseases)
    prob = 1 / (1 + np.exp(-risk + 1.8))
    target = (RNG.random(n) < prob).astype(int)

    return pd.DataFrame({
        'age': age.astype(float),
        'education': education.astype(float),
        'history': history.astype(float),
        'missed_medicines': missed_medicines.astype(float),
        'chronic_diseases': chronic_diseases.astype(float)
    }), target

def main():
    print("=" * 60)
    print("MediChain AI — Adherence System Model Trainer".center(60))
    print("=" * 60)
    print(f"XGBoost Support: {'Yes' if XGB_AVAILABLE else 'No'}")
    print("=" * 60)

    X, y = gen_adherence_data(n=2000)

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    X_train, X_test, y_train, y_test = train_test_split(X_scaled, y, test_size=0.2, random_state=42)

    if XGB_AVAILABLE:
        model = XGBClassifier(n_estimators=150, max_depth=5, learning_rate=0.1, random_state=42, eval_metric='logloss')
        algo = "XGBoost"
    else:
        model = RandomForestClassifier(n_estimators=150, max_depth=5, random_state=42)
        algo = "RandomForest (Fallback)"

    model.fit(X_train, y_train)

    probs = model.predict_proba(X_test)[:, 1]
    preds = (probs >= 0.5).astype(int)

    auc = roc_auc_score(y_test, probs)
    f1 = f1_score(y_test, preds)

    print(f"Algorithm: {algo}")
    print(f"Test AUC: {auc:.4f} | F1 Score: {f1:.4f}")

    # Save model and scaler
    joblib.dump(model, MODEL_DIR / "adherence_sys_model.pkl")
    joblib.dump(scaler, MODEL_DIR / "adherence_sys_scaler.pkl")
    print(f"[OK] Saved adherence_sys_model.pkl & adherence_sys_scaler.pkl")

if __name__ == "__main__":
    main()
