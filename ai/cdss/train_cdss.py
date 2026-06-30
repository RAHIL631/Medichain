# ai/cdss/train_cdss.py
# MediChain AI-CDSS — Unified Training Script
# Trains XGBoost models for all 5 diseases + adherence predictor.
# Outputs .pkl models to ai/models/ directory.
#
# Usage: python cdss/train_cdss.py
# Optional: Drop real CSVs into ai/data/ to use real data over synthetic.

import os
import sys
import numpy as np
import pandas as pd
import joblib
from pathlib import Path

# Add parent to path so we can import from ai/
sys.path.insert(0, str(Path(__file__).parent.parent))

from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import classification_report, roc_auc_score, f1_score
from sklearn.ensemble import RandomForestClassifier

try:
    from xgboost import XGBClassifier
    XGBOOST_AVAILABLE = True
except ImportError:
    XGBOOST_AVAILABLE = False
    print("[WARNING] XGBoost not installed — using RandomForest as fallback")
    print("   Install with: pip install xgboost")

BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / "data"
MODEL_DIR = BASE_DIR / "models"
PLOTS_DIR = MODEL_DIR / "plots"

MODEL_DIR.mkdir(exist_ok=True)
DATA_DIR.mkdir(exist_ok=True)
PLOTS_DIR.mkdir(exist_ok=True)

RNG = np.random.default_rng(42)

# ── SHAP plot generation (optional) ──────────────────────────────────────────
try:
    import shap
    import matplotlib
    matplotlib.use('Agg')  # Non-interactive backend
    import matplotlib.pyplot as plt
    SHAP_PLOTS = True
except ImportError:
    SHAP_PLOTS = False
    print("[WARNING] SHAP not available — skipping importance plots")


# ── Synthetic Data Generators ─────────────────────────────────────────────────

def gen_heart_data(n=2000):
    age = RNG.integers(25, 80, n)
    sex = RNG.integers(0, 2, n)
    cp = RNG.integers(0, 4, n)
    trestbps = RNG.integers(90, 200, n)
    chol = RNG.integers(150, 400, n)
    fbs = (RNG.random(n) > 0.85).astype(int)
    restecg = RNG.integers(0, 3, n)
    thalach = RNG.integers(70, 202, n)
    exang = (RNG.random(n) > 0.7).astype(int)
    oldpeak = RNG.uniform(0, 6, n).round(1)
    slope = RNG.integers(0, 3, n)
    ca = RNG.integers(0, 4, n)
    thal = RNG.integers(1, 4, n)

    risk = (0.004*age + 0.15*sex + 0.06*cp + 0.002*trestbps +
            0.001*chol + 0.15*fbs - 0.004*thalach + 0.1*exang +
            0.05*oldpeak + 0.07*ca)
    prob = 1 / (1 + np.exp(-risk + 2.2))
    target = (RNG.random(n) < prob).astype(int)

    return pd.DataFrame({
        'age': age, 'sex': sex, 'cp': cp, 'trestbps': trestbps,
        'chol': chol, 'fbs': fbs, 'restecg': restecg, 'thalach': thalach,
        'exang': exang, 'oldpeak': oldpeak, 'slope': slope, 'ca': ca,
        'thal': thal, 'target': target
    })


def gen_diabetes_data(n=2000):
    preg = RNG.integers(0, 17, n)
    glucose = RNG.integers(60, 200, n)
    bp = RNG.integers(40, 122, n)
    skin = RNG.integers(0, 99, n)
    insulin = RNG.integers(0, 846, n)
    bmi = RNG.uniform(18, 45, n).round(1)
    dpf = RNG.uniform(0.08, 2.42, n).round(3)
    age = RNG.integers(21, 81, n)

    risk = 0.004*glucose + 0.025*bmi + 0.006*age + 0.025*dpf + 0.012*preg
    prob = 1 / (1 + np.exp(-risk + 3.2))
    outcome = (RNG.random(n) < prob).astype(int)

    return pd.DataFrame({
        'Pregnancies': preg, 'Glucose': glucose, 'BloodPressure': bp,
        'SkinThickness': skin, 'Insulin': insulin, 'BMI': bmi,
        'DiabetesPedigreeFunction': dpf, 'Age': age, 'Outcome': outcome
    })


