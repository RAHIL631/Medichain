import sys
import unittest
from pathlib import Path

from flask import Flask
from werkzeug.exceptions import TooManyRequests

AI_DIR = Path(__file__).resolve().parents[1]
if str(AI_DIR) not in sys.path:
    sys.path.insert(0, str(AI_DIR))

from core.error_handlers import register_error_handlers
from core.middleware import register_middleware


class TestErrorHandlers(unittest.TestCase):
    def setUp(self):
        self.app = Flask(__name__)
        self.app.config.update(TESTING=False, PROPAGATE_EXCEPTIONS=False)
        register_middleware(self.app)
        register_error_handlers(self.app)

        @self.app.get("/resource")
        def resource():
            return "ok"

        @self.app.get("/limited")
        def limited():
            raise TooManyRequests(retry_after=30)

        @self.app.get("/broken")
        def broken():
            raise RuntimeError("internal implementation detail")

        self.client = self.app.test_client()

    def test_method_not_allowed_preserves_allow_header_and_json_envelope(self):
        response = self.client.post("/resource", headers={"X-Request-ID": "request-123"})

        self.assertEqual(response.status_code, 405)
        self.assertIn("GET", response.headers["Allow"])
        self.assertEqual(response.headers["X-Request-ID"], "request-123")
        self.assertEqual(response.content_type, "application/json")
        self.assertEqual(response.get_json()["request_id"], "request-123")

    def test_rate_limit_preserves_retry_after_header(self):
        response = self.client.get("/limited")

        self.assertEqual(response.status_code, 429)
        self.assertEqual(response.headers["Retry-After"], "30")
        self.assertEqual(response.get_json()["error"], "Too many requests — please slow down.")

    def test_unexpected_error_does_not_expose_details_when_debug_is_disabled(self):
        response = self.client.get("/broken")

        self.assertEqual(response.status_code, 500)
        self.assertNotIn("details", response.get_json())
        self.assertNotIn("internal implementation detail", response.get_data(as_text=True))

    def test_unexpected_error_includes_diagnostics_only_in_debug(self):
        self.app.config["DEBUG"] = True

        response = self.client.get("/broken")

        self.assertEqual(response.status_code, 500)
        self.assertIn("internal implementation detail", response.get_json()["details"])


if __name__ == "__main__":
    unittest.main()
