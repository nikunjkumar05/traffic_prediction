#!/usr/bin/env bash
# ============================================================================
# Render Web Service entrypoint — DispatchMind
#
# Build step (run by Render before this script):
#   pip install -r requirements.txt
#   cd frontend && npm install && npm run build
#
# This script starts the FastAPI backend with uvicorn.
# The frontend (built above) is served as static files by the backend.
# ============================================================================
set -e

APP_MODULE="backend.api:app"
HOST="${HOST:-0.0.0.0}"
PORT="${PORT:-8000}"
WORKERS="${WORKERS:-2}"
LOG_LEVEL="${LOG_LEVEL:-info}"

echo "Starting DispatchMind backend on $HOST:$PORT (workers=$WORKERS)"

exec uvicorn "$APP_MODULE" \
    --host "$HOST" \
    --port "$PORT" \
    --workers "$WORKERS" \
    --log-level "$LOG_LEVEL" \
    --proxy-headers \
    --forwarded-allow-ips '*'
