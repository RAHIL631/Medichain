# ai/gunicorn.conf.py
# MediChain AI — Gunicorn Production WSGI Server Configuration
#
# Used in production via:
#   gunicorn --config gunicorn.conf.py "app:create_app()"
#
# Or from Docker CMD:
#   CMD ["gunicorn", "--config", "gunicorn.conf.py", "app:create_app()"]

import multiprocessing
import os

# ── Workers ────────────────────────────────────────────────────────────────────
# Formula: (2 × CPU cores) + 1 is standard for CPU-bound workloads.
# OCR pipeline is CPU-bound; sync workers are appropriate.
# Override via GUNICORN_WORKERS env var for containers with fixed allocations.
workers = int(os.getenv("GUNICORN_WORKERS", (2 * multiprocessing.cpu_count()) + 1))
worker_class = "sync"                # sync is safe for CPU-bound ML workloads

# ── Binding ────────────────────────────────────────────────────────────────────
host = os.getenv("HOST", "0.0.0.0")
port = os.getenv("PORT", "5001")
bind = f"{host}:{port}"

# ── Timeouts ───────────────────────────────────────────────────────────────────
# 120s to allow OCR pipeline (Tesseract + pdf2image) to complete
timeout = int(os.getenv("GUNICORN_TIMEOUT", "120"))
graceful_timeout = 30                # time for in-flight requests to complete on shutdown
keepalive = 5                        # keep-alive connections in seconds

# ── Concurrency ────────────────────────────────────────────────────────────────
threads = 1                          # 1 thread per sync worker (default, safe with joblib)
worker_connections = 1000            # max simultaneous connections per worker

# ── Logging ────────────────────────────────────────────────────────────────────
# Log to stdout/stderr so Docker captures them
accesslog = "-"                      # stdout
errorlog = "-"                       # stderr
loglevel = os.getenv("LOG_LEVEL", "info").lower()
access_log_format = (
    '{"time":"%(t)s","method":"%(m)s","path":"%(U)s","status":%(s)s,'
    '"bytes":%(B)s,"duration_ms":%(D)s,"referrer":"%(f)s","agent":"%(a)s"}'
)

# ── Process naming ─────────────────────────────────────────────────────────────
proc_name = "medichain-ai"

# ── Security ───────────────────────────────────────────────────────────────────
limit_request_line = 4096            # max request line size in bytes
limit_request_fields = 100           # max HTTP headers per request
limit_request_field_size = 8190      # max header field size in bytes

# ── Preload app ────────────────────────────────────────────────────────────────
# Preloading loads the application once before forking workers.
# This saves memory (copy-on-write) and speeds up worker restarts.
# NOTE: Disabled by default because model loading happens inside create_app();
# enable only if models are loaded at module level.
preload_app = False

# ── Worker lifecycle hooks ─────────────────────────────────────────────────────

def on_starting(server):
    server.log.info("🚀 MediChain AI Gunicorn starting...")

def on_exit(server):
    server.log.info("🛑 MediChain AI Gunicorn shutting down")

def worker_init(worker):
    worker.log.info(f"Worker {worker.pid} initialized")

def worker_exit(worker, server):
    worker.log.info(f"Worker {worker.pid} exiting")
