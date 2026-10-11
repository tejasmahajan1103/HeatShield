import os
import sys
import zipfile
from pathlib import Path

REQUIRED_FILES = [
    "lambda_handler.py",
    "config.py",
    "models.py",
    "openweather_adapter.py",
    "weather_service.py",
    "heat_risk_engine.py",
    "coolspot_adapter.py",
    "coolspot_service.py",
    "risk_history_service.py",
]

def build_package():
    backend_dir = Path(__file__).parent.resolve()
    project_root = backend_dir.parent.resolve()
    output_dir = project_root / "dist"
    output_dir.mkdir(parents=True, exist_ok=True)
    zip_path = output_dir / "lambda_function.zip"

    print(f"Building AWS Lambda deployment package at: {zip_path}")

    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for fname in REQUIRED_FILES:
            file_path = backend_dir / fname
            if not file_path.exists():
                raise FileNotFoundError(f"Missing required Lambda file: {fname}")
            zf.write(file_path, arcname=fname)
            print(f"  + Added {fname} ({file_path.stat().st_size} bytes)")

    zip_size_kb = zip_path.stat().st_size / 1024.0
    print(f"\nSuccessfully generated {zip_path.name} ({zip_size_kb:.2f} KB).")
    return zip_path

if __name__ == "__main__":
    build_package()
