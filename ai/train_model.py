# ai/train_model.py
# MediChain AI — Disease Prediction Model Training Script
#
# This version uses EITHER:
#   A) Real UCI/Kaggle CSV datasets from ai/data/ (if present), OR
#   B) Synthetic data generation (fallback — no downloads needed)
#
# Run from the ai/ directory:
#   python train_model.py
#
# Outputs 6 .pkl files to ai/models/:
#   heart_model.pkl, heart_scaler.pkl
#   diabetes_model.pkl, diabetes_scaler.pkl
#   stroke_model.pkl, stroke_scaler.pkl

import os
import numpy as np
import pandas as pd
import joblib
from pathlib import Path
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, f1_score

# ── Paths ──────────────────────────────────────────────────────────────────────
BASE_DIR  = Path(__file__).parent
DATA_DIR  = BASE_DIR / "data"
MODEL_DIR = BASE_DIR / "models"
MODEL_DIR.mkdir(exist_ok=True)
DATA_DIR.mkdir(exist_ok=True)

# ── Synthetic Data Generators (fallback if CSVs missing) ──────────────────────

def gen_heart_data(n=1500, seed=42):
    """Synthetic heart disease data (UCI-compatible 13 features + 'target')."""
    rng = np.random.default_rng(seed)
    age    = rng.integers(25, 80, n)
    sex    = rng.integers(0, 2, n)
    cp     = rng.integers(0, 4, n)        # chest pain type 0-3
    trestbps = rng.integers(90, 200, n)
    chol   = rng.integers(150, 400, n)
    fbs    = (rng.random(n) > 0.85).astype(int)
    restecg = rng.integers(0, 3, n)
    thalach = rng.integers(70, 202, n)
    exang   = (rng.random(n) > 0.7).astype(int)
    oldpeak = rng.uniform(0, 6, n).round(1)
    slope   = rng.integers(0, 3, n)
    ca      = rng.integers(0, 4, n)
    thal    = rng.integers(1, 4, n)

    # Disease probability driven by risk factors
    risk = (
        0.003 * age +
        0.1 * sex +
        0.05 * cp +
        0.001 * trestbps +
        0.0005 * chol +
        0.1 * fbs -
        0.003 * thalach +
        0.08 * exang +
        0.04 * oldpeak +
        0.05 * ca
    )
    prob = 1 / (1 + np.exp(-risk + 2))   # sigmoid
    target = (rng.random(n) < prob).astype(int)

    return pd.DataFrame({
        'age': age, 'sex': sex, 'cp': cp, 'trestbps': trestbps,
        'chol': chol, 'fbs': fbs, 'restecg': restecg, 'thalach': thalach,
        'exang': exang, 'oldpeak': oldpeak, 'slope': slope, 'ca': ca,
        'thal': thal, 'target': target
    })

def gen_diabetes_data(n=1500, seed=42):
    """Synthetic diabetes data (Pima-compatible 8 features + 'Outcome')."""
    rng = np.random.default_rng(seed)
    preg    = rng.integers(0, 17, n)
    glucose = rng.integers(60, 200, n)
    bp      = rng.integers(40, 122, n)
    skin    = rng.integers(0, 99, n)
    insulin = rng.integers(0, 846, n)
    bmi     = rng.uniform(18, 45, n).round(1)
    dpf     = rng.uniform(0.08, 2.42, n).round(3)
    age     = rng.integers(21, 81, n)

    risk = (
        0.003 * glucose +
        0.02 * bmi +
        0.005 * age +
        0.02 * dpf +
        0.01 * preg
    )
    prob = 1 / (1 + np.exp(-risk + 3))
    outcome = (rng.random(n) < prob).astype(int)

    return pd.DataFrame({
        'Pregnancies': preg, 'Glucose': glucose, 'BloodPressure': bp,
        'SkinThickness': skin, 'Insulin': insulin, 'BMI': bmi,
        'DiabetesPedigreeFunction': dpf, 'Age': age, 'Outcome': outcome
    })

def gen_stroke_data(n=2000, seed=42):
    """Synthetic stroke data (Kaggle-compatible 10 features + 'stroke')."""
    rng = np.random.default_rng(seed)
    gender  = rng.choice(['Male', 'Female', 'Other'], n)
    age     = rng.integers(1, 85, n)
    htn     = (rng.random(n) > 0.85).astype(int)
    heart   = (rng.random(n) > 0.90).astype(int)
    married = rng.choice(['Yes', 'No'], n)
    work    = rng.choice(['Private', 'Self-employed', 'Govt_job', 'children', 'Never_worked'], n)
    res     = rng.choice(['Urban', 'Rural'], n)
    glucose = rng.uniform(55, 271, n).round(2)
    bmi     = rng.uniform(10, 50, n).round(1)
    smoking = rng.choice(['never smoked', 'formerly smoked', 'smokes', 'Unknown'], n)

    risk = (
        0.004 * age +
        0.15 * htn +
        0.2 * heart +
        0.001 * glucose +
        0.005 * bmi
    )
    prob = 1 / (1 + np.exp(-risk + 3.5))
    stroke = (rng.random(n) < prob).astype(int)

    return pd.DataFrame({
        'gender': gender, 'age': age, 'hypertension': htn,
        'heart_disease': heart, 'ever_married': married,
        'work_type': work, 'Residence_type': res,
        'avg_glucose_level': glucose, 'bmi': bmi,
        'smoking_status': smoking, 'stroke': stroke
    })

