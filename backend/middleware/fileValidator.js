// medichain/backend/middleware/fileValidator.js
//
// Magic byte (file signature) validation for uploaded medical files.
// Validates the actual binary content of a file, not just the MIME type header
// (which can be trivially spoofed by an attacker).
//
// SUPPORTED TYPES:
//   PDF       — %PDF header
//   JPEG      — FF D8 FF
//   PNG       — 89 50 4E 47 0D 0A 1A 0A
//
// USAGE (in multer upload pipeline):
//   router.post('/upload', upload.single('file'), validateFileMagicBytes, handler)

'use strict';

/**
 * Magic byte signatures for allowed file types.
 * Each entry: { mime, bytes, offset }
 *   - mime:   expected MIME type string
 *   - bytes:  hex string of magic bytes
 *   - offset: byte offset in file where these bytes appear (usually 0)
 */
const SIGNATURES = [
  // PDF: %PDF at offset 0
  { mime: 'application/pdf', bytes: '25504446', offset: 0 },

  // JPEG: FF D8 FF at offset 0 (multiple JPEG subtypes)
  { mime: 'image/jpeg', bytes: 'FFD8FF',   offset: 0 },
  { mime: 'image/jpg',  bytes: 'FFD8FF',   offset: 0 },

  // PNG: 8-byte signature at offset 0
  { mime: 'image/png',  bytes: '89504E470D0A1A0A', offset: 0 },
];

/**
 * Check if a buffer matches a known file signature.
 *
 * @param {Buffer} buffer
 * @param {string} hexSignature  — e.g. 'FFD8FF'
 * @param {number} offset        — byte position in file
 * @returns {boolean}
 */
const matchesSignature = (buffer, hexSignature, offset) => {
  const sigBytes = Buffer.from(hexSignature, 'hex');
  if (buffer.length < offset + sigBytes.length) return false;
  return buffer.slice(offset, offset + sigBytes.length).equals(sigBytes);
};

/**
 * Express middleware: validates that req.file's buffer matches a known safe
 * magic byte signature AND that the signature matches the declared MIME type.
 *
 * Must be used AFTER multer (which populates req.file).
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const validateFileMagicBytes = (req, res, next) => {
  if (!req.file) return next(); // No file — let route handler decide

  const { buffer, mimetype, originalname } = req.file;

  if (!buffer || buffer.length < 4) {
    return res.status(400).json({
      error: 'File is empty or too small to validate',
    });
  }

  // Find a matching signature
  const match = SIGNATURES.find((sig) => matchesSignature(buffer, sig.bytes, sig.offset));

  if (!match) {
    return res.status(400).json({
      error: `File type not allowed: "${originalname}" does not match a recognised safe file signature (PDF, JPEG, PNG).`,
    });
  }

  // Verify that the magic bytes match the declared MIME type
  // (e.g. reject an executable disguised as application/pdf)
  const normalised = (mimetype || '').toLowerCase().trim();
  const isJpegMatch = (normalised === 'image/jpeg' || normalised === 'image/jpg' || normalised === 'image/pjpeg') && 
                      (match.mime === 'image/jpeg' || match.mime === 'image/jpg');

  if (match.mime !== normalised && !isJpegMatch) {
    return res.status(400).json({
      error: `File content mismatch: declared MIME type "${mimetype}" does not match actual file content.`,
    });
  }

  // All good — annotate the request and proceed
  req.file.validatedMime = match.mime;
  next();
};

module.exports = { validateFileMagicBytes };
