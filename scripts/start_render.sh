#!/usr/bin/env bash
# ============================================================================
# Render entrypoint — starts the full FastAPI app
# ============================================================================
set -e

# Decompress dataset CSV if not already present
CSV_FILE="jan to may police violation_anonymized791b166.csv"
CSV_GZ="${CSV_FILE}.gz"
if [ ! -f "$CSV_FILE" ] && [ -f "$CSV_GZ" ]; then
    echo "Decompressing $CSV_GZ -> $CSV_FILE ..."
    gzip -dk "$CSV_GZ"
fi

echo "Starting DispatchMind FastAPI server..."

PORT="${PORT:-10000}"

exec gunicorn backend.api:app \
    --worker-class uvicorn.workers.UvicornWorker \
    --workers 2 \
    --bind "0.0.0.0:${PORT}" \
    --timeout 120 \
    --log-level info
