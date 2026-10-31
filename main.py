"""
Root entrypoint fallback for FastAPI Cloud / platforms running from workspace root.
"""
import sys
import os

_root_dir = os.path.dirname(os.path.abspath(__file__))
_backend_dir = os.path.join(_root_dir, "backend")
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

try:
    from app.main import app
except ImportError:
    from backend.app.main import app

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)

