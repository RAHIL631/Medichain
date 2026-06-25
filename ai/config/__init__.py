# ai/config/__init__.py
# MediChain AI — Configuration Package
# Exports a singleton `settings` object used across the entire service.

from .settings import Settings

settings = Settings()

__all__ = ["settings"]