def gen_stroke_data(n=3000):
    gender = RNG.integers(0, 2, n)
    age = RNG.integers(1, 85, n)
    htn = (RNG.random(n) > 0.85).astype(int)
    heart = (RNG.random(n) > 0.90).astype(int)
    married = RNG.integers(0, 2, n)
    work = RNG.integers(0, 4, n)
    res = RNG.integers(0, 2, n)
    glucose = RNG.uniform(55, 271, n).round(2)
    bmi = RNG.uniform(10, 50, n).round(1)
    smoking = RNG.integers(0, 3, n)

    risk = 0.005*age + 0.18*htn + 0.22*heart + 0.0015*glucose + 0.006*bmi + 0.08*smoking
    prob = 1 / (1 + np.exp(-risk + 3.8))
    stroke = (RNG.random(n) < prob).astype(int)

    return pd.DataFrame({
        'gender': gender, 'age': age, 'hypertension': htn,
        'heart_disease': heart, 'ever_married': married,
        'work_type': work, 'Residence_type': res,
        'avg_glucose_level': glucose, 'bmi': bmi,
        'smoking_status': smoking, 'stroke': stroke
    })


def gen_kidney_data(n=2000):
    age = RNG.integers(20, 85, n)
    gfr = RNG.uniform(5, 120, n).round(1)
    creatinine = RNG.uniform(0.5, 8.0, n).round(2)
    urea = RNG.integers(10, 200, n).astype(float)
    sodium = RNG.uniform(125, 155, n).round(1)
    potassium = RNG.uniform(2.5, 7.0, n).round(1)
    hemoglobin = RNG.uniform(5.0, 17.0, n).round(1)
    bp = RNG.integers(80, 200, n).astype(float)
    diabetes = (RNG.random(n) > 0.75).astype(int)
    htn = (RNG.random(n) > 0.70).astype(int)
    bmi = RNG.uniform(18, 42, n).round(1)

    risk = (-0.03*gfr + 0.08*creatinine + 0.001*urea + 0.003*bp +
             0.2*diabetes + 0.18*htn + 0.005*age)
    prob = 1 / (1 + np.exp(-risk + 1.5))
    ckd = (RNG.random(n) < prob).astype(int)

    return pd.DataFrame({
        'age': age, 'gfr': gfr, 'creatinine': creatinine, 'urea': urea,
        'sodium': sodium, 'potassium': potassium, 'hemoglobin': hemoglobin,
        'bp': bp, 'diabetes': diabetes, 'hypertension': htn, 'bmi': bmi, 'ckd': ckd
    })


def gen_liver_data(n=2000):
    age = RNG.integers(20, 80, n)
    sex = RNG.integers(0, 2, n)
    total_bili = RNG.uniform(0.2, 15.0, n).round(2)
    direct_bili = RNG.uniform(0.1, 10.0, n).round(2)
    alk_phos = RNG.integers(40, 900, n).astype(float)
    alt = RNG.integers(7, 500, n).astype(float)
    ast = RNG.integers(7, 500, n).astype(float)
    albumin = RNG.uniform(1.5, 5.0, n).round(2)
    liver_score = RNG.integers(0, 15, n)
    alcohol = (RNG.random(n) > 0.70).astype(int)

    risk = (0.03*total_bili + 0.0005*alk_phos + 0.001*alt + 0.001*ast +
             0.05*liver_score + 0.25*alcohol - 0.1*albumin + 0.003*age)
    prob = 1 / (1 + np.exp(-risk + 1.0))
    liver_disease = (RNG.random(n) < prob).astype(int)

    return pd.DataFrame({
        'age': age, 'sex': sex, 'total_bilirubin': total_bili,
        'direct_bilirubin': direct_bili, 'alkaline_phosphatase': alk_phos,
        'alt': alt, 'ast': ast, 'albumin': albumin,
        'liver_score': liver_score, 'alcohol': alcohol, 'liver_disease': liver_disease
    })


