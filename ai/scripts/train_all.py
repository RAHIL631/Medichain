# ai/scripts/train_all.py
# MediChain AI — Unified Model Training CLI
#
# Trains any or all ML models and auto-updates the version manifest.
#
# Usage (run from the ai/ directory):
#   python scripts/train_all.py                         # train all models
#   python scripts/train_all.py --disease heart         # train one disease
#   python scripts/train_all.py --disease heart diabetes # train specific set
#   python scripts/train_all.py --list                  # list available targets
#   python scripts/train_all.py --validate              # validate after training
#
# After training, the version_manifest.json is automatically updated
# with AUC, F1, and training timestamp for each model.

import sys
import argparse
import logging
from pathlib import Path
from datetime import datetime, timezone

# Ensure ai/ is importable
_AI_DIR = Path(__file__).parent.parent
if str(_AI_DIR) not in sys.path:
    sys.path.insert(0, str(_AI_DIR))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("medichain.train")

AVAILABLE_DISEASES = ["heart", "diabetes", "stroke", "kidney", "liver", "cancer", "adherence"]


def train_all_cdss(diseases: list, data_dir: Path, model_dir: Path) -> dict:
    """
    Train XGBoost models using the unified cdss/train_cdss.py trainer.
    Returns a dict of {disease: {auc, f1, algorithm}} results.
    """
    from cdss.train_cdss import (
        train_disease_model,
        gen_heart_data, gen_diabetes_data, gen_stroke_data,
        gen_kidney_data, gen_liver_data, gen_cancer_data, gen_adherence_data,
        DATA_DIR as CDSS_DATA_DIR, MODEL_DIR as CDSS_MODEL_DIR,
    )

    generators = {
        "heart":     (gen_heart_data,     "target",        "heart.csv"),
        "diabetes":  (gen_diabetes_data,  "Outcome",       "diabetes.csv"),
        "stroke":    (gen_stroke_data,    "stroke",        "stroke.csv"),
        "kidney":    (gen_kidney_data,    "ckd",           "kidney.csv"),
        "liver":     (gen_liver_data,     "liver_disease", "liver.csv"),
        "cancer":    (gen_cancer_data,    "cancer",        "cancer.csv"),
        "adherence": (gen_adherence_data, "adherent",      "adherence.csv"),
    }

    import pandas as pd

    results = {}
    for disease in diseases:
        if disease not in generators:
            logger.warning(f"Unknown disease '{disease}' — skipping")
            continue

        gen_fn, target_col, csv_name = generators[disease]
        csv_path = data_dir / csv_name

        if csv_path.exists():
            logger.info(f"  [REAL DATA] Loading {csv_name}")
            df = pd.read_csv(csv_path)
        else:
            logger.info(f"  [SYNTHETIC] {csv_name} not found — generating data")
            df = gen_fn()
            df.to_csv(data_dir / f"{disease}_synthetic.csv", index=False)

        # Adherence model saved without prefix (existing convention)
        prefix = "" if disease == "adherence" else "xgb"
        res = train_disease_model(disease, df, target_col, prefix=prefix)
        results[disease] = res

    return results


def update_manifest(results: dict) -> None:
    """Update models_registry/version_manifest.json with new training results."""
    from models_registry import registry

    now = datetime.now(tz=timezone.utc).isoformat()
    updates = {}
    for disease, res in results.items():
        key = f"xgb_{disease}" if disease != "adherence" else disease
        updates[key] = {
            "disease":    disease,
            "algorithm":  res.get("algorithm", "XGBoost"),
            "version":    "1.0.0",
            "trained_at": now,
            "auc":        res.get("auc"),
            "f1":         res.get("f1"),
        }

    registry.save_manifest(updates)
    logger.info("📝 Version manifest updated")


def run_validation() -> None:
    """Run validate_models.py smoke tests after training."""
    import subprocess
    validate_script = Path(__file__).parent / "validate_models.py"
    if validate_script.exists():
        logger.info("🔍 Running post-training validation...")
        subprocess.run([sys.executable, str(validate_script)], check=False)
    else:
        logger.warning("validate_models.py not found — skipping validation")


def main():
    parser = argparse.ArgumentParser(
        description="MediChain AI — Unified Model Training CLI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python scripts/train_all.py                       Train all 6 models
  python scripts/train_all.py --disease heart       Train only heart model
  python scripts/train_all.py --disease heart diabetes stroke
  python scripts/train_all.py --list                List available targets
  python scripts/train_all.py --validate            Validate after training
        """
    )
    parser.add_argument(
        "--disease", nargs="+",
        choices=AVAILABLE_DISEASES + ["all"],
        default=["all"],
        help="Disease model(s) to train (default: all)"
    )
    parser.add_argument(
        "--validate", action="store_true",
        help="Run validate_models.py smoke tests after training"
    )
    parser.add_argument(
        "--list", action="store_true",
        help="List available disease targets and exit"
    )
    parser.add_argument(
        "--data-dir", type=Path, default=None,
        help="Override path to CSV data directory"
    )
    parser.add_argument(
        "--model-dir", type=Path, default=None,
        help="Override path to model output directory"
    )
    args = parser.parse_args()

    if args.list:
        print("\nAvailable disease targets:")
        for d in AVAILABLE_DISEASES:
            print(f"  {d}")
        print("  all   (default — trains all of the above)")
        return

    from config import settings
    data_dir  = args.data_dir  or settings.DATA_DIR
    model_dir = args.model_dir or settings.MODEL_DIR

    diseases = AVAILABLE_DISEASES if "all" in args.disease else args.disease

    print("\n" + "=" * 70)
    print(" MediChain AI - Model Training ".center(70, "="))
    print("=" * 70)
    print(f"  Targets    : {', '.join(diseases)}")
    print(f"  Data dir   : {data_dir}")
    print(f"  Model dir  : {model_dir}")
    print("=" * 70 + "\n")

    results = train_all_cdss(diseases, data_dir, model_dir)

    # Print results table
    import pandas as pd
    if results:
        rows = [
            {"disease": d, "algorithm": r.get("algorithm"), "auc": r.get("auc"), "f1": r.get("f1")}
            for d, r in results.items()
        ]
        print("\n" + "=" * 70)
        print(" Training Results ".center(70, "="))
        print("=" * 70)
        print(pd.DataFrame(rows).to_string(index=False))
        print("=" * 70)

    # Update version manifest
    update_manifest(results)

    if args.validate:
        run_validation()

    print(f"\n[DONE] Models saved to: {model_dir}")
    print("   Start AI service: python app.py\n")


if __name__ == "__main__":
    main()
