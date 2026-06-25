# ai/config/settings.py
# MediChain AI Microservice — Centralized Configuration
#
# All settings are read from environment variables (or a .env file via python-dotenv).
# Hardcoded defaults are safe for local development.
# In production, override via Docker ENV / Kubernetes ConfigMap / .env.

import os
from pathlib import Path

# Load .env file if python-dotenv is available (dev convenience)
try:
    from dotenv import load_dotenv
    _env_path = Path(__file__).parent.parent / ".env"
    if _env_path.exists():
        load_dotenv(dotenv_path=_env_path)
except ImportError:
    pass  # python-dotenv is optional — prod uses real env vars


class Settings:
    """
    Central settings object for the MediChain AI microservice.

    All attributes read from environment variables with sensible defaults.
    Import the singleton from config/__init__.py:

        from config import settings
        print(settings.PORT)
    """

    # ── Server ────────────────────────────────────────────────────────────────
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "5001"))
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    ENV: str = os.getenv("FLASK_ENV", "production")          # "development" | "production"

    # ── CORS ──────────────────────────────────────────────────────────────────
    # Comma-separated list of allowed origins
    CORS_ORIGINS: list = [
        o.strip()
        for o in os.getenv(
            "CORS_ORIGINS",
            "http://localhost:3000,http://localhost:3005,http://localhost:3006,http://localhost:5000"
        ).split(",")
        if o.strip()
    ]

    # ── Paths ─────────────────────────────────────────────────────────────────
    BASE_DIR: Path = Path(__file__).parent.parent
    MODEL_DIR: Path = Path(os.getenv("MODEL_DIR", str(Path(__file__).parent.parent / "models")))
    DATA_DIR: Path = Path(os.getenv("DATA_DIR", str(Path(__file__).parent.parent / "data")))
    VERSION_MANIFEST: Path = Path(os.getenv(
        "VERSION_MANIFEST",
        str(Path(__file__).parent.parent / "models_registry" / "version_manifest.json")
    ))

    # ── Logging ───────────────────────────────────────────────────────────────
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO").upper()
    # "json" for production (machine-readable), "text" for development (human-readable)
    LOG_FORMAT: str = os.getenv("LOG_FORMAT", "text")

    # ── Request / Timeout ─────────────────────────────────────────────────────
    REQUEST_TIMEOUT_SECONDS: int = int(os.getenv("REQUEST_TIMEOUT_SECONDS", "120"))

    # ── External APIs ─────────────────────────────────────────────────────────
    RXNORM_BASE_URL: str = os.getenv("RXNORM_BASE_URL", "https://rxnav.nlm.nih.gov/REST")
    RXNORM_TIMEOUT: int = int(os.getenv("RXNORM_TIMEOUT", "8"))

    # ── Model Loading ─────────────────────────────────────────────────────────
    # Comma-separated list of disease names to load at startup
    ENABLED_DISEASES: list = [
        d.strip()
        for d in os.getenv(
            "ENABLED_DISEASES",
            "heart,diabetes,stroke,kidney,liver,adherence"
        ).split(",")
        if d.strip()
    ]
    # Whether to fail-fast (True) or warn-and-continue (False) if models are missing
    STRICT_MODEL_LOADING: bool = os.getenv("STRICT_MODEL_LOADING", "false").lower() == "true"

    # ── Service Metadata ──────────────────────────────────────────────────────
    SERVICE_NAME: str = os.getenv("SERVICE_NAME", "medichain-ai")
    SERVICE_VERSION: str = os.getenv("SERVICE_VERSION", "3.0.0")

    def __repr__(self) -> str:
        return (
            f"<Settings env={self.ENV} port={self.PORT} "
            f"log_level={self.LOG_LEVEL} log_format={self.LOG_FORMAT}>"
        )
