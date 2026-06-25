# ai/cdss/ocr_extractor.py
# OCR-Based Prescription Extraction Module
# Extracts medications, dosages, doctor name, and date from prescription images/PDFs.
# Uses Tesseract OCR with graceful fallback when binary is not installed.

from flask import Blueprint, request, jsonify
import base64
import re
import logging
from io import BytesIO

logger = logging.getLogger("cdss.ocr")

ocr_bp = Blueprint('ocr', __name__)

# ── Optional imports (graceful fallback if not installed) ─────────────────────
try:
    import pytesseract
    from PIL import Image
    import cv2
    import numpy as np
    OCR_AVAILABLE = True
    logger.info("✅ Tesseract OCR available")
except ImportError:
    OCR_AVAILABLE = False
    logger.warning("⚠️ pytesseract/Pillow/opencv not installed — OCR will use text fallback only")

try:
    from pdf2image import convert_from_bytes
    PDF_SUPPORT = True
except ImportError:
    PDF_SUPPORT = False
    logger.warning("⚠️ pdf2image not installed — PDF OCR not supported")


# ── Common drug name patterns for regex extraction ───────────────────────────
# Covers common generic + brand names across therapeutic classes
KNOWN_DRUG_PATTERNS = [
    # Analgesics / Antipyretics
    r'\b(aspirin|ibuprofen|paracetamol|acetaminophen|naproxen|diclofenac|celecoxib|tramadol|codeine|morphine|oxycodone|hydrocodone)\b',
    # Antibiotics
    r'\b(amoxicillin|azithromycin|ciprofloxacin|doxycycline|metronidazole|clindamycin|levofloxacin|cephalexin|trimethoprim|penicillin|erythromycin|clarithromycin|vancomycin|ampicillin)\b',
    # Cardiovascular
    r'\b(metoprolol|atenolol|amlodipine|lisinopril|enalapril|ramipril|losartan|valsartan|hydrochlorothiazide|furosemide|spironolactone|digoxin|warfarin|clopidogrel|atorvastatin|simvastatin|rosuvastatin|nitroglycerin|isosorbide)\b',
    # Diabetes
    r'\b(metformin|insulin|glipizide|glyburide|glimepiride|sitagliptin|empagliflozin|dapagliflozin|liraglutide|semaglutide|pioglitazone)\b',
    # CNS / Psych
    r'\b(fluoxetine|sertraline|escitalopram|venlafaxine|amitriptyline|quetiapine|olanzapine|risperidone|haloperidol|clonazepam|diazepam|alprazolam|lorazepam|zolpidem|lithium)\b',
    # Respiratory
    r'\b(salbutamol|albuterol|budesonide|fluticasone|montelukast|cetirizine|loratadine|fexofenadine|prednisone|prednisolone|dexamethasone|theophylline)\b',
    # GI
    r'\b(omeprazole|pantoprazole|esomeprazole|ranitidine|metoclopramide|ondansetron|loperamide|lactulose)\b',
    # Hormones / Thyroid
    r'\b(levothyroxine|methimazole|estradiol|progesterone|testosterone|tamoxifen|letrozole)\b',
    # Immunosuppressants / Oncology
    r'\b(methotrexate|cyclosporine|tacrolimus|mycophenolate|hydroxychloroquine)\b',
]

# Dosage patterns
DOSE_PATTERN = re.compile(
    r'(\d+(?:\.\d+)?)\s*(?:mg|mcg|µg|g|ml|mL|units?|IU|%)\b',
    re.IGNORECASE
)

# Frequency patterns
FREQ_PATTERN = re.compile(
    r'\b(once\s+daily|twice\s+daily|three\s+times\s+daily|four\s+times\s+daily|'
    r'every\s+\d+\s+hours?|BD|TDS|QDS|OD|PRN|at\s+night|'
    r'\d+x\s*(?:per|a)?\s*day|morning|evening|with\s+food|before\s+meals?|after\s+meals?)\b',
    re.IGNORECASE
)

# Doctor/prescriber name patterns
DOCTOR_PATTERN = re.compile(
    r'(?:Dr\.?|Doctor|Prof\.?|Professor|MBBS|MD|DO|PharmD|Prescriber[:.]?)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})',
    re.IGNORECASE
)

