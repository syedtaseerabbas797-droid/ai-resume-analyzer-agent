"""
FastAPI Cloud / Uvicorn Root Entrypoint
Exposes `app` directly so `fastapi run` or `uvicorn main:app` finds it by default.
"""
import sys
import os

# Ensure backend directory is in sys.path
_current_dir = os.path.dirname(os.path.abspath(__file__))
if _current_dir not in sys.path:
    sys.path.insert(0, _current_dir)

from app.main import app

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)

