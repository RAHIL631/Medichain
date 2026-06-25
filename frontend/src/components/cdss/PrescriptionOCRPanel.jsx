// frontend/src/components/cdss/PrescriptionOCRPanel.jsx
// Drag-and-drop OCR prescription upload panel.
// Accepts image/PDF, sends to /api/ai/cdss/ocr-extract, displays extracted meds.

import React, { useState, useRef, useCallback } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export default function PrescriptionOCRPanel({ onMedicationsExtracted }) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const fileRef = useRef();

  const token = localStorage.getItem('medichain_token') || localStorage.getItem('token') || sessionStorage.getItem('token');

  const handleFile = useCallback(async (f) => {
    if (!f) return;
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowed.includes(f.type)) {
      setError('Only JPEG, PNG, and PDF files are supported');
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError('File must be under 10MB');
      return;
    }

    setFile(f);
    setError(null);
    setResult(null);

    // Preview for images
    if (f.type.startsWith('image/')) {
      const url = URL.createObjectURL(f);
      setPreview(url);
    } else {
      setPreview(null);
    }

    // Auto-run OCR
    await runOCR(f);
  }, []); // eslint-disable-line

  async function runOCR(f) {
    setLoading(true);
    setError(null);
    try {
      // Convert to base64
      const b64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(f);
      });

      const response = await axios.post(
        `${API}/api/ai/cdss/ocr-extract`,
        { file_base64: b64, mime_type: f.type },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      setResult(response.data);

      // Notify parent with extracted medications
      if (onMedicationsExtracted && response.data.medications?.length > 0) {
        onMedicationsExtracted(response.data);
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      setError(`OCR failed: ${msg}`);
    } finally {
      setLoading(false);
    }
  }

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const onDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = () => setIsDragging(false);

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Drop zone */}
      <div
        onClick={() => fileRef.current?.click()}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        style={{
          border: `2px dashed ${isDragging ? '#3b82f6' : '#334155'}`,
          borderRadius: '12px',
          padding: '32px 20px',
          textAlign: 'center',
          cursor: 'pointer',
          background: isDragging ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.02)',
          transition: 'all 0.2s ease',
        }}
      >
        <div style={{ fontSize: '36px', marginBottom: '8px' }}>
          {loading ? '⚙️' : file ? '📄' : '📋'}
        </div>
        <div style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '4px' }}>
          {loading ? 'Analyzing prescription with OCR…' :
            file ? file.name :
              'Drop a prescription image or PDF here'}
        </div>
        <div style={{ color: '#475569', fontSize: '12px' }}>
          {!file && 'or click to select — JPEG, PNG, PDF (max 10MB)'}
        </div>

        {loading && (
          <div style={{
            display: 'inline-block', marginTop: '12px',
            padding: '6px 20px',
            background: 'rgba(59,130,246,0.15)',
            border: '1px solid #3b82f666',
            borderRadius: '20px',
            color: '#60a5fa', fontSize: '12px',
          }}>
            🔍 Extracting medications…
          </div>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/jpg,application/pdf"
        style={{ display: 'none' }}
        onChange={(e) => handleFile(e.target.files[0])}
      />

      {/* Preview */}
      {preview && (
        <div style={{ marginTop: '12px', textAlign: 'center' }}>
          <img src={preview} alt="Prescription preview" style={{
            maxWidth: '100%', maxHeight: '200px', borderRadius: '8px',
            border: '1px solid #334155',
          }} />
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          marginTop: '12px', padding: '10px 14px',
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: '8px', color: '#f87171', fontSize: '13px',
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div style={{
          marginTop: '16px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid #334155',
          borderRadius: '10px',
          padding: '16px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '14px' }}>
              📋 OCR Extraction Results
            </div>
            <div style={{ color: '#64748b', fontSize: '12px' }}>
              Confidence: {result.ocr_available
                ? `${Math.round((result.confidence || 0) * 100)}%`
                : 'N/A (OCR unavailable)'}
            </div>
          </div>

          {/* Medications */}
          {result.medications?.length > 0 ? (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ color: '#7dd3fc', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                💊 Detected Medications ({result.medications.length})
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {result.medications.map((med, i) => (
                  <span key={i} style={{
                    padding: '4px 12px',
                    background: 'rgba(59,130,246,0.15)',
                    border: '1px solid rgba(59,130,246,0.3)',
                    borderRadius: '20px',
                    color: '#93c5fd',
                    fontSize: '12px',
                    fontWeight: 500,
                  }}>
                    {med}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ color: '#64748b', fontSize: '13px', marginBottom: '12px' }}>
              {result.ocr_available
                ? '⚠️ No known medications detected. Try a clearer image.'
                : '⚠️ ' + (result.error || 'OCR not available')}
            </div>
          )}

          {/* Structured data */}
          {result.doctor_name && (
            <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>
              👨‍⚕️ Prescriber: <strong style={{ color: '#e2e8f0' }}>{result.doctor_name}</strong>
            </div>
          )}
          {result.prescription_date && (
            <div style={{ color: '#94a3b8', fontSize: '12px' }}>
              📅 Date: <strong style={{ color: '#e2e8f0' }}>{result.prescription_date}</strong>
            </div>
          )}

          {/* Raw text (collapsed) */}
          {result.raw_text && (
            <details style={{ marginTop: '12px' }}>
              <summary style={{ color: '#475569', fontSize: '11px', cursor: 'pointer' }}>
                View raw OCR text
              </summary>
              <pre style={{
                marginTop: '8px',
                background: 'rgba(0,0,0,0.3)',
                borderRadius: '6px',
                padding: '10px',
                fontSize: '11px',
                color: '#64748b',
                overflow: 'auto',
                maxHeight: '200px',
                whiteSpace: 'pre-wrap',
              }}>
                {result.raw_text}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
