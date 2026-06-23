#!/usr/bin/env bash
# ============================================================================
# Render entrypoint — runs CLI demo + minimal HTTP server for health checks
# ============================================================================
set -e

# Decompress dataset CSV if not already present
CSV_FILE="jan to may police violation_anonymized791b166.csv"
CSV_GZ="${CSV_FILE}.gz"
if [ ! -f "$CSV_FILE" ] && [ -f "$CSV_GZ" ]; then
    echo "Decompressing $CSV_GZ -> $CSV_FILE ..."
    gzip -dk "$CSV_GZ"
fi

echo "Starting DispatchMind..."
echo ""

exec python -u scripts/serve_demo.py
