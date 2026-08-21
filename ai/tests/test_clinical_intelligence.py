# ai/tests/test_clinical_intelligence.py
# Unit tests for Clinical Intelligence Engine blueprint endpoints.

import unittest
import sys
from pathlib import Path

# Add ai/ to python path
AI_DIR = Path(__file__).parent.parent
if str(AI_DIR) not in sys.path:
    sys.path.insert(0, str(AI_DIR))

from app import create_app


class TestClinicalIntelligence(unittest.TestCase):
    def setUp(self):
        self.app = create_app({"TESTING": True})
        self.client = self.app.test_client()

    def test_clinical_intelligence_endpoint(self):
        payload = {
            "age": 55,
            "gender": "M",
            "symptoms": ["chest_pain", "shortness_of_breath"],
            "vitals": {"systolic_bp": 145, "cholesterol": 230, "bmi": 28},
            "medicalHistory": ["hypertension"],
            "currentMedications": ["lisinopril"],
            "emergencyLevel": "routine",
        }
        res = self.client.post("/cdss/clinical-intelligence", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()

        self.assertIn("diseaseRisks", data)
        self.assertIn("emergencyRisk", data)
        self.assertIn("specialistRecommendations", data)
        self.assertIn("healthSummary", data)
        self.assertIn("confidence", data)

        # Emergency score check
        self.assertGreaterEqual(data["emergencyRisk"]["score"], 0)
        self.assertLessEqual(data["emergencyRisk"]["score"], 100)

    def test_health_assistant_explain_disease(self):
        payload = {"disease": "diabetes"}
        res = self.client.post("/cdss/assistant/explain-disease", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["found"])
        self.assertEqual(data["disease"], "Diabetes")


if __name__ == "__main__":
    unittest.main()