# ── Core Training Function ─────────────────────────────────────────────────────

def train_and_save(name, df, target_col, categorical_cols):
    """Trains the best classifier for a dataset and saves model + scaler."""
    print(f"\n{'='*20} TRAINING: {name.upper()} {'='*20}")
    print(f"  Shape: {df.shape} | Missing: {df.isnull().sum().sum()}")

    # Handle missing values
    for col in df.columns:
        if df[col].dtype == 'object':
            df[col] = df[col].fillna(df[col].mode()[0])
        else:
            df[col] = df[col].fillna(df[col].median())

    # Encode categoricals
    le = LabelEncoder()
    for col in [c for c in categorical_cols if c in df.columns]:
        df[col] = le.fit_transform(df[col].astype(str))
    df = pd.get_dummies(df)

    X = df.drop(target_col, axis=1, errors='ignore')
    y = df[target_col]

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y, test_size=0.2, random_state=42, stratify=y
    )

    # Pick best model via 5-fold cross-validation
    candidates = {
        'RandomForest':       RandomForestClassifier(n_estimators=100, random_state=42),
        'GradientBoosting':   GradientBoostingClassifier(n_estimators=100, random_state=42),
        'LogisticRegression': LogisticRegression(max_iter=1000, random_state=42),
    }

    best_model, best_f1, best_label = None, -1, ""
    for label, model in candidates.items():
        try:
            cv_scores = cross_val_score(model, X_train, y_train, cv=5, scoring='f1')
            mean_f1   = cv_scores.mean()
            print(f"  -> {label}: Mean CV F1 = {mean_f1:.4f}")
            if mean_f1 > best_f1:
                best_f1, best_model, best_label = mean_f1, model, label
        except Exception as e:
            print(f"  -> {label}: SKIPPED ({e})")

    print(f"\n  WINNER: {best_label} (F1={best_f1:.4f})")
    best_model.fit(X_train, y_train)
    y_pred = best_model.predict(X_test)
    print(classification_report(y_test, y_pred, zero_division=0))

    # Save
    model_path  = MODEL_DIR / f"{name}_model.pkl"
    scaler_path = MODEL_DIR / f"{name}_scaler.pkl"
    joblib.dump(best_model, model_path)
    joblib.dump(scaler,     scaler_path)
    print(f"  SAVED: {model_path.name} & {scaler_path.name}")

    return {"Model": name, "Algorithm": best_label, "F1": round(f1_score(y_test, y_pred, zero_division=0), 4)}

# ── Main ───────────────────────────────────────────────────────────────────────

def load_or_generate(name, csv_name, generator_fn):
    """Load a CSV from data/ if present, otherwise generate synthetic data."""
    csv_path = DATA_DIR / csv_name
    if csv_path.exists():
        print(f"  [REAL DATA] Loading {csv_name}...")
        return pd.read_csv(csv_path)
    else:
        print(f"  [SYNTHETIC] {csv_name} not found — using generated data...")
        df = generator_fn()
        # Save generated data for transparency
        df.to_csv(DATA_DIR / f"{name}_synthetic.csv", index=False)
        return df

def main():
    configs = [
        {
            "name":      "heart",
            "csv":       "heart.csv",
            "generator": gen_heart_data,
            "target":    "target",
            "cats":      ['sex', 'cp', 'fbs', 'restecg', 'exang', 'slope', 'ca', 'thal']
        },
        {
            "name":      "diabetes",
            "csv":       "diabetes.csv",
            "generator": gen_diabetes_data,
            "target":    "Outcome",
            "cats":      []
        },
        {
            "name":      "stroke",
            "csv":       "healthcare-dataset-stroke-data.csv",
            "generator": gen_stroke_data,
            "target":    "stroke",
            "cats":      ['gender', 'ever_married', 'work_type', 'Residence_type', 'smoking_status']
        },
    ]

    results = []
    for conf in configs:
        df = load_or_generate(conf['name'], conf['csv'], conf['generator'])
        res = train_and_save(conf['name'], df, conf['target'], conf['cats'])
        if res:
            results.append(res)

    print("\n" + "=" * 60)
    print(" TRAINING COMPLETE ".center(60, "="))
    print("=" * 60)
    if results:
        print(pd.DataFrame(results).to_string(index=False))
    print("=" * 60)
    print(f"\n✅ Models saved to: {MODEL_DIR}")
    print("   Start the AI service: python app.py\n")

if __name__ == "__main__":
    main()
