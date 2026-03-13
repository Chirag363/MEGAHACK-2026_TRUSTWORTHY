from __future__ import annotations

import logging
import os
import time
from pathlib import Path
from uuid import uuid4

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from app.core.logging_config import setup_logging
from app.models.api import ChatRequest, ChatResponse, DatasetUploadResponse, SessionResponse
from app.services.analysis_service import AnalysisService
from app.services.chat_session_service import ChatSessionService
from app.services.dataset_service import save_uploaded_dataset, summarize_dataset_upload

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


@app.post("/api/v1/chat/upload", response_model=DatasetUploadResponse)
async def upload_dataset(
    file: UploadFile = File(...),
    session_id: str | None = Form(default=None),
):
    resolved_session_id = session_id or str(uuid4())
    logger.info("upload received: filename=%s session_id=%s", file.filename, resolved_session_id)

    try:
        raw_bytes = await file.read()
        dataset_context, dataset_summary = summarize_dataset_upload(file.filename or "dataset", raw_bytes)
        dataset_path = save_uploaded_dataset(
            session_id=resolved_session_id,
            filename=file.filename or "dataset.csv",
            raw_bytes=raw_bytes,
        )
    except ValueError as exc:
        logger.warning("upload rejected: filename=%s reason=%s", file.filename, exc)
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    session = session_service.create_or_update_session(
        session_id=resolved_session_id,
        dataset_name=file.filename or "dataset",
        dataset_path=str(dataset_path),
        dataset_summary=dataset_summary,
        dataset_context=dataset_context,
    )

    logger.info(
        "upload processed: session_id=%s dataset_path=%s summary=%s",
        session.session_id,
        session.dataset_path,
        dataset_summary,
    )
    return DatasetUploadResponse(
        session_id=session.session_id,
        dataset_name=session.dataset_name,
        dataset_summary=session.dataset_summary,
        messages=session.messages,
    )


@app.post("/api/v1/chat/message", response_model=ChatResponse)
def chat_message(payload: ChatRequest):
    run_id = uuid4().hex[:10]
    logger.info("[run:%s] chat message received session_id=%s", run_id, payload.session_id)

    session = session_service.get_session(payload.session_id)
    if not session:
        logger.warning("[run:%s] unknown session_id=%s", run_id, payload.session_id)
        raise HTTPException(status_code=404, detail="Session not found. Upload a dataset first.")

    session_service.append_message(payload.session_id, "user", payload.message)

    recent_user_requests = [msg.content for msg in session.messages if msg.role == "user"][-3:]
    recent_context = "\n".join(f"- {item}" for item in recent_user_requests)
    full_dataset_context = (
        f"{session.dataset_context}\n\n"
        f"Recent user analysis requests:\n{recent_context or '- None'}"
    )

    try:
        result = analysis_service.run(
            goal=payload.message,
            dataset_context=full_dataset_context,
            dataset_path=session.dataset_path,
            dry_run=False,
            run_id=run_id,
        )
    except Exception as exc:
        logger.exception("[run:%s] workflow failed", run_id)
        raise HTTPException(status_code=500, detail=f"Agent workflow failed: {exc}") from exc

    reply = result["final_report"]
    session = session_service.append_message(payload.session_id, "assistant", reply)
    artifacts = result.get("artifacts", [])
    if artifacts:
        session = session_service.add_artifacts(payload.session_id, artifacts)

    agent_trace = [
        {"agent": item.get("agent", "unknown"), "content": item.get("content", "")}
        for item in result.get("conversation", [])
    ]

    logger.info(
        "[run:%s] workflow completed agent_steps=%s reply_chars=%s",
        run_id,
        len(agent_trace),
        len(reply),
    )

    return ChatResponse(
        session_id=payload.session_id,
        run_id=run_id,
        reply=reply,
        agent_outputs=result.get("agent_outputs", {}),
        agent_trace=agent_trace,
        artifacts=session.artifacts,
        messages=session.messages,
    )


@app.get("/api/v1/chat/session/{session_id}", response_model=SessionResponse)
def get_session(session_id: str):
    session = session_service.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    return SessionResponse(
        session_id=session.session_id,
        dataset_name=session.dataset_name,
        dataset_summary=session.dataset_summary,
        artifacts=session.artifacts,
        messages=session.messages,
    )


@app.get("/api/v1/chat/session/{session_id}/artifacts")
def get_session_artifacts(session_id: str):
    session = session_service.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    return {"session_id": session_id, "artifacts": session.artifacts}


@app.get("/api/v1/chat/session/{session_id}/artifacts/{artifact_id}/download")
def download_artifact(session_id: str, artifact_id: str):
    session = session_service.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    artifact = session_service.get_artifact(session_id, artifact_id)
    if not artifact:
        raise HTTPException(status_code=404, detail="Artifact not found.")

    artifact_path = Path(artifact.get("path", "")).resolve()
    if not artifact_path.exists() or not artifact_path.is_file():
        raise HTTPException(status_code=404, detail="Artifact file missing.")

    uploads_root = Path(os.getenv("DATA_UPLOAD_DIR", "data/uploads")).resolve()
    try:
        artifact_path.relative_to(uploads_root)
    except ValueError as exc:
        raise HTTPException(status_code=403, detail="Artifact path is outside allowed directory.") from exc

    return FileResponse(
        path=artifact_path,
        filename=artifact.get("name") or artifact_path.name,
        media_type="application/octet-stream",
    )
