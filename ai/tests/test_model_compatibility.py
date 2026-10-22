import warnings
from pathlib import Path
import unittest

import joblib
from sklearn.exceptions import InconsistentVersionWarning


MODEL_DIR = Path(__file__).resolve().parents[1] / "models"


class TestModelCompatibility(unittest.TestCase):
    def test_checked_in_models_match_runtime_scikit_learn_version(self):
        incompatible_models = []

        for model_path in sorted(MODEL_DIR.glob("*.pkl")):
            with warnings.catch_warnings(record=True) as caught:
                warnings.simplefilter("always", InconsistentVersionWarning)
                joblib.load(model_path)

            if any(
                isinstance(item.message, InconsistentVersionWarning)
                for item in caught
            ):
                incompatible_models.append(model_path.name)

        self.assertFalse(
            incompatible_models,
            "Model artifacts were serialized with a different scikit-learn "
            "version: " + ", ".join(incompatible_models),
        )
