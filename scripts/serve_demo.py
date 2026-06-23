"""Minimal ASGI health server + runs CLI demo in background thread for Render."""
import asyncio
import json
import os
import sys
import threading
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

PORT = int(os.environ.get("PORT", "10000"))


async def health_app(scope, receive, send):
    assert scope["type"] == "http"
    body = json.dumps({"status": "ok", "service": "dispatchmind-cli"}).encode()
    await send({
        "type": "http.response.start",
        "status": 200,
        "headers": [
            (b"content-type", b"application/json"),
        ],
    })
    await send({"type": "http.response.body", "body": body})


def run_cli_demo():
    """Run CLI demo after a short delay to let uvicorn start."""
    import time
    time.sleep(2)
    import scripts.cli_demo as cli_demo
    cli_demo.main()
    # Keep alive after demo
    while True:
        time.sleep(60)


if __name__ == "__main__":
    print(f"[serve] Starting uvicorn health server on 0.0.0.0:{PORT}")
    t = threading.Thread(target=run_cli_demo, daemon=True)
    t.start()

    import uvicorn
    uvicorn.run(health_app, host="0.0.0.0", port=PORT, log_level="warning")
