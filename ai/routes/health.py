# ai/routes/health.py
# MediChain AI — Health, Readiness & Version Endpoints
#
# Endpoints:
#   GET /health      — liveness probe (always 200 if service is running)
#   GET /readiness   — readiness probe (200 only when all models are loaded)
#   GET /version     — lists all loaded model versions from the registry manifest

import logging
from flask import Blueprint, jsonify, current_app

logger = logging.getLogger("medichain.routes.health")

health_bp = Blueprint("health", __name__)


@health_bp.route("/health", methods=["GET"])
def liveness():
    """
    GET /health
    Liveness probe — confirms the service process is alive.
    Always returns 200 as long as Flask is running.
    Used by Docker HEALTHCHECK and load balancers.
    """
    from models_registry import registry
    from config import settings

    return jsonify({
        "status": "ok",
        "service": settings.SERVICE_NAME,
        "version": settings.SERVICE_VERSION,
        "modelsLoaded": registry.is_loaded(),
        "cdssLoaded": current_app.config.get("CDSS_LOADED", False),
        "active_models": registry.loaded_diseases(),
        "endpoints": {
            "legacy": ["/predict", "/check-drugs"],
            "cdss": [
                "/cdss/analyze",
                "/cdss/interactions",
                "/cdss/dosage",
                "/cdss/score",
                "/cdss/predict-diseases",
                "/cdss/risks",
                "/cdss/adherence",
                "/cdss/ocr-extract",
                "/cdss/explain",
            ],
            "ops": ["/health", "/readiness", "/version"],
        },
    }), 200


@health_bp.route("/readiness", methods=["GET"])
def readiness():
    """
    GET /readiness
    Readiness probe — returns 200 only when models are loaded and CDSS is available.
    Kubernetes/Docker Compose uses this to determine when to send traffic.
    """
    from models_registry import registry

    models_ok = registry.is_loaded()
    cdss_ok = current_app.config.get("CDSS_LOADED", False)
    ready = models_ok  # CDSS is optional; base models are required

    status_code = 200 if ready else 503
    return jsonify({
        "ready": ready,
        "checks": {
            "models_loaded": models_ok,
            "cdss_loaded": cdss_ok,
            "loaded_diseases": registry.loaded_diseases(),
        },
        "message": "Service ready" if ready else "Models not yet loaded",
    }), status_code


@health_bp.route("/version", methods=["GET"])
def version():
    """
    GET /version
    Returns full model version manifest — algorithm, AUC, F1, training date per model.
    Useful for auditing which model versions are serving predictions.
    """
    from models_registry import registry
    from config import settings

    return jsonify({
        "service": settings.SERVICE_NAME,
        "service_version": settings.SERVICE_VERSION,
        "registry_summary": registry.summary(),
        "model_versions": registry.get_version_info(),
    }), 200
