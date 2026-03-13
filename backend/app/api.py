from __future__ import annotations

import logging
import os
import time
from pathlib import Path
from uuid import uuid4

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse


setup_logging()
logger = logging.getLogger(__name__)


def _allowed_origins() -> list[str]:
    raw = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
    return [item.strip() for item in raw.split(",") if item.strip()]


ROOT_DIR = Path(__file__).resolve().parents[1]
CONFIG_PATH = ROOT_DIR / "config" / "agents.yaml"
AGENTS_DIR = ROOT_DIR / "app" / "agents"

session_service = ChatSessionService()
analysis_service = AnalysisService(config_path=CONFIG_PATH, agents_dir=AGENTS_DIR)

app = FastAPI(title="InsightForge API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    request_id = uuid4().hex[:8]
    started = time.perf_counter()
    logger.info("[request:%s] started %s %s", request_id, request.method, request.url.path)

    try:
        response = await call_next(request)
    except Exception:
        logger.exception("[request:%s] unhandled exception", request_id)
        raise

    duration_ms = (time.perf_counter() - started) * 1000
    logger.info(
        "[request:%s] completed %s %s status=%s duration_ms=%.2f",
        request_id,
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
    )
    response.headers["X-Request-ID"] = request_id
    return response


@app.get("/api/v1/health")
def health():
    return {"status": "ok"}