# ai/tests/test_predictive_analytics.py
# Unit tests for Predictive Analytics module.

import unittest
import sys
from pathlib import Path

AI_DIR = Path(__file__).parent.parent
if str(AI_DIR) not in sys.path:
    sys.path.insert(0, str(AI_DIR))

from app import create_app


class TestPredictiveAnalytics(unittest.TestCase):
    def setUp(self):
        self.app = create_app({"TESTING": True})
        self.client = self.app.test_client()

    def test_predictive_analytics_endpoint(self):
        payload = {
            "age": 68,
            "gender": "M",
            "conditions": ["heart_disease", "diabetes"],
            "medications": ["metformin", "lisinopril"],
            "adherenceScore": 75,
            "recentHospitalizations": 1,
            "exerciseFrequency": "low",
        }
        res = self.client.post("/cdss/predictive-analytics", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()

        self.assertIn("predictions", data)
        preds = data["predictions"]

        self.assertIn("readmission30Day", preds)
        self.assertIn("mortalityRisk", preds)
        self.assertIn("emergencyRisk90Day", preds)
        self.assertIn("treatmentSuccess", preds)
        self.assertIn("expectedLOS", preds)
        self.assertIn("diseaseProgression", preds)

        self.assertGreaterEqual(preds["readmission30Day"]["probability"], 0)
        self.assertLessEqual(preds["readmission30Day"]["probability"], 100)


if __name__ == "__main__":
    unittest.main()