def gen_adherence_data(n=2000):
    avg_refill_delay = RNG.uniform(0, 30, n)
    missed_rate = RNG.uniform(0, 0.8, n)
    n_meds = RNG.integers(1, 12, n).astype(float)
    n_conditions = RNG.integers(0, 6, n).astype(float)
    age_group = RNG.integers(0, 4, n).astype(float)
    polypharmacy = (n_meds >= 5).astype(float)
    refill_consistency = RNG.uniform(0, 20, n)
    days_since_last = RNG.uniform(0, 90, n)

    # Adherent = low delay, low missed rate, low polypharmacy
    risk = (0.04*avg_refill_delay + 1.5*missed_rate + 0.2*polypharmacy +
             0.05*refill_consistency + 0.01*days_since_last)
    prob_non_adherent = 1 / (1 + np.exp(-risk + 2))
    # label: 1 = adherent, 0 = non-adherent
    adherent = (RNG.random(n) > prob_non_adherent).astype(int)

    return pd.DataFrame({
        'avg_refill_delay': avg_refill_delay, 'missed_rate': missed_rate,
        'n_meds': n_meds, 'n_conditions': n_conditions, 'age_group': age_group,
        'polypharmacy': polypharmacy, 'refill_consistency': refill_consistency,
        'days_since_last': days_since_last, 'adherent': adherent
    })


def gen_cancer_data(n=2000):
    age = RNG.integers(18, 90, n)
    gender = RNG.integers(0, 2, n)
    smoking = (RNG.random(n) > 0.75).astype(int)
    alcohol = (RNG.random(n) > 0.70).astype(int)
    family_history = (RNG.random(n) > 0.85).astype(int)
    bmi = RNG.uniform(15, 45, n).round(1)
    inactivity = (RNG.random(n) > 0.60).astype(int)
    inflammation = (RNG.random(n) > 0.80).astype(int)

    risk = (0.04*age + 0.1*gender + 0.35*smoking + 0.2*alcohol +
            0.5*family_history + 0.02*bmi + 0.15*inactivity + 0.3*inflammation)
    prob = 1 / (1 + np.exp(-risk + 3.8))
    cancer = (RNG.random(n) < prob).astype(int)

    return pd.DataFrame({
        'age': age.astype(float),
        'gender': gender.astype(float),
        'smoking': smoking.astype(float),
        'alcohol': alcohol.astype(float),
        'family_history': family_history.astype(float),
        'bmi': bmi.astype(float),
        'inactivity': inactivity.astype(float),
        'inflammation': inflammation.astype(float),
        'cancer': cancer
    })


# ── Core Training Function ─────────────────────────────────────────────────────

