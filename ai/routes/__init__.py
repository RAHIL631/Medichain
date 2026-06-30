# ai/routes/__init__.py
# MediChain AI — Route Registration
# Central function to register all Flask blueprints with the application.

import logging

logger = logging.getLogger("medichain.routes")


def register_routes(app):
    """
    Register all route blueprints with the Flask app instance.
    Called once from the create_app() factory.
    """
    # ── Internal routes (health, version, readiness) ──────────────────────────
    from .health import health_bp
    app.register_blueprint(health_bp)

    # ── Legacy endpoints (backward-compatible) ────────────────────────────────
    from .predict import predict_bp
    from .drug_check import drug_check_bp
    app.register_blueprint(predict_bp)
    app.register_blueprint(drug_check_bp)

    # ── CDSS unified analyze endpoint ─────────────────────────────────────────
    from .cdss_routes import cdss_main_bp
    app.register_blueprint(cdss_main_bp)

    # ── Dosage Safety ML prediction endpoints ─────────────────────────────────
    try:
        from .dosage_safety_route import dosage_safety_bp
        app.register_blueprint(dosage_safety_bp)
        logger.info("✅ Dosage safety ML blueprint registered")
    except Exception as e:
        logger.warning(f"⚠️  Dosage safety blueprint failed to load: {e}")

    # ── CDSS sub-module blueprints ────────────────────────────────────────────
    try:
        from cdss import (
            interaction_bp, dosage_bp, scorer_bp,
            predictor_bp, risk_bp, adherence_bp, ocr_bp
        )
        from cdss.explainer import explainer_bp

        app.register_blueprint(interaction_bp)
        app.register_blueprint(dosage_bp)
        app.register_blueprint(scorer_bp)
        app.register_blueprint(predictor_bp)
        app.register_blueprint(risk_bp)
        app.register_blueprint(adherence_bp)
        app.register_blueprint(ocr_bp)
        app.register_blueprint(explainer_bp)

        app.config["CDSS_LOADED"] = True
        logger.info("✅ All CDSS sub-blueprints registered")

    except Exception as e:
        app.config["CDSS_LOADED"] = False
        logger.warning(f"⚠️  CDSS sub-blueprints failed to load: {e}")
        logger.warning("   Run: pip install -r requirements.txt")

    # ── Prescription Validation Pipeline ─────────────────────────────────────
    try:
        from .validator import validator_bp
        app.register_blueprint(validator_bp)
        logger.info("✅ Prescription validator blueprint registered")
    except Exception as e:
        logger.warning(f"⚠️  Prescription validator blueprint failed to load: {e}")

    # ── Multi-model Ensemble Predictor ───────────────────────────────────────
    try:
        from .ensemble_routes import ensemble_bp
        app.register_blueprint(ensemble_bp)
        logger.info("✅ Ensemble predict blueprint registered")
    except Exception as e:
        logger.warning(f"⚠️  Ensemble predict blueprint failed to load: {e}")

    # ── AI Medication Adherence Predictor ────────────────────────────────────
    try:
        from .adherence_sys_routes import adherence_sys_bp
        app.register_blueprint(adherence_sys_bp)
        logger.info("✅ Adherence system blueprint registered")
    except Exception as e:
        logger.warning(f"⚠️  Adherence system blueprint failed to load: {e}")

    # ── Patient Digital Twin ─────────────────────────────────────────────────
    try:
        from .digital_twin_routes import twin_bp
        app.register_blueprint(twin_bp)
        logger.info("✅ Patient digital twin blueprint registered")
    except Exception as e:
        logger.warning(f"⚠️  Patient digital twin blueprint failed to load: {e}")

    logger.info("✅ All routes registered successfully")
