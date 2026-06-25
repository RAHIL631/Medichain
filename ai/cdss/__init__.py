# ai/cdss/__init__.py
# MediChain AI-CDSS Package
# Exports all Flask blueprints for registration in app.py

from .interaction_engine import interaction_bp
from .dosage_checker import dosage_bp
from .prescription_scorer import scorer_bp
from .disease_predictor import predictor_bp
from .risk_scorer import risk_bp
from .adherence_predictor import adherence_bp
from .ocr_extractor import ocr_bp

__all__ = [
    'interaction_bp',
    'dosage_bp',
    'scorer_bp',
    'predictor_bp',
    'risk_bp',
    'adherence_bp',
    'ocr_bp',
]