# Date patterns
DATE_PATTERN = re.compile(
    r'\b(\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{4}[-/]\d{2}[-/]\d{2}|'
    r'(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{1,2},?\s*\d{4})\b',
    re.IGNORECASE
)


def preprocess_image(image) -> 'Image':
    """Apply image preprocessing to improve OCR accuracy."""
    if not OCR_AVAILABLE:
        return image
    
    # Convert PIL to OpenCV
    img_array = np.array(image.convert('RGB'))
    img_cv = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
    
    # Convert to grayscale
    gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)
    
    # Denoise
    denoised = cv2.fastNlMeansDenoising(gray, h=10)
    
    # Adaptive threshold for better binarization
    binary = cv2.adaptiveThreshold(
        denoised, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY, 11, 2
    )
    
    # Deskew (basic)
    coords = np.column_stack(np.where(binary == 0))
    if len(coords) > 0:
        angle = cv2.minAreaRect(coords)[-1]
        if angle < -45:
            angle = 90 + angle
        if abs(angle) > 0.5:  # Only correct if meaningful skew
            (h, w) = binary.shape
            M = cv2.getRotationMatrix2D((w/2, h/2), angle, 1.0)
            binary = cv2.warpAffine(binary, M, (w, h),
                                     flags=cv2.INTER_CUBIC,
                                     borderMode=cv2.BORDER_REPLICATE)
    
    return Image.fromarray(binary)


def run_ocr(image) -> tuple[str, float]:
    """Run Tesseract OCR on a PIL Image. Returns (text, confidence)."""
    if not OCR_AVAILABLE:
        return "", 0.0
    
    try:
        preprocessed = preprocess_image(image)
        
        # Run OCR with data to get confidence
        data = pytesseract.image_to_data(
            preprocessed,
            config='--psm 6 --oem 3',
            output_type=pytesseract.Output.DICT
        )
        
        # Filter confident words
        confident_words = [
            data['text'][i] for i in range(len(data['text']))
            if int(data['conf'][i]) > 40 and data['text'][i].strip()
        ]
        
        text = pytesseract.image_to_string(preprocessed, config='--psm 6 --oem 3')
        
        # Compute mean confidence
        confs = [int(c) for c in data['conf'] if int(c) >= 0]
        confidence = round(sum(confs) / len(confs) / 100, 2) if confs else 0.0
        
        return text, confidence
    
    except Exception as e:
        logger.error(f"OCR execution failed: {e}")
        return "", 0.0


def parse_prescription_text(text: str) -> dict:
    """
    Parse extracted OCR text to identify medications, dosages, frequencies, etc.
    """
    text_lower = text.lower()
    
    # ── Drug extraction ───────────────────────────────────────────────────────
    medications = []
    for pattern in KNOWN_DRUG_PATTERNS:
        matches = re.findall(pattern, text_lower, re.IGNORECASE)
        for m in matches:
            cleaned = m.strip().capitalize()
            if cleaned and cleaned not in medications:
                medications.append(cleaned)
    
    # ── Dosage extraction ─────────────────────────────────────────────────────
    dose_matches = DOSE_PATTERN.findall(text)
    dosages = list(set(dose_matches[:10]))  # Deduplicate, limit to 10
    
    # ── Frequency extraction ──────────────────────────────────────────────────
    freq_matches = FREQ_PATTERN.findall(text)
    frequencies = list(set([f.strip() for f in freq_matches]))
    
    # ── Doctor name extraction ────────────────────────────────────────────────
    doctor_match = DOCTOR_PATTERN.search(text)
    doctor_name = doctor_match.group(1) if doctor_match else None
    
    # ── Date extraction ───────────────────────────────────────────────────────
    date_matches = DATE_PATTERN.findall(text)
    prescription_date = date_matches[0] if date_matches else None
    
    # ── Structured drug-dose pairing ─────────────────────────────────────────
    structured = []
    lines = text.split('\n')
    for line in lines:
        line_lower = line.lower().strip()
        for pattern in KNOWN_DRUG_PATTERNS:
            drug_match = re.search(pattern, line_lower)
            if drug_match:
                drug = drug_match.group(0).capitalize()
                dose_m = DOSE_PATTERN.search(line)
                freq_m = FREQ_PATTERN.search(line)
                structured.append({
                    "drug": drug,
                    "dose": dose_m.group(0) if dose_m else None,
                    "frequency": freq_m.group(0) if freq_m else None,
                    "raw_line": line.strip()
                })
    
    return {
        "medications": medications,
        "dosages": dosages,
        "frequencies": frequencies,
        "structured_medications": structured[:20],
        "doctor_name": doctor_name,
        "prescription_date": prescription_date,
    }


