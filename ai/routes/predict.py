# ai/routes/predict.py
# MediChain AI — Legacy Disease Prediction Route
#
# Endpoint: POST /predict
# This endpoint is PRESERVED exactly as originally implemented.
# The handler is now a thin Flask layer that delegates to prediction_service.py.

import logging
from flask import Blueprint, request, jsonify

from services.prediction_service import predict_legacy

logger = logging.getLogger("medichain.routes.predict")

predict_bp = Blueprint("predict", __name__)


def validate_input(data):
    errors = {}
    
    # Age validation
    if "age" in data:
        age_val = data["age"]
        if isinstance(age_val, str):
            if not age_val.isdigit():
                errors["age"] = "Age must be a positive integer."
            else:
                age_val = int(age_val)
        
        if not isinstance(age_val, (int, float)) or isinstance(age_val, bool):
            errors["age"] = "Age must be a positive integer."
        elif age_val <= 0 or age_val > 120:
            errors["age"] = "Age must be between 1 and 120."
            
    # dob / dateOfBirth validation
    for dob_field in ["dob", "dateOfBirth"]:
        if dob_field in data:
            dob_val = data[dob_field]
            if dob_val:
                try:
                    from datetime import date
                    date.fromisoformat(str(dob_val)[:10])
                except Exception:
                    errors[dob_field] = "Date of birth must be in YYYY-MM-DD format."
                    
    # Numeric clinical measurements validation
    measurements = {
        "bloodPressure": (30, 300),
        "systolicBP": (30, 300),
        "diastolic_bp": (30, 300),
        "systolic_bp": (30, 300),
        "cholesterol": (50, 600),
        "glucose": (20, 1000),
        "bmi": (5, 100)
    }
    
    for field, (min_val, max_val) in measurements.items():
        if field in data:
            val = data[field]
            try:
                num_val = float(val) if not isinstance(val, bool) else None
                if num_val is None:
                    errors[field] = f"{field} must be a valid number."
                elif num_val < min_val or num_val > max_val:
                    errors[field] = f"{field} must be between {min_val} and {max_val}."
            except (ValueError, TypeError):
                errors[field] = f"{field} must be a valid number."
                
    # Gender validation
    if "gender" in data:
        gender_val = data["gender"]
        if not isinstance(gender_val, str) or gender_val.upper() not in ["M", "F", "MALE", "FEMALE", "OTHER"]:
            errors["gender"] = "Gender must be 'M', 'F', or 'Other'."
            
    # Smoking validation
    if "smoking" in data:
        smoking_val = data["smoking"]
        if not isinstance(smoking_val, (bool, int)) or (isinstance(smoking_val, int) and smoking_val not in [0, 1]):
            errors["smoking"] = "Smoking must be a boolean or binary integer (0 or 1)."
            
    # Conditions lists validation
    for list_field in ["existingConditions", "chronicConditions"]:
        if list_field in data:
            val_list = data[list_field]
            if not isinstance(val_list, list):
                errors[list_field] = f"{list_field} must be a list of strings."
            else:
                for idx, item in enumerate(val_list):
                    if not isinstance(item, str):
                        errors[list_field] = f"Item at index {idx} in {list_field} must be a string."
                        break
                        
    return errors


@predict_bp.route("/predict", methods=["POST"])
def predict():
    """
    POST /predict
    Legacy disease risk prediction endpoint — fully backward-compatible.
    """
    try:
        if not request.data:
            data = {}
        else:
            try:
                data = request.get_json(silent=False)
                if data is None:
                    data = {}
            except Exception as json_err:
                logger.warning(f"Malformed JSON payload: {json_err}")
                return jsonify({"error": "Invalid JSON payload"}), 400

        # Input Validation
        validation_errors = validate_input(data)
        if validation_errors:
            logger.warning(f"Validation failed for /predict request: {validation_errors}")
            return jsonify({"error": "Validation failed", "details": validation_errors}), 400

        result = predict_legacy(data)
        return jsonify(result), 200

    except Exception as e:
        logger.error(f"Prediction error: {e}", exc_info=True)
        return jsonify({"error": "Internal server error during prediction"}), 500

