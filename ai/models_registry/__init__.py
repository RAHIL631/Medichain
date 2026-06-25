# ai/models_registry/__init__.py
# MediChain AI — Model Registry Package
# Exports the ModelRegistry singleton for use across all services.

from .model_loader import ModelRegistry

registry = ModelRegistry()

__all__ = ["registry", "ModelRegistry"]
