# ai/app.py
# MediChain AI Microservice — Application Factory v3.0
#
# Architecture:
#   create_app()  → Flask application factory (used by gunicorn in production)
#   main block    → dev server launcher
#
# All business logic has been extracted to:
#   config/         — environment-driven settings
#   core/           — logging, error handling, middleware
#   models_registry/— versioned model loading
#   services/       — pure Python business logic
#   routes/         — thin Flask handlers
#
# Existing endpoints PRESERVED for full backward compatibility:
#   POST /predict
#   POST /check-drugs
#   POST /cdss/analyze
#   POST /cdss/interactions  (cdss/interaction_engine.py blueprint)
#   POST /cdss/dosage        (cdss/dosage_checker.py blueprint)
#   POST /cdss/score         (cdss/prescription_scorer.py blueprint)
#   POST /cdss/predict-diseases (cdss/disease_predictor.py blueprint)
#   POST /cdss/risks         (cdss/risk_scorer.py blueprint)
#   POST /cdss/adherence     (cdss/adherence_predictor.py blueprint)
#   POST /cdss/ocr-extract   (cdss/ocr_extractor.py blueprint)
#   POST /cdss/explain       (cdss/explainer.py blueprint)
#   GET  /health
#   GET  /readiness          ← NEW
#   GET  /version            ← NEW
#   POST /cdss/reload-model  ← NEW

import os
import sys
import logging
from pathlib import Path

# ── Ensure ai/ is on the Python path (needed when run via gunicorn from parent dir)
_AI_DIR = Path(__file__).parent
if str(_AI_DIR) not in sys.path:
    sys.path.insert(0, str(_AI_DIR))

from flask import Flask
from flask_cors import CORS

from config import settings
from core.logging_config import configure_logging
from core.error_handlers import register_error_handlers
from core.middleware import register_middleware
from routes import register_routes


def create_app(config_overrides: dict = None) -> Flask:
    """
    Flask application factory.

    Creates and fully configures a Flask app instance.
    Called by gunicorn via: gunicorn "app:create_app()"
    Also called directly in tests: app = create_app({"TESTING": True})

    Args:
        config_overrides: Optional dict of Flask config values to override.

    Returns:
        Configured Flask app instance.
    """
    # ── Logging (must be first so all subsequent init is logged) ───────────────
    configure_logging(
        log_level=settings.LOG_LEVEL,
        log_format=settings.LOG_FORMAT,
    )
    logger = logging.getLogger("medichain.app")
    logger.info(f"🚀 MediChain AI Microservice v{settings.SERVICE_VERSION} starting...")
    logger.info(f"   Environment : {settings.ENV}")
    logger.info(f"   Log format  : {settings.LOG_FORMAT}")
    logger.info(f"   Model dir   : {settings.MODEL_DIR}")

    # ── Flask app ──────────────────────────────────────────────────────────────
    app = Flask(__name__)
    app.config["DEBUG"] = settings.DEBUG
    app.config["ENV"] = settings.ENV
    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "medichain-ai-dev-key")

    if config_overrides:
        app.config.update(config_overrides)

    # ── CORS ───────────────────────────────────────────────────────────────────
    CORS(app, origins=settings.CORS_ORIGINS)
    logger.info(f"   CORS origins: {settings.CORS_ORIGINS}")

    # ── Core: middleware, error handlers ───────────────────────────────────────
    register_middleware(app)
    register_error_handlers(app)

    # ── Model Registry: load all models at startup ─────────────────────────────
    from models_registry import registry
    registry.load_all()
    app.config["MODELS_LOADED"] = registry.is_loaded()
    logger.info(f"   Models ready: {registry.loaded_diseases()}")

    # ── Routes: register all blueprints ───────────────────────────────────────
    register_routes(app)

    logger.info("✅ MediChain AI app factory complete — ready to serve requests")
    return app


# ── Development server entry point ────────────────────────────────────────────

if __name__ == "__main__":
    app = create_app()
    port = settings.PORT
    logger._log = logging.getLogger("medichain.app")
    logging.getLogger("medichain.app").info(
        f"🌐 Dev server: http://{settings.HOST}:{port}"
    )
    app.run(host=settings.HOST, port=port, debug=settings.DEBUG)
