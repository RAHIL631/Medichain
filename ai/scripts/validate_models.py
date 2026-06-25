# ai/scripts/validate_models.py
# MediChain AI — Model Validation & Smoke Test Script
#
# Loads every model from the registry and runs a minimal prediction
# with synthetic patient data to verify each model works end-to-end.
#
# Usage (from ai/ directory):
#   python scripts/validate_models.py
#   python scripts/validate_models.py --disease heart  # test specific disease
#   python scripts/validate_models.py --verbose        # show prediction values
#
# Exit codes:
#   0 — all tests passed
#   1 — one or more tests failed

import sys
import argparse
import logging
from pathlib import Path

# Ensure ai/ is importable
_AI_DIR = Path(__file__).parent.parent
if str(_AI_DIR) not in sys.path:
    sys.path.insert(0, str(_AI_DIR))

logging.basicConfig(
    level=logging.WARNING,  # suppress INFO from model loading during validation
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)

# ── Synthetic test patient (known-valid input for all models) ─────────────────
TEST_PATIENT = {
    "age":              55,
    "gender":           "M",
    "bloodPressure":    130,
    "cholesterol":      210,
    "glucose":          105,
    "bmi":              27.5,
    "smoking":          False,
    "kidney_gfr":       75.0,
    "creatinine":       1.1,
    "liver_score":      1,
    "alcohol_use":      False,
    "pregnancies":      0,
    "chronicConditions": [],
}

TEST_MEDICATIONS = ["Warfarin", "Aspirin"]


class TestResult:
    def __init__(self, name: str):
        self.name = name
        self.passed = False
        self.message = ""
        self.value = None

    def ok(self, value=None, msg=""):
        self.passed = True
        self.value = value
        self.message = msg
        return self

    def fail(self, msg: str):
        self.passed = False
        self.message = msg
        return self

    def __str__(self):
        status = "PASS" if self.passed else "FAIL"
        val_str = f"  [{self.value}]" if self.value is not None else ""
        msg_str = f"  - {self.message}" if self.message else ""
        return f"  [{status}]  {self.name:<40}{val_str}{msg_str}"


def test_model_loading(diseases: list, verbose: bool) -> list:
    """Test 1: Verify every disease model loads cleanly."""
    results = []
    from models_registry import registry
    registry.load_all()

    for disease in diseases:
        r = TestResult(f"model_load:{disease}")
        model = registry.get_model(disease)
        scaler = registry.get_scaler(disease)
        if model and scaler:
            r.ok(value=type(model).__name__)
        else:
            r.fail(f"model={model is not None}, scaler={scaler is not None}")
        results.append(r)

    return results


def test_legacy_prediction(verbose: bool) -> TestResult:
    """Test 2: POST /predict logic via prediction_service."""
    r = TestResult("service:predict_legacy")
    try:
        from services.prediction_service import predict_legacy
        result = predict_legacy(TEST_PATIENT)
        overall = result.get("overallRisk")
        assert overall in ("LOW", "MEDIUM", "HIGH", "UNKNOWN"), f"Unexpected risk level: {overall}"
        r.ok(value=f"overallRisk={overall}")
    except Exception as e:
        r.fail(str(e))
    return r


def test_full_disease_prediction(verbose: bool) -> TestResult:
    """Test 3: Full 5-disease prediction via cdss/disease_predictor."""
    r = TestResult("service:predict_all_diseases")
    try:
        from cdss.disease_predictor import predict_all_diseases
        result = predict_all_diseases(TEST_PATIENT)
        preds = result.get("predictions", [])
        assert len(preds) == 5, f"Expected 5 predictions, got {len(preds)}"
        r.ok(value=f"{len(preds)} diseases | overall={result.get('overall_risk')}")
    except Exception as e:
        r.fail(str(e))
    return r


def test_drug_interaction(verbose: bool) -> TestResult:
    """Test 4: Drug interaction check for Warfarin + Aspirin (known HIGH)."""
    r = TestResult("service:check_drugs (Warfarin+Aspirin)")
    try:
        from services.drug_service import check_drugs
        result = check_drugs(["Aspirin"], ["Warfarin"])
        has_conflicts = result.get("hasConflicts")
        r.ok(value=f"hasConflicts={has_conflicts}")
    except Exception as e:
        r.fail(str(e))
    return r


def test_interaction_analysis(verbose: bool) -> TestResult:
    """Test 5: Pairwise interaction analysis via interaction engine."""
    r = TestResult("service:analyze_interactions")
    try:
        from services.drug_service import analyze_interactions
        result = analyze_interactions(TEST_MEDICATIONS)
        pairs = result.get("checked_pairs", 0)
        r.ok(value=f"checked_pairs={pairs}")
    except Exception as e:
        r.fail(str(e))
    return r


def test_risk_scorer(verbose: bool) -> TestResult:
    """Test 6: Health risk scoring (5-organ profile)."""
    r = TestResult("service:compute_health_risks")
    try:
        from cdss.risk_scorer import compute_health_risks
        result = compute_health_risks(TEST_PATIENT)
        organs = result.get("organ_risks", {})
        r.ok(value=f"{len(organs)} organs | overall={result.get('overall_risk')}")
    except Exception as e:
        r.fail(str(e))
    return r


def test_health_endpoint_logic(verbose: bool) -> TestResult:
    """Test 7: Registry summary (what /health would return)."""
    r = TestResult("registry:summary")
    try:
        from models_registry import registry
        summary = registry.summary()
        loaded = summary.get("total_loaded", 0)
        r.ok(value=f"loaded={loaded} models")
    except Exception as e:
        r.fail(str(e))
    return r


def main():
    parser = argparse.ArgumentParser(
        description="MediChain AI — Model Validation & Smoke Tests"
    )
    parser.add_argument(
        "--disease", nargs="+",
        choices=["heart", "diabetes", "stroke", "kidney", "liver", "adherence", "all"],
        default=["all"],
        help="Diseases to test (default: all)"
    )
    parser.add_argument("--verbose", action="store_true", help="Show prediction values")
    args = parser.parse_args()

    ALL_DISEASES = ["heart", "diabetes", "stroke", "kidney", "liver", "adherence"]
    diseases = ALL_DISEASES if "all" in args.disease else args.disease

    print("\n" + "=" * 65)
    print(" MediChain AI - Model Validation ".center(65, "="))
    print("=" * 65)

    all_results = []

    # Run all tests
    all_results.extend(test_model_loading(diseases, args.verbose))
    all_results.append(test_legacy_prediction(args.verbose))
    all_results.append(test_full_disease_prediction(args.verbose))
    all_results.append(test_drug_interaction(args.verbose))
    all_results.append(test_interaction_analysis(args.verbose))
    all_results.append(test_risk_scorer(args.verbose))
    all_results.append(test_health_endpoint_logic(args.verbose))

    # Print results
    print()
    for r in all_results:
        print(str(r))

    passed = sum(1 for r in all_results if r.passed)
    failed = len(all_results) - passed
    print()
    print("=" * 65)
    print(f"  Results: {passed} passed, {failed} failed out of {len(all_results)} tests")
    print("=" * 65 + "\n")

    sys.exit(0 if failed == 0 else 1)


if __name__ == "__main__":
    main()