def train_disease_model(name: str, df: pd.DataFrame, target_col: str, prefix="xgb") -> dict:
    print(f"\n{'='*25} TRAINING: {name.upper()} {'='*25}")
    print(f"  Shape: {df.shape} | Positive: {df[target_col].sum()} ({df[target_col].mean()*100:.1f}%)")

    # Handle missing values
    for col in df.columns:
        if df[col].dtype in ['object']:
            df[col] = df[col].fillna(df[col].mode()[0])
        else:
            df[col] = df[col].fillna(df[col].median())

    X = df.drop(columns=[target_col])
    y = df[target_col]

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y, test_size=0.2, random_state=42, stratify=y
    )

    # Choose model
    if XGBOOST_AVAILABLE:
        model = XGBClassifier(
            n_estimators=200,
            max_depth=6,
            learning_rate=0.1,
            subsample=0.8,
            colsample_bytree=0.8,
            use_label_encoder=False,
            eval_metric='logloss',
            random_state=42,
            n_jobs=-1
        )
        algo_name = "XGBoost"
    else:
        model = RandomForestClassifier(
            n_estimators=200, max_depth=8, random_state=42, n_jobs=-1
        )
        algo_name = "RandomForest"

    # Cross-validation
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_scores = cross_val_score(model, X_train, y_train, cv=cv, scoring='roc_auc')
    print(f"  {algo_name} CV AUC: {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")

    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]

    auc = roc_auc_score(y_test, y_prob)
    f1 = f1_score(y_test, y_pred, zero_division=0)
    print(f"  Test AUC: {auc:.4f} | F1: {f1:.4f}")
    print(classification_report(y_test, y_pred, zero_division=0))

    # Save model and scaler
    model_filename = f"{prefix}_{name}_model.pkl" if prefix else f"{name}_model.pkl"
    scaler_filename = f"{prefix}_{name}_scaler.pkl" if prefix else f"{name}_scaler.pkl"
    model_path  = MODEL_DIR / model_filename
    scaler_path = MODEL_DIR / scaler_filename
    joblib.dump(model,  model_path)
    joblib.dump(scaler, scaler_path)
    print(f"  [OK] Saved: {model_path.name} & {scaler_path.name}")

    # SHAP importance plot
    if SHAP_PLOTS and XGBOOST_AVAILABLE:
        try:
            explainer = shap.TreeExplainer(model)
            sv = explainer.shap_values(X_test[:200])
            if isinstance(sv, list):
                sv = sv[1]
            plt.figure(figsize=(10, 6))
            shap.summary_plot(sv, X_test[:200], feature_names=list(X.columns),
                              show=False, plot_type="bar")
            plt.title(f"SHAP Feature Importance — {name.title()}")
            plt.tight_layout()
            plt.savefig(PLOTS_DIR / f"{name}_shap.png", dpi=150, bbox_inches='tight')
            plt.close()
            print(f"  [PLOT] SHAP plot saved: {name}_shap.png")
        except Exception as e:
            print(f"  [WARNING] SHAP plot failed: {e}")

    return {"model": name, "algorithm": algo_name, "auc": round(auc, 4), "f1": round(f1, 4)}


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    print("\n" + "=" * 70)
    print(" MediChain AI-CDSS Model Training ".center(70, "="))
    print("=" * 70)

    configs = [
        {"name": "heart",    "gen": gen_heart_data,    "target": "target",       "csv": "heart.csv"},
        {"name": "diabetes", "gen": gen_diabetes_data, "target": "Outcome",      "csv": "diabetes.csv"},
        {"name": "stroke",   "gen": gen_stroke_data,   "target": "stroke",       "csv": "stroke.csv"},
        {"name": "kidney",   "gen": gen_kidney_data,   "target": "ckd",          "csv": "kidney.csv"},
        {"name": "liver",    "gen": gen_liver_data,    "target": "liver_disease", "csv": "liver.csv"},
        {"name": "cancer",   "gen": gen_cancer_data,   "target": "cancer",        "csv": "cancer.csv"},
        {"name": "adherence","gen": gen_adherence_data,"target": "adherent",     "csv": "adherence.csv"},
    ]

    results = []
    for conf in configs:
        csv_path = DATA_DIR / conf["csv"]
        if csv_path.exists():
            print(f"\n  [REAL DATA] Loading {conf['csv']}")
            df = pd.read_csv(csv_path)
        else:
            print(f"\n  [SYNTHETIC] {conf['csv']} not found — generating data")
            df = conf["gen"]()
            df.to_csv(DATA_DIR / f"{conf['name']}_synthetic.csv", index=False)

        # Adherence model saved without prefix to match adherence_predictor.py
        res = train_disease_model(
            conf["name"], df, conf["target"],
            prefix=("" if conf["name"] == "adherence" else "xgb")
        )
        results.append(res)

    print("\n" + "=" * 70)
    print(" TRAINING COMPLETE ".center(70, "="))
    print("=" * 70)
    print(pd.DataFrame(results).to_string(index=False))
    print("\n[OK] All models saved to:", MODEL_DIR)
    print("   Start AI service: python app.py\n")


if __name__ == "__main__":
    main()
