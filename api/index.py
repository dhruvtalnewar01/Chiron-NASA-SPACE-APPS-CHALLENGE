"""
CHIRON v2.0 - Vercel Serverless Function Bridge
Bridges the FastAPI backend to Vercel's serverless Python runtime.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

# Mark environment as Vercel serverless
os.environ["VERCEL"] = "1"

# Resolve directory structure
CURRENT_DIR = Path(__file__).resolve().parent
ROOT_DIR = CURRENT_DIR.parent

# Locate backend directory across possible execution environments
candidate_dirs = [
    ROOT_DIR / "backend",
    CURRENT_DIR / "backend",
    Path.cwd() / "backend",
    Path.cwd(),
]

backend_dir = None
for candidate in candidate_dirs:
    if (candidate / "main.py").exists():
        backend_dir = candidate
        break

if backend_dir and str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

# Import the FastAPI application instance
from main import app  # noqa: E402, F401
