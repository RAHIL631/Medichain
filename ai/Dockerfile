# ai/Dockerfile
# MediChain AI Microservice — Production Docker Image
#
# Build:  docker build -t medichain-ai .
# Run:    docker run -p 5001:5001 --env-file .env medichain-ai
#
# Multi-stage build:
#   Stage 1 (builder) — install Python deps into a clean layer
#   Stage 2 (runtime) — slim final image with only what's needed
#
# Tesseract OCR is installed for the OCR pipeline.

# ── Stage 1: Build / dependency install ───────────────────────────────────────
FROM python:3.11-slim AS builder

WORKDIR /build

# System deps for OpenCV, pdf2image (poppler), and Tesseract OCR
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt


# ── Stage 2: Runtime image ─────────────────────────────────────────────────────
FROM python:3.11-slim AS runtime

LABEL maintainer="MediChain Team"
LABEL description="MediChain AI Microservice — Clinical Decision Support & Disease Prediction"
LABEL version="3.0.0"

WORKDIR /app

# OCR runtime: Tesseract + Poppler (required for pdf2image)
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-eng \
    poppler-utils \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Copy installed Python packages from builder
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy application code
COPY . .

# Create non-root user for security
RUN groupadd -r medichain && \
    useradd -r -g medichain -d /app -s /sbin/nologin medichain && \
    chown -R medichain:medichain /app

USER medichain

# ── Environment defaults (override via docker run --env or .env file) ──────────
ENV HOST=0.0.0.0
ENV PORT=5001
ENV FLASK_ENV=production
ENV LOG_LEVEL=INFO
ENV LOG_FORMAT=json
ENV DEBUG=false
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

EXPOSE 5001

# Liveness probe used by Docker / Kubernetes
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:5001/health')" || exit 1

# Production WSGI server
CMD ["gunicorn", "--config", "gunicorn.conf.py", "app:create_app()"]
