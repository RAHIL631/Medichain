# ai/core/error_handlers.py
# MediChain AI — Global Flask Error Handlers
#
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
from typing import Optional

from flask import Response, current_app, g, jsonify
from werkzeug.exceptions import HTTPException

from core.logging_config import get_request_id

logger = logging.getLogger("medichain.errors")

_HTTP_ERROR_MESSAGES = {
    400: "Bad request — check your input payload.",
    404: "Endpoint not found.",
    405: "HTTP method not allowed on this endpoint.",
    422: "Unprocessable entity — validation failed.",
    429: "Too many requests — please slow down.",
    500: "Internal server error.",
    503: "Service temporarily unavailable.",
}


def _error_response(
    message: str,
    code: int,
    details: Optional[str] = None,
    response: Optional[Response] = None,
) -> Response:
    body = {
        "error": message,
        "code": code,
        "request_id": g.get("request_id", get_request_id()),
    }
    if details and current_app.config.get("DEBUG"):
        body["details"] = details

    if response is None:
        response = jsonify(body)
    else:
        response.set_data(jsonify(body).get_data())
        response.content_type = "application/json"

    response.status_code = code
    return response


def register_error_handlers(app) -> None:
    """Attach all global error handlers to the Flask app."""

    @app.errorhandler(HTTPException)
    def handle_http_exception(e):
        code = e.code or 500
        message = _HTTP_ERROR_MESSAGES.get(code, e.description)
        if code >= 500:
            logger.error("HTTP %s error: %s", code, e.description)
        else:
            logger.warning("HTTP %s request error", code)

        return _error_response(
            message,
            code,
            str(e),
            response=e.get_response(),
        )

    @app.errorhandler(Exception)
    def handle_unexpected(e):
        tb = traceback.format_exc()
        logger.exception("Unhandled AI service exception")
        return _error_response(
            "An unexpected error occurred. Our team has been notified.",
            500,
            tb,
        )

    logger.debug("Error handlers registered")
