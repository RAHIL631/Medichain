# ai/core/middleware.py
# MediChain AI — Request/Response Middleware
#
# Applied to every request via Flask before/after hooks:
#
#   before_request:
#     - Generates a UUID correlation ID (X-Request-ID)
#     - Records request start time
#     - Logs incoming method + path
#
#   after_request:
#     - Calculates and logs response time
#     - Attaches X-Request-ID and X-Response-Time-ms headers to response

import time
import uuid
import logging
from flask import request, g

from core.logging_config import set_request_id, get_request_id

logger = logging.getLogger("medichain.middleware")


def register_middleware(app) -> None:
    """Attach before/after request hooks to the Flask app."""

    @app.before_request
    def before_request():
        # Use incoming X-Request-ID if provided (e.g. from API gateway), else generate new
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        g.request_id = request_id
        g.start_time = time.perf_counter()

        # Make the request_id available to the logging system
        set_request_id(request_id)

        logger.debug(
            f"→ {request.method} {request.path}",
            extra={"method": request.method, "path": request.path}
        )

    @app.after_request
    def after_request(response):
        elapsed_ms = round((time.perf_counter() - g.get("start_time", time.perf_counter())) * 1000, 2)
        request_id = g.get("request_id", get_request_id())

        # Attach correlation and timing headers
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Response-Time-ms"] = str(elapsed_ms)
        response.headers["X-Service"] = "medichain-ai"

        status = response.status_code
        log_fn = logger.warning if status >= 400 else logger.info
        log_fn(
            f"← {request.method} {request.path} {status} ({elapsed_ms}ms)",
            extra={
                "method": request.method,
                "path": request.path,
                "status": status,
                "duration_ms": elapsed_ms,
            }
        )

        # Reset correlation ID for next request (safety on threaded servers)
        set_request_id("-")
        return response

    logger.debug("Request middleware registered")