def extract_from_bytes(file_bytes: bytes, mime_type: str) -> dict:
    """
    Main extraction function: accepts file bytes + MIME type.
    Supports: image/jpeg, image/png, application/pdf
    """
    raw_text = ""
    confidence = 0.0
    pages_processed = 1
    
    if not OCR_AVAILABLE:
        return {
            "ocr_available": False,
            "medications": [],
            "dosages": [],
            "frequencies": [],
            "structured_medications": [],
            "doctor_name": None,
            "prescription_date": None,
            "raw_text": "",
            "confidence": 0.0,
            "pages_processed": 0,
            "error": "OCR not available — install pytesseract and Tesseract-OCR binary"
        }
    
    try:
        if mime_type in ["image/jpeg", "image/jpg", "image/png", "image/webp"]:
            image = Image.open(BytesIO(file_bytes))
            raw_text, confidence = run_ocr(image)
        
        elif mime_type == "application/pdf":
            if not PDF_SUPPORT:
                return {
                    "ocr_available": True,
                    "medications": [],
                    "error": "pdf2image not installed — PDF OCR not supported. Install with: pip install pdf2image",
                    "raw_text": "", "confidence": 0.0
                }
            images = convert_from_bytes(file_bytes, dpi=300)
            pages_processed = len(images)
            all_texts = []
            all_confs = []
            for img in images[:5]:  # Max 5 pages
                t, c = run_ocr(img)
                all_texts.append(t)
                all_confs.append(c)
            raw_text = "\n\n--- PAGE BREAK ---\n\n".join(all_texts)
            confidence = round(sum(all_confs) / len(all_confs), 2) if all_confs else 0.0
        
        else:
            return {
                "ocr_available": True,
                "medications": [],
                "error": f"Unsupported MIME type: {mime_type}. Use image/jpeg, image/png, or application/pdf",
                "raw_text": "", "confidence": 0.0
            }
    
    except Exception as e:
        logger.error(f"OCR extraction failed: {e}")
        return {
            "ocr_available": True,
            "medications": [],
            "error": f"OCR processing failed: {str(e)}",
            "raw_text": "", "confidence": 0.0
        }
    
    # Parse extracted text
    parsed = parse_prescription_text(raw_text)
    
    return {
        "ocr_available": True,
        "raw_text": raw_text[:5000],  # Limit response size
        "confidence": confidence,
        "pages_processed": pages_processed,
        **parsed
    }


# ── Blueprint Routes ──────────────────────────────────────────────────────────

@ocr_bp.route('/cdss/ocr-extract', methods=['POST'])
def ocr_extract():
    """
    POST /cdss/ocr-extract
    Body:
      {
        "file_base64": "<base64 encoded image/pdf>",
        "mime_type": "image/jpeg"
      }
    OR multipart/form-data with 'file' field.
    Returns: extracted medications, dosages, doctor info.
    """
    try:
        # ── Handle multipart/form-data ────────────────────────────────────────
        if request.content_type and 'multipart/form-data' in request.content_type:
            if 'file' not in request.files:
                return jsonify({"error": "No file in request"}), 400
            file = request.files['file']
            file_bytes = file.read()
            mime_type = file.mimetype or "image/jpeg"
        
        # ── Handle JSON with base64 ───────────────────────────────────────────
        else:
            data = request.get_json(silent=True) or {}
            file_b64 = data.get("file_base64", "")
            mime_type = data.get("mime_type", "image/jpeg")
            
            if not file_b64:
                return jsonify({"error": "file_base64 or multipart file is required"}), 400
            
            try:
                file_bytes = base64.b64decode(file_b64)
            except Exception:
                return jsonify({"error": "Invalid base64 encoding"}), 400
        
        logger.info(f"OCR extraction: {mime_type}, {len(file_bytes)} bytes")
        result = extract_from_bytes(file_bytes, mime_type)
        
        return jsonify(result), 200

    except Exception as e:
        logger.error(f"OCR endpoint error: {e}")
        return jsonify({"error": "OCR extraction failed", "details": str(e)}), 500
