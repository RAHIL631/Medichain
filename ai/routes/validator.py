# ai/routes/validator.py
# ─────────────────────────────────────────────────────────────────────────────
# MediChain AI — Prescription Validator Route Registration
#
# Registers the prescription_validator blueprint and adds a /cdss/validate-prescription/report
# endpoint for direct PDF download.
# ─────────────────────────────────────────────────────────────────────────────

import json
import logging

from flask import Blueprint, Response, jsonify, request

from cdss.prescription_validator import validator_bp, run_full_validation  # noqa: F401

logger = logging.getLogger("medichain.routes.validator")


@validator_bp.route("/cdss/validate-prescription/report", methods=["POST"])
def generate_pdf():
    """
    POST /cdss/validate-prescription/report

    Accepts same payload as /cdss/validate-prescription.
    Returns: PDF binary (application/pdf) as a download attachment.
    """
    try:
        from services.pdf_report_service import generate_pdf_report, PDF_AVAILABLE

        if not PDF_AVAILABLE:
            return jsonify({
                "error": "PDF generation not available",
                "hint": "Install: pip install reportlab==4.1.0"
            }), 503

        file_bytes = b""
        mime_type = "image/jpeg"
        patient = {}
        medications_override = None

        if request.content_type and "multipart/form-data" in request.content_type:
            if "file" in request.files:
                f = request.files["file"]
                file_bytes = f.read()
                mime_type = f.mimetype or "image/jpeg"
            patient_raw = request.form.get("patient", "{}")
            try:
                patient = json.loads(patient_raw)
            except Exception:
                patient = {}
            meds_raw = request.form.get("medications", "")
            if meds_raw:
                medications_override = [m.strip() for m in meds_raw.split(",") if m.strip()]
        else:
            data = request.get_json(silent=True) or {}
            mime_type = data.get("mime_type", "image/jpeg")
            patient = data.get("patient", {})
            file_b64 = data.get("file_base64", "")
            meds_raw = data.get("medications", [])
            if meds_raw:
                if isinstance(meds_raw, str):
                    medications_override = [m.strip() for m in meds_raw.split(",") if m.strip()]
                elif isinstance(meds_raw, list):
                    medications_override = [str(m).strip() for m in meds_raw if str(m).strip()]
            if file_b64:
                import base64
                try:
                    file_bytes = base64.b64decode(file_b64)
                except Exception:
                    return jsonify({"error": "Invalid base64 encoding"}), 400

        # Add blockchain info if provided
        blockchain_tx = request.form.get("blockchain_tx_hash") or (
            request.get_json(silent=True) or {}
        ).get("blockchain_tx_hash", "")

        # Run validation
        result = run_full_validation(file_bytes, mime_type, patient, medications_override)
        if blockchain_tx:
            result["blockchain_tx_hash"] = blockchain_tx

        # Generate PDF
        pdf_bytes = generate_pdf_report(result)

        return Response(
            pdf_bytes,
            mimetype="application/pdf",
            headers={
                "Content-Disposition": 'attachment; filename="medichain_prescription_report.pdf"',
                "Content-Length": str(len(pdf_bytes)),
            },
        )

    except Exception as e:
        logger.error(f"PDF generation error: {e}", exc_info=True)
        return jsonify({"error": "PDF generation failed", "details": str(e)}), 500


@validator_bp.route("/cdss/validate-prescription/pdf-from-result", methods=["POST"])
def pdf_from_result():
    """
    POST /cdss/validate-prescription/pdf-from-result

    Accepts a pre-computed validation result JSON body.
    Returns: PDF binary for download.
    Useful when the frontend has already called /validate-prescription and now wants the PDF.
    """
    try:
        from services.pdf_report_service import generate_pdf_report, PDF_AVAILABLE

        if not PDF_AVAILABLE:
            return jsonify({"error": "reportlab not installed"}), 503

        result = request.get_json(silent=True)
        if not result:
            return jsonify({"error": "Validation result JSON is required in request body"}), 400

        pdf_bytes = generate_pdf_report(result)
        return Response(
            pdf_bytes,
            mimetype="application/pdf",
            headers={
                "Content-Disposition": 'attachment; filename="medichain_prescription_report.pdf"',
                "Content-Length": str(len(pdf_bytes)),
            },
        )
    except Exception as e:
        logger.error(f"PDF from result error: {e}", exc_info=True)
        return jsonify({"error": "PDF generation failed", "details": str(e)}), 500
