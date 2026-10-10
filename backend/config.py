import os
from pathlib import Path

def load_env():
    """Simple parser for backend/.env file if present without external dependencies."""
    env_path = Path(__file__).parent / ".env"
    if env_path.exists():
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, val = line.split("=", 1)
                    key = key.strip()
                    val = val.strip().strip("'").strip('"')
                    if key not in os.environ:
                        os.environ[key] = val

load_env()

OPENWEATHER_API_KEY = os.environ.get("OPENWEATHER_API_KEY", "").strip()
OPENWEATHER_BASE_URL = os.environ.get("OPENWEATHER_BASE_URL", "https://api.openweathermap.org/data/2.5").strip()
PORT = int(os.environ.get("PORT", "8000"))
HOST = os.environ.get("HOST", "127.0.0.1").strip()
HTTP_TIMEOUT_SECONDS = float(os.environ.get("HTTP_TIMEOUT_SECONDS", "10.0"))
