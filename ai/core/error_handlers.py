# ai/core/error_handlers.py
# MediChain AI — Global Flask Error Handlers
#
# Registers handlers for all standard HTTP error codes plus any unhandled exceptions.
# Every error response follows the same JSON envelope:
#
#   {
#     "error":      "<short message>",
#     "code":       <http_status_int>,
#     "request_id": "<uuid>",
#     "details":    "<optional extra info>"   ← only in DEBUG mode
#   }

import logging
import traceback
from flask import jsonify, current_app
from werkzeug.exceptions import HTTPException

from core.logging_config import get_request_id

logger = logging.getLogger("medichain.errors")


def _error_response(message: str, code: int, details: str = None):
    body = {
        "error": message,
        "code": code,
        "request_id": get_request_id(),
    }
    if details and current_app.config.get("DEBUG"):
        body["details"] = details
    return jsonify(body), code


def register_error_handlers(app) -> None:
    """Attach all global error handlers to the Flask app."""

    @app.errorhandler(400)
    def bad_request(e):
        logger.warning(f"400 Bad Request: {e}")
        return _error_response("Bad request — check your input payload.", 400, str(e))

    @app.errorhandler(404)
    def not_found(e):
        logger.warning(f"404 Not Found: {e}")
        return _error_response("Endpoint not found.", 404, str(e))

    @app.errorhandler(405)
    def method_not_allowed(e):
        logger.warning(f"405 Method Not Allowed: {e}")
        return _error_response("HTTP method not allowed on this endpoint.", 405, str(e))

    @app.errorhandler(422)
    def unprocessable(e):
        logger.warning(f"422 Unprocessable: {e}")
        return _error_response("Unprocessable entity — validation failed.", 422, str(e))

    @app.errorhandler(429)
    def rate_limited(e):
        logger.warning(f"429 Rate Limited: {e}")
        return _error_response("Too many requests — please slow down.", 429)

    @app.errorhandler(500)
    def internal_error(e):
        logger.error(f"500 Internal Server Error: {e}", exc_info=True)
        return _error_response("Internal server error.", 500, str(e))

    @app.errorhandler(503)
    def service_unavailable(e):
        logger.error(f"503 Service Unavailable: {e}")
        return _error_response("Service temporarily unavailable.", 503, str(e))

    @app.errorhandler(HTTPException)
    def handle_http_exception(e):
        logger.warning(f"HTTP {e.code}: {e.description}")
        return _error_response(e.description, e.code)

    @app.errorhandler(Exception)
    def handle_unexpected(e):
        tb = traceback.format_exc()
        logger.error(f"Unhandled exception: {e}\n{tb}")
        return _error_response(
            "An unexpected error occurred. Our team has been notified.",
            500,
            tb if current_app.config.get("DEBUG") else None
        )

    logger.debug("Error handlers registered")
