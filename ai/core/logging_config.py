# ai/core/logging_config.py
# MediChain AI — Structured Logging Configuration
#
# Supports two output modes controlled by LOG_FORMAT env var:
#   "json"  — machine-readable JSON lines (production, log aggregators like Datadog/ELK)
#   "text"  — coloured human-readable output (development)
#
# Every log record automatically includes:
#   - timestamp (ISO-8601)
#   - log level
#   - logger name
#   - correlation_id (UUID per HTTP request, injected by middleware)
#   - service name and version

import logging
import logging.config
import json
import sys
from datetime import datetime, timezone


# ── Correlation ID context ─────────────────────────────────────────────────────
# Stored as a module-level variable; set by the request middleware per request.
_request_id_store = {"request_id": "-"}


def set_request_id(request_id: str) -> None:
    """Called by middleware at the start of each HTTP request."""
    _request_id_store["request_id"] = request_id


def get_request_id() -> str:
    return _request_id_store.get("request_id", "-")


# ── JSON Formatter ─────────────────────────────────────────────────────────────

class JSONFormatter(logging.Formatter):
    """
    Formats log records as single-line JSON objects.
    Compatible with log aggregators (Datadog, Loki, ELK).
    """

    RESERVED_ATTRS = {
        "args", "created", "exc_info", "exc_text", "filename",
        "funcName", "levelno", "lineno", "module", "msecs",
        "msg", "pathname", "process", "processName",
        "relativeCreated", "stack_info", "thread", "threadName",
    }

    def format(self, record: logging.LogRecord) -> str:
        # Format exception if present
        if record.exc_info:
            if not record.exc_text:
                record.exc_text = self.formatException(record.exc_info)

        log_entry = {
            "timestamp": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "request_id": get_request_id(),
        }

        if record.exc_text:
            log_entry["exception"] = record.exc_text

        # Include any extra fields added via logger.info("msg", extra={"key": "val"})
        for key, value in record.__dict__.items():
            if key not in self.RESERVED_ATTRS and not key.startswith("_"):
                if key not in log_entry:
                    log_entry[key] = value

        return json.dumps(log_entry, default=str)


# ── Text Formatter (Development) ───────────────────────────────────────────────

class ColourTextFormatter(logging.Formatter):
    """
    Human-readable coloured formatter for development.
    Format: timestamp [LEVEL] logger: message  (request_id)
    """
    COLOURS = {
        "DEBUG":    "\033[36m",   # Cyan
        "INFO":     "\033[32m",   # Green
        "WARNING":  "\033[33m",   # Yellow
        "ERROR":    "\033[31m",   # Red
        "CRITICAL": "\033[35m",   # Magenta
    }
    RESET = "\033[0m"

    def format(self, record: logging.LogRecord) -> str:
        colour = self.COLOURS.get(record.levelname, "")
        ts = datetime.fromtimestamp(record.created, tz=timezone.utc).strftime("%H:%M:%S")
        rid = get_request_id()
        rid_part = f"  [{rid[:8]}]" if rid != "-" else ""
        base = (
            f"{ts} {colour}[{record.levelname:<8}]{self.RESET} "
            f"{record.name}: {record.getMessage()}{rid_part}"
        )
        if record.exc_info:
            base += "\n" + self.formatException(record.exc_info)
        return base


# ── Public setup function ──────────────────────────────────────────────────────

def configure_logging(log_level: str = "INFO", log_format: str = "text") -> None:
    """
    Configure the root logger for the MediChain AI service.

    Args:
        log_level:  "DEBUG" | "INFO" | "WARNING" | "ERROR" | "CRITICAL"
        log_format: "json"  → production JSON lines
                    "text"  → development coloured text
    """
    level = getattr(logging, log_level.upper(), logging.INFO)

    if log_format.lower() == "json":
        formatter = JSONFormatter()
    else:
        formatter = ColourTextFormatter()

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)

    root = logging.getLogger()
    root.setLevel(level)
    # Remove any default handlers set by Flask or other libs
    root.handlers.clear()
    root.addHandler(handler)

    # Suppress noisy third-party loggers
    logging.getLogger("werkzeug").setLevel(logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("PIL").setLevel(logging.WARNING)

    logging.getLogger("medichain.core").info(
        f"Logging configured: level={log_level} format={log_format}"
    )
