"""
DispatchMind unified backend entrypoint.

Running `python main.py` now starts the full FastAPI app from `backend/api.py`
so all frontend routes (/overview, /alerts, /map-data, /repeat-offenders,
/early-warning-system, etc.) are available on one server.
"""

from backend.api import app

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
