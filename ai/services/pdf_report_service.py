# ai/services/pdf_report_service.py
# ─────────────────────────────────────────────────────────────────────────────
# MediChain AI — PDF Prescription Validation Report Generator
#
# Generates a professional clinical PDF using ReportLab.
# Falls back gracefully if reportlab is not installed.
# ─────────────────────────────────────────────────────────────────────────────

import logging
from datetime import datetime
from io import BytesIO

logger = logging.getLogger("medichain.pdf_report")

try:
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import mm
    from reportlab.platypus import (
        HRFlowable,
        Image,
        KeepTogether,
        PageBreak,
        Paragraph,
        SimpleDocTemplate,
        Spacer,
        Table,
        TableStyle,
    )
    PDF_AVAILABLE = True
    logger.info("✅ ReportLab PDF generation available")
except ImportError:
    PDF_AVAILABLE = False
    logger.warning("⚠️  reportlab not installed — PDF generation unavailable. Run: pip install reportlab")


# ── Colour Palette ─────────────────────────────────────────────────────────────
BRAND_DARK   = colors.HexColor("#0a0f1e")
BRAND_CYAN   = colors.HexColor("#06b6d4")
BRAND_BLUE   = colors.HexColor("#3b82f6")
BRAND_INDIGO = colors.HexColor("#6366f1")

SEV_COLORS = {
    "SAFE":     colors.HexColor("#22c55e"),
    "LOW":      colors.HexColor("#eab308"),
    "MODERATE": colors.HexColor("#f97316"),
    "HIGH":     colors.HexColor("#ef4444"),
    "CRITICAL": colors.HexColor("#a855f7"),
    "UNKNOWN":  colors.HexColor("#64748b"),
}

STATUS_COLORS = {
    "SAFE":            colors.HexColor("#22c55e"),
    "CLEAR":           colors.HexColor("#22c55e"),
    "NOT_APPLICABLE":  colors.HexColor("#64748b"),
    "USE_WITH_CAUTION":colors.HexColor("#f97316"),
    "HIGH_RISK":       colors.HexColor("#ef4444"),
    "CONTRAINDICATED": colors.HexColor("#a855f7"),
    "EXCEEDS_MAX":     colors.HexColor("#ef4444"),
    "OVERDOSE":        colors.HexColor("#a855f7"),
    "DAILY_LIMIT_EXCEEDED": colors.HexColor("#f97316"),
    "UNKNOWN":         colors.HexColor("#64748b"),
}


def _status_icon(status: str) -> str:
    icons = {
        "SAFE": "✅", "CLEAR": "✅", "NOT_APPLICABLE": "—",
        "USE_WITH_CAUTION": "⚠️", "HIGH_RISK": "🔴",
        "CONTRAINDICATED": "🚨", "EXCEEDS_MAX": "🔴",
        "OVERDOSE": "🚨", "DAILY_LIMIT_EXCEEDED": "⚠️", "UNKNOWN": "❓",
    }
    return icons.get(status, "—")


def _severity_badge(severity: str) -> str:
    badges = {
        "SAFE": "🟢 SAFE", "LOW": "🟡 LOW", "MODERATE": "🟠 MODERATE",
        "HIGH": "🔴 HIGH", "CRITICAL": "🚨 CRITICAL", "UNKNOWN": "⬜ UNKNOWN",
    }
    return badges.get(severity, severity)


