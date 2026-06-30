# ai/models_registry/model_loader.py
# MediChain AI — Versioned Model Registry
#
# Provides a single ModelRegistry class that:
#   - Scans ai/models/ and loads all .pkl files (XGBoost-first, sklearn fallback)
#   - Maintains version metadata in version_manifest.json
#   - Exposes thread-safe getters for models and scalers
#   - Supports hot-reloading a single model without service restart
#
# Usage:
#   from models_registry import registry
#   model = registry.get_model("heart")
#   scaler = registry.get_scaler("diabetes")
#   info = registry.get_version_info()

import json
import logging
import threading
from datetime import datetime, timezone
from pathlib import Path

import joblib

logger = logging.getLogger("medichain.registry")


class ModelRegistry:
    """
    Central, thread-safe registry for all MediChain ML models.

    Model naming convention in ai/models/:
      xgb_{disease}_model.pkl   — XGBoost model  (preferred)
      xgb_{disease}_scaler.pkl  — associated scaler
      {disease}_model.pkl       — sklearn fallback model
      {disease}_scaler.pkl      — sklearn fallback scaler
    """

    DISEASES = ["heart", "diabetes", "stroke", "kidney", "liver", "cancer", "adherence"]

    # Dosage safety model keys (stored separately from disease models)
    DOSAGE_MODELS = [
        "dosage_safety_rf",
        "dosage_safety_gb",
        "dosage_safety_xgb",
        "dosage_toxicity",
        "dosage_emergency",
    ]

    def __init__(self, model_dir: Path = None, manifest_path: Path = None):
        from config import settings

        self._model_dir = model_dir or settings.MODEL_DIR
        self._manifest_path = manifest_path or settings.VERSION_MANIFEST
        self._lock = threading.RLock()

        # Internal storage: {disease_name: model_object}
        self._models: dict = {}
        self._scalers: dict = {}
        self._version_info: dict = {}
        self._loaded = False

        # Dosage safety model storage
        self._dosage_models: dict = {}
        self._dosage_scaler = None

    # ── Public API ─────────────────────────────────────────────────────────────

    def load_all(self) -> None:
        """Load all models from MODEL_DIR. Called once at application startup."""
        with self._lock:
            logger.info(f"🔍 Loading models from {self._model_dir}")
            self._models.clear()
            self._scalers.clear()
            self._version_info.clear()

            manifest = self._load_manifest()
            loaded_count = 0

            for disease in self.DISEASES:
                m, s, tag = self._load_disease(disease)
                if m:
                    self._models[disease] = m
                    self._scalers[disease] = s
                    self._version_info[disease] = self._build_version_entry(disease, tag, manifest)
                    loaded_count += 1

            # Preserve any manifest entries for models that couldn't be loaded
            for key, val in manifest.items():
                if key not in self._version_info:
                    self._version_info[key] = val

            self._loaded = True
            logger.info(f"✅ ModelRegistry: {loaded_count}/{len(self.DISEASES)} diseases loaded")

            # Also load dosage safety models
            self._load_dosage_models()

    def get_model(self, name: str):
        """Return the best available model for a disease, or None."""
        with self._lock:
            return self._models.get(name)

    def get_scaler(self, name: str):
        """Return the scaler for a disease, or None."""
        with self._lock:
            return self._scalers.get(name)

    def get_all_models(self) -> dict:
        """Return a shallow copy of the models dict."""
        with self._lock:
            return dict(self._models)

    def get_all_scalers(self) -> dict:
        """Return a shallow copy of the scalers dict."""
        with self._lock:
            return dict(self._scalers)

    def is_loaded(self) -> bool:
        return self._loaded and bool(self._models)

    def loaded_diseases(self) -> list:
        """Return list of disease names that have a model loaded."""
        with self._lock:
            return list(self._models.keys())

    def get_version_info(self) -> dict:
        """Return the full version metadata dict."""
        with self._lock:
            return dict(self._version_info)

    def reload(self, disease: str) -> bool:
        """
        Hot-reload a single disease model without restarting the service.
        Returns True on success, False on failure.
        """
        with self._lock:
            logger.info(f"🔄 Hot-reloading model: {disease}")
            m, s, tag = self._load_disease(disease)
            if m:
                self._models[disease] = m
                self._scalers[disease] = s
                manifest = self._load_manifest()
                self._version_info[disease] = self._build_version_entry(disease, tag, manifest)
                logger.info(f"✅ Hot-reload complete: {disease}")
                return True
            logger.warning(f"⚠️  Hot-reload failed: no model found for {disease}")
            return False

    def get_dosage_model(self, name: str):
        """Return a dosage safety model by its short name (e.g. 'rf', 'gb', 'xgb')."""
        with self._lock:
            return self._dosage_models.get(f"dosage_safety_{name}")

    def get_dosage_scaler(self):
        """Return the standard scaler used by the dosage safety models."""
        with self._lock:
            return self._dosage_scaler

    def dosage_models_ready(self) -> bool:
        """Return True if at least one dosage safety model and the scaler are loaded."""
        with self._lock:
            has_model  = any(v is not None for v in self._dosage_models.values())
            has_scaler = self._dosage_scaler is not None
            return has_model and has_scaler

    def summary(self) -> dict:
        """Return a concise summary for the /health endpoint."""
        with self._lock:
            return {
                "loaded_diseases": self.loaded_diseases(),
                "total_loaded": len(self._models),
                "registry_ready": self.is_loaded(),
                "dosage_safety_models_ready": self.dosage_models_ready(),
                "dosage_models_loaded": [k for k, v in self._dosage_models.items() if v is not None],
            }

    # ── Private helpers ────────────────────────────────────────────────────────

    def _load_dosage_models(self) -> None:
        """Load all dosage safety ML models from the models directory."""
        try:
            scaler_path = self._model_dir / "dosage_safety_scaler.pkl"
            self._dosage_scaler = self._try_load(scaler_path)
            if self._dosage_scaler:
                logger.info("  ✅ Dosage safety scaler loaded")

            loaded = 0
            for key in self.DOSAGE_MODELS:
                path = self._model_dir / f"dosage_{key}_model.pkl"
                model = self._try_load(path)
                if model:
                    self._dosage_models[key] = model
                    loaded += 1
                    logger.info(f"  ✅ Dosage model loaded: {key}")
                else:
                    self._dosage_models[key] = None
                    logger.debug(f"  ⚠️  Dosage model not found: {key}")

            logger.info(f"  Dosage safety: {loaded}/{len(self.DOSAGE_MODELS)} models loaded")
        except Exception as e:
            logger.warning(f"  Dosage safety model loading error: {e}")

    def _load_disease(self, disease: str):
        """
        Try to load model+scaler for a disease.
        Priority: XGBoost pkl → sklearn pkl → None

        Returns (model, scaler, algorithm_tag)
        """
        # XGBoost first
        xgb_m = self._try_load(self._model_dir / f"xgb_{disease}_model.pkl")
        xgb_s = self._try_load(self._model_dir / f"xgb_{disease}_scaler.pkl")
        if xgb_m and xgb_s:
            logger.info(f"  ✅ XGBoost {disease} model loaded")
            return xgb_m, xgb_s, "XGBoost"

        # Adherence model may be saved without prefix
        if disease == "adherence":
            adh_m = self._try_load(self._model_dir / "adherence_adherence_model.pkl") or \
                    self._try_load(self._model_dir / "adherence_model.pkl")
            adh_s = self._try_load(self._model_dir / "adherence_adherence_scaler.pkl") or \
                    self._try_load(self._model_dir / "adherence_scaler.pkl")
            if adh_m and adh_s:
                logger.info(f"  ✅ sklearn adherence model loaded")
                return adh_m, adh_s, "sklearn"

        # sklearn fallback
        sk_m = self._try_load(self._model_dir / f"{disease}_model.pkl")
        sk_s = self._try_load(self._model_dir / f"{disease}_scaler.pkl")
        if sk_m and sk_s:
            logger.info(f"  ✅ sklearn {disease} model loaded (fallback)")
            return sk_m, sk_s, "sklearn"

        logger.warning(f"  ⚠️  No model found for {disease}")
        return None, None, None

    @staticmethod
    def _try_load(path: Path):
        """Load a .pkl file; return None on any error."""
        try:
            if path.exists():
                return joblib.load(path)
        except Exception as e:
            logger.warning(f"    Failed to load {path.name}: {e}")
        return None

    def _load_manifest(self) -> dict:
        """Load the version_manifest.json file, returning {} if not found."""
        try:
            if self._manifest_path.exists():
                with open(self._manifest_path, "r") as f:
                    return json.load(f)
        except Exception as e:
            logger.warning(f"Could not load version manifest: {e}")
        return {}

    def _build_version_entry(self, disease: str, algorithm_tag: str, manifest: dict) -> dict:
        """Build a version metadata dict for a successfully loaded model."""
        # Check for any existing entry in manifest
        manifest_key = f"xgb_{disease}" if algorithm_tag == "XGBoost" else disease
        existing = manifest.get(manifest_key, manifest.get(disease, {}))

        # Resolve the actual file that was loaded
        if algorithm_tag == "XGBoost":
            pkl_path = self._model_dir / f"xgb_{disease}_model.pkl"
        elif disease == "adherence":
            pkl_path = (
                self._model_dir / "adherence_adherence_model.pkl"
                if (self._model_dir / "adherence_adherence_model.pkl").exists()
                else self._model_dir / "adherence_model.pkl"
            )
        else:
            pkl_path = self._model_dir / f"{disease}_model.pkl"

        file_size_kb = round(pkl_path.stat().st_size / 1024, 1) if pkl_path.exists() else 0
        mtime = (
            datetime.fromtimestamp(pkl_path.stat().st_mtime, tz=timezone.utc).isoformat()
            if pkl_path.exists() else None
        )

        return {
            "disease": disease,
            "algorithm": algorithm_tag or "unknown",
            "version": existing.get("version", "1.0.0"),
            "trained_at": existing.get("trained_at", mtime),
            "auc": existing.get("auc"),
            "f1": existing.get("f1"),
            "file_size_kb": file_size_kb,
            "file_modified": mtime,
        }

    def save_manifest(self, updates: dict) -> None:
        """
        Merge `updates` into the version manifest and persist it.
        Called by training scripts after each successful training run.

        Args:
            updates: dict of {disease_key: {version, algorithm, auc, f1, trained_at}}
        """
        with self._lock:
            manifest = self._load_manifest()
            manifest.update(updates)
            manifest["_updated_at"] = datetime.now(tz=timezone.utc).isoformat()
            try:
                self._manifest_path.parent.mkdir(parents=True, exist_ok=True)
                with open(self._manifest_path, "w") as f:
                    json.dump(manifest, f, indent=2, default=str)
                logger.info(f"📝 Version manifest saved: {self._manifest_path}")
            except Exception as e:
                logger.error(f"Failed to save version manifest: {e}")