def generate_pdf_report(validation_result: dict) -> bytes:
    """
    Generate a professional PDF validation report from a validation result dict.

    Args:
        validation_result: Output from prescription_validator.run_full_validation()

    Returns:
        PDF file bytes, or raises RuntimeError if reportlab unavailable.
    """
    if not PDF_AVAILABLE:
        raise RuntimeError(
            "reportlab is not installed. Run: pip install reportlab==4.1.0"
        )

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=20 * mm,
        leftMargin=20 * mm,
        topMargin=20 * mm,
        bottomMargin=20 * mm,
        title="MediChain Prescription Validation Report",
        author="MediChain AI",
    )

    styles = getSampleStyleSheet()
    W = A4[0] - 40 * mm  # Usable width

    # ── Custom Styles ────────────────────────────────────────────────────────
    def S(name, **kw):
        return ParagraphStyle(name, **kw)

    heading1 = S("H1", fontSize=22, textColor=colors.white, spaceAfter=4,
                 fontName="Helvetica-Bold", alignment=TA_CENTER)
    heading2 = S("H2", fontSize=13, textColor=BRAND_CYAN, spaceBefore=10, spaceAfter=4,
                 fontName="Helvetica-Bold")
    heading3 = S("H3", fontSize=10, textColor=BRAND_BLUE, spaceBefore=6, spaceAfter=2,
                 fontName="Helvetica-Bold")
    body = S("Body", fontSize=9, textColor=colors.HexColor("#d1d5db"),
             fontName="Helvetica", leading=13)
    small = S("Small", fontSize=7.5, textColor=colors.HexColor("#9ca3af"),
              fontName="Helvetica", leading=11)
    bold9 = S("Bold9", fontSize=9, textColor=colors.white, fontName="Helvetica-Bold")
    center = S("Center", fontSize=9, textColor=colors.HexColor("#d1d5db"),
               fontName="Helvetica", alignment=TA_CENTER)
    mono = S("Mono", fontSize=7, textColor=BRAND_CYAN, fontName="Courier", leading=10)

    story = []

    # ─────────────────────────────────────────────────────────────────────────
    # HEADER BANNER
    # ─────────────────────────────────────────────────────────────────────────
    severity = validation_result.get("severity", "UNKNOWN")
    safety_score = validation_result.get("safety_score", 0)
    sev_color = SEV_COLORS.get(severity, colors.gray)
    validated_at = validation_result.get("validated_at", datetime.utcnow().isoformat() + "Z")

    header_table = Table(
        [[
            Paragraph("🔗 MediChain", S("Logo", fontSize=18, textColor=BRAND_CYAN,
                                         fontName="Helvetica-Bold")),
            Paragraph("AI PRESCRIPTION VALIDATION REPORT", heading1),
            Paragraph(f"Generated: {validated_at[:19].replace('T', ' ')} UTC",
                      S("Date", fontSize=8, textColor=colors.HexColor("#6b7280"),
                        fontName="Helvetica", alignment=TA_RIGHT)),
        ]],
        colWidths=[W * 0.2, W * 0.55, W * 0.25],
    )
    header_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), BRAND_DARK),
        ("TOPPADDING", (0, 0), (-1, -1), 12),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ROUNDEDCORNERS", [6]),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 8))

    # ─────────────────────────────────────────────────────────────────────────
    # SAFETY SCORE BANNER
    # ─────────────────────────────────────────────────────────────────────────
    score_data = [[
        Paragraph(f"Safety Score: <b>{safety_score}/100</b>",
                  S("Score", fontSize=20, textColor=colors.white, fontName="Helvetica-Bold")),
        Paragraph(_severity_badge(severity),
                  S("Sev", fontSize=16, textColor=sev_color, fontName="Helvetica-Bold",
                    alignment=TA_CENTER)),
        Paragraph(
            validation_result.get("clinical_explanation", ""),
            S("Exp", fontSize=9, textColor=colors.HexColor("#d1d5db"),
              fontName="Helvetica", alignment=TA_RIGHT),
        ),
    ]]
    score_table = Table(score_data, colWidths=[W * 0.28, W * 0.22, W * 0.5])
    score_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#111827")),
        ("LEFTBORDERCOLOR", (0, 0), (0, -1), sev_color),
        ("LINEBEFORE", (0, 0), (0, -1), 4, sev_color),
        ("TOPPADDING", (0, 0), (-1, -1), 12),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ROUNDEDCORNERS", [4]),
    ]))
    story.append(score_table)
    story.append(Spacer(1, 10))

    # ─────────────────────────────────────────────────────────────────────────
    # SUMMARY STATS ROW
    # ─────────────────────────────────────────────────────────────────────────
    summary = validation_result.get("summary", {})

    def stat_cell(label, value, color=BRAND_CYAN):
        return [
            Paragraph(str(value), S("V", fontSize=22, textColor=color,
                                     fontName="Helvetica-Bold", alignment=TA_CENTER)),
            Paragraph(label, S("L", fontSize=7, textColor=colors.HexColor("#9ca3af"),
                                alignment=TA_CENTER, fontName="Helvetica")),
        ]

    stats = [
        stat_cell("Medications", summary.get("total_medications", 0), BRAND_CYAN),
        stat_cell("Diseases Detected", summary.get("detected_diseases", 0), BRAND_INDIGO),
        stat_cell("Interactions", summary.get("interaction_conflicts", 0),
                  colors.HexColor("#ef4444") if summary.get("interaction_conflicts", 0) > 0 else BRAND_CYAN),
        stat_cell("Allergy Flags", summary.get("allergy_flags", 0),
                  colors.HexColor("#a855f7") if summary.get("allergy_flags", 0) > 0 else BRAND_CYAN),
        stat_cell("Pregnancy Flags", summary.get("pregnancy_flags", 0),
                  colors.HexColor("#a855f7") if summary.get("pregnancy_flags", 0) > 0 else BRAND_CYAN),
        stat_cell("Kidney Flags", summary.get("kidney_flags", 0),
                  colors.HexColor("#ef4444") if summary.get("kidney_flags", 0) > 0 else BRAND_CYAN),
        stat_cell("Liver Flags", summary.get("liver_flags", 0),
                  colors.HexColor("#f97316") if summary.get("liver_flags", 0) > 0 else BRAND_CYAN),
        stat_cell("Duplicates", summary.get("duplicate_classes", 0),
                  colors.HexColor("#f97316") if summary.get("duplicate_classes", 0) > 0 else BRAND_CYAN),
    ]
    # Transpose: each stat has 2 rows (value, label)
    stats_table = Table(
        [[cell[0] for cell in stats], [cell[1] for cell in stats]],
        colWidths=[W / 8] * 8,
    )
    stats_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#1f2937")),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#374151")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#374151")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ROUNDEDCORNERS", [4]),
    ]))
    story.append(stats_table)
    story.append(Spacer(1, 14))

    # ─────────────────────────────────────────────────────────────────────────
    # PATIENT PROFILE + OCR INFO
    # ─────────────────────────────────────────────────────────────────────────
    patient = validation_result.get("patient_profile", {})
    ocr = validation_result.get("ocr", {})

    story.append(Paragraph("👤 Patient Profile", heading2))
    story.append(HRFlowable(width=W, thickness=0.5, color=BRAND_CYAN))
    story.append(Spacer(1, 4))

    profile_data = [
        ["Age", str(patient.get("age", "N/A")), "Weight (kg)", str(patient.get("weight_kg", "N/A"))],
        ["Kidney GFR", f"{patient.get('kidney_gfr', 90)} mL/min", "Liver Score (Child-Pugh)", str(patient.get("liver_score", 0))],
        ["Pregnant", "Yes" if patient.get("pregnant") else "No", "Known Allergies", ", ".join(patient.get("allergies", []) or ["None"])],
    ]
    profile_table = Table(profile_data, colWidths=[W * 0.15, W * 0.35, W * 0.2, W * 0.3])
    profile_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#1f2937")),
        ("BACKGROUND", (2, 0), (2, -1), colors.HexColor("#1f2937")),
        ("TEXTCOLOR", (0, 0), (0, -1), BRAND_CYAN),
        ("TEXTCOLOR", (2, 0), (2, -1), BRAND_CYAN),
        ("TEXTCOLOR", (1, 0), (1, -1), colors.white),
        ("TEXTCOLOR", (3, 0), (3, -1), colors.white),
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (2, 0), (2, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("PADDING", (0, 0), (-1, -1), 6),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#374151")),
        ("BACKGROUND", (1, 0), (1, -1), colors.HexColor("#111827")),
        ("BACKGROUND", (3, 0), (3, -1), colors.HexColor("#111827")),
    ]))
    story.append(profile_table)

    if ocr.get("doctor_name") or ocr.get("prescription_date"):
        story.append(Spacer(1, 4))
        meta_row = []
        if ocr.get("doctor_name"):
            meta_row.append(f"Prescribing Doctor: {ocr['doctor_name']}")
        if ocr.get("prescription_date"):
            meta_row.append(f"Prescription Date: {ocr['prescription_date']}")
        story.append(Paragraph("  |  ".join(meta_row), small))

    story.append(Spacer(1, 14))

    # ─────────────────────────────────────────────────────────────────────────
    # EXTRACTED MEDICATIONS TABLE
    # ─────────────────────────────────────────────────────────────────────────
    medications = validation_result.get("ocr", {}).get("medications", [])
    structured = validation_result.get("ocr", {}).get("structured_medications", [])

    if medications:
        story.append(Paragraph("💊 Extracted Medications", heading2))
        story.append(HRFlowable(width=W, thickness=0.5, color=BRAND_CYAN))
        story.append(Spacer(1, 4))

        med_header = [
            Paragraph("Drug Name", bold9),
            Paragraph("Dose", bold9),
            Paragraph("Frequency", bold9),
            Paragraph("Likely Indication", bold9),
        ]
        med_rows = [med_header]

        # Build a quick disease lookup
        indication_map = {}
        for dd in validation_result.get("detected_diseases", []):
            drug_key = dd.get("suggested_by", "").lower()
            indication_map.setdefault(drug_key, []).append(dd.get("indication", ""))

        for item in (structured if structured else [{"drug": m} for m in medications]):
            drug_name = item.get("drug", "—")
            drug_key = drug_name.lower()
            indications = indication_map.get(drug_key, [])
            med_rows.append([
                Paragraph(drug_name, body),
                Paragraph(item.get("dose") or "—", body),
                Paragraph(item.get("frequency") or "—", body),
                Paragraph(", ".join(indications[:2]) or "—", small),
            ])

        med_table = Table(med_rows, colWidths=[W * 0.25, W * 0.15, W * 0.2, W * 0.4])
        med_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e3a5f")),
            ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#111827")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#111827"), colors.HexColor("#1a2535")]),
            ("TEXTCOLOR", (0, 0), (-1, 0), BRAND_CYAN),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#374151")),
            ("PADDING", (0, 0), (-1, -1), 5),
            ("TOPPADDING", (0, 0), (-1, 0), 7),
            ("BOTTOMPADDING", (0, 0), (-1, 0), 7),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]))
        story.append(med_table)
        story.append(Spacer(1, 14))

    # ─────────────────────────────────────────────────────────────────────────
    # DETECTED DISEASES
    # ─────────────────────────────────────────────────────────────────────────
    detected_diseases = validation_result.get("detected_diseases", [])
    if detected_diseases:
        story.append(Paragraph("🧬 Likely Clinical Indications", heading2))
        story.append(HRFlowable(width=W, thickness=0.5, color=BRAND_CYAN))
        story.append(Spacer(1, 4))
        dd_data = [[Paragraph("Indication", bold9), Paragraph("Suggested By Drug", bold9)]]
        for dd in detected_diseases:
            dd_data.append([
                Paragraph(dd.get("indication", ""), body),
                Paragraph(dd.get("suggested_by", ""), body),
            ])
        dd_table = Table(dd_data, colWidths=[W * 0.6, W * 0.4])
        dd_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e3a5f")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#111827"), colors.HexColor("#1a2535")]),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#374151")),
            ("PADDING", (0, 0), (-1, -1), 5),
        ]))
        story.append(dd_table)
        story.append(Spacer(1, 14))

    # ─────────────────────────────────────────────────────────────────────────
    # SAFETY CHECKS SECTION
    # ─────────────────────────────────────────────────────────────────────────
    def _safety_section(title, results, key_field="status", msg_field="message"):
        if not results:
            return
        story.append(Paragraph(title, heading2))
        story.append(HRFlowable(width=W, thickness=0.5, color=BRAND_CYAN))
        story.append(Spacer(1, 4))
        rows = [[Paragraph("Drug", bold9), Paragraph("Status", bold9),
                 Paragraph("Severity", bold9), Paragraph("Details", bold9)]]
        for r in results:
            status = r.get(key_field, "UNKNOWN")
            severity = r.get("severity", "NONE")
            sev_col = SEV_COLORS.get(severity, colors.gray)
            stat_col = STATUS_COLORS.get(status, colors.gray)
            rows.append([
                Paragraph(r.get("drug", "—"), body),
                Paragraph(f"{_status_icon(status)} {status}", S("St", fontSize=8,
                          textColor=stat_col, fontName="Helvetica-Bold")),
                Paragraph(severity, S("Sv", fontSize=8, textColor=sev_col,
                          fontName="Helvetica-Bold")),
                Paragraph(r.get(msg_field, ""), small),
            ])
        tbl = Table(rows, colWidths=[W * 0.18, W * 0.18, W * 0.12, W * 0.52])
        tbl.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e3a5f")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#111827"), colors.HexColor("#1a2535")]),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#374151")),
            ("PADDING", (0, 0), (-1, -1), 5),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]))
        story.append(tbl)
        story.append(Spacer(1, 12))

    _safety_section("🧪 Allergy Check Results", validation_result.get("allergy_check", []))
    _safety_section("🤰 Pregnancy Safety Check", validation_result.get("pregnancy_safety", []))
    _safety_section("🫘 Kidney Safety Check", validation_result.get("kidney_safety", []))
    _safety_section("🫀 Liver Safety Check", validation_result.get("liver_safety", []))

    # ─────────────────────────────────────────────────────────────────────────
    # OVERDOSE ALERTS
    # ─────────────────────────────────────────────────────────────────────────
    overdose_results = validation_result.get("overdose_alerts", [])
    if overdose_results:
        story.append(Paragraph("⚠️ Overdose / Dosage Safety Alerts", heading2))
        story.append(HRFlowable(width=W, thickness=0.5, color=BRAND_CYAN))
        story.append(Spacer(1, 4))
        od_rows = [[
            Paragraph("Drug", bold9), Paragraph("Prescribed Dose", bold9),
            Paragraph("Max Safe Dose", bold9), Paragraph("Status", bold9),
            Paragraph("Frequency", bold9),
        ]]
        for od in overdose_results:
            status = od.get("status", "UNKNOWN")
            sev = od.get("severity", "NONE")
            stat_col = STATUS_COLORS.get(status, colors.gray)
            od_rows.append([
                Paragraph(od.get("drug", "—"), body),
                Paragraph(f"{od.get('prescribed_dose_mg', '—')} mg", body),
                Paragraph(f"{od.get('max_safe_dose_mg', '—')} mg", body),
                Paragraph(status, S("St", fontSize=8, textColor=stat_col, fontName="Helvetica-Bold")),
                Paragraph(od.get("frequency") or "—", small),
            ])
        od_table = Table(od_rows, colWidths=[W * 0.22, W * 0.18, W * 0.18, W * 0.22, W * 0.2])
        od_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e3a5f")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#111827"), colors.HexColor("#1a2535")]),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#374151")),
            ("PADDING", (0, 0), (-1, -1), 5),
        ]))
        story.append(od_table)
        story.append(Spacer(1, 12))

    # ─────────────────────────────────────────────────────────────────────────
    # DRUG INTERACTIONS
    # ─────────────────────────────────────────────────────────────────────────
    interactions = validation_result.get("interactions", {})
    conflicts = interactions.get("conflicts", [])
    if conflicts:
        story.append(Paragraph("💊 Drug Interaction Analysis", heading2))
        story.append(HRFlowable(width=W, thickness=0.5, color=BRAND_CYAN))
        story.append(Spacer(1, 4))

        int_rows = [[Paragraph("Drug 1", bold9), Paragraph("Drug 2", bold9),
                     Paragraph("Severity", bold9), Paragraph("Clinical Notes", bold9)]]
        for c in conflicts:
            sev = c.get("severity", "UNKNOWN")
            sev_col = SEV_COLORS.get(sev, colors.gray)
            int_rows.append([
                Paragraph(c.get("drug1", ""), body),
                Paragraph(c.get("drug2", ""), body),
                Paragraph(sev, S("SV", fontSize=8, textColor=sev_col, fontName="Helvetica-Bold")),
                Paragraph(c.get("description", "")[:200], small),
            ])
        int_table = Table(int_rows, colWidths=[W * 0.18, W * 0.18, W * 0.12, W * 0.52])
        int_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e3a5f")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#111827"), colors.HexColor("#1a2535")]),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#374151")),
            ("PADDING", (0, 0), (-1, -1), 5),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]))
        story.append(int_table)
        story.append(Spacer(1, 6))

    # Combination analysis warnings
    combos = interactions.get("combination_analysis", [])
    if combos:
        for combo in combos:
            story.append(Paragraph(
                f"⚡ {combo.get('name', 'Warning')} [{combo.get('severity', '')}]: {combo.get('description', '')}",
                S("Warn", fontSize=8, textColor=SEV_COLORS.get(combo.get("severity", "MODERATE"), colors.orange),
                  fontName="Helvetica", backColor=colors.HexColor("#1c1917"), leftIndent=10,
                  leading=12, spaceAfter=4, spaceBefore=2),
            ))

    story.append(Spacer(1, 8))

    # ─────────────────────────────────────────────────────────────────────────
    # DUPLICATE MEDICINES
    # ─────────────────────────────────────────────────────────────────────────
    duplicates = validation_result.get("duplicate_medicines", [])
    if duplicates:
        story.append(Paragraph("🔁 Therapeutic Duplication Alerts", heading2))
        story.append(HRFlowable(width=W, thickness=0.5, color=BRAND_CYAN))
        story.append(Spacer(1, 4))
        for dup in duplicates:
            story.append(Paragraph(
                f"<b>{dup.get('class', '')}:</b> {', '.join(dup.get('drugs', []))} — {dup.get('message', '')}",
                S("Dup", fontSize=9, textColor=colors.HexColor("#fbbf24"),
                  fontName="Helvetica", backColor=colors.HexColor("#292524"),
                  leftIndent=8, leading=14, spaceAfter=4),
            ))
        story.append(Spacer(1, 8))

    # ─────────────────────────────────────────────────────────────────────────
    # RECOMMENDATIONS
    # ─────────────────────────────────────────────────────────────────────────
    recommendations = validation_result.get("recommendations", [])
    if recommendations:
        story.append(Paragraph("📋 Clinical Recommendations", heading2))
        story.append(HRFlowable(width=W, thickness=0.5, color=BRAND_CYAN))
        story.append(Spacer(1, 4))
        for i, rec in enumerate(recommendations, 1):
            story.append(Paragraph(
                f"{i}. {rec}",
                S("Rec", fontSize=9, textColor=colors.HexColor("#d1d5db"),
                  fontName="Helvetica", leftIndent=10, leading=13, spaceAfter=4),
            ))
        story.append(Spacer(1, 10))

    # ─────────────────────────────────────────────────────────────────────────
    # SCORE BREAKDOWN
    # ─────────────────────────────────────────────────────────────────────────
    breakdown = validation_result.get("score_breakdown", {})
    deductions = breakdown.get("deductions", [])
    if deductions:
        story.append(Paragraph("📊 Safety Score Breakdown", heading2))
        story.append(HRFlowable(width=W, thickness=0.5, color=BRAND_CYAN))
        story.append(Spacer(1, 4))
        bd_rows = [[Paragraph("Reason", bold9), Paragraph("Deduction", bold9)]]
        for d in deductions:
            bd_rows.append([
                Paragraph(d.get("reason", ""), body),
                Paragraph(f"−{d.get('deduction', 0)}", S("D", fontSize=9,
                          textColor=colors.HexColor("#ef4444"), fontName="Helvetica-Bold")),
            ])
        bd_rows.append([
            Paragraph("FINAL SAFETY SCORE", bold9),
            Paragraph(f"{breakdown.get('final_score', 0)}/100",
                      S("F", fontSize=10, textColor=sev_color, fontName="Helvetica-Bold")),
        ])
        bd_table = Table(bd_rows, colWidths=[W * 0.8, W * 0.2])
        bd_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e3a5f")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -2), [colors.HexColor("#111827"), colors.HexColor("#1a2535")]),
            ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#1f2937")),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#374151")),
            ("PADDING", (0, 0), (-1, -1), 5),
            ("LINEABOVE", (0, -1), (-1, -1), 1, BRAND_CYAN),
        ]))
        story.append(bd_table)
        story.append(Spacer(1, 12))

    # ─────────────────────────────────────────────────────────────────────────
    # BLOCKCHAIN / REPORT HASH
    # ─────────────────────────────────────────────────────────────────────────
    report_hash = validation_result.get("report_hash", "")
    blockchain_tx = validation_result.get("blockchain_tx_hash", "")
    blockchain_block = validation_result.get("blockchain_block_number", "")

    story.append(Paragraph("🔗 Blockchain Integrity Proof", heading2))
    story.append(HRFlowable(width=W, thickness=0.5, color=BRAND_CYAN))
    story.append(Spacer(1, 4))

    chain_data = []
    if report_hash:
        chain_data.append(["Report Hash (SHA-256)", report_hash])
    if blockchain_tx:
        chain_data.append(["Blockchain TX Hash", blockchain_tx])
    if blockchain_block:
        chain_data.append(["Block Number", str(blockchain_block)])
    chain_data.append(["Timestamp", validated_at])

    if chain_data:
        chain_table = Table(chain_data, colWidths=[W * 0.25, W * 0.75])
        chain_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#1f2937")),
            ("TEXTCOLOR", (0, 0), (0, -1), BRAND_CYAN),
            ("TEXTCOLOR", (1, 0), (1, -1), colors.white),
            ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
            ("FONTNAME", (1, 0), (1, -1), "Courier"),
            ("FONTSIZE", (1, 0), (1, -1), 7.5),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#374151")),
            ("PADDING", (0, 0), (-1, -1), 6),
            ("BACKGROUND", (1, 0), (1, -1), colors.HexColor("#0d1117")),
        ]))
        story.append(chain_table)

    # ─────────────────────────────────────────────────────────────────────────
    # FOOTER
    # ─────────────────────────────────────────────────────────────────────────
    story.append(Spacer(1, 16))
    story.append(HRFlowable(width=W, thickness=0.5, color=colors.HexColor("#374151")))
    story.append(Spacer(1, 4))
    story.append(Paragraph(
        "This report is generated by MediChain AI for clinical decision support purposes only. "
        "It does not replace professional medical judgment. All findings must be reviewed by a "
        "qualified healthcare professional before clinical action is taken. "
        f"© MediChain {datetime.utcnow().year}",
        S("Footer", fontSize=7, textColor=colors.HexColor("#6b7280"), fontName="Helvetica",
          alignment=TA_CENTER, leading=11),
    ))

    doc.build(story)
    return buffer.getvalue()
