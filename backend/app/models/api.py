from __future__ import annotations

from datetime import datetime, timezone
from typing import Dict, List, Literal

from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class DatasetUploadResponse(BaseModel):
    session_id: str
    dataset_name: str
    dataset_summary: str
    messages: List[ChatMessage]


class ChatRequest(BaseModel):
    session_id: str
    message: str = Field(min_length=1, max_length=4000)
    user_id: str | None = None


class CreateSessionRequest(BaseModel):
    session_id: str | None = None
    title: str | None = None
    user_id: str | None = None


class AgentTraceItem(BaseModel):
    agent: str
    content: str


class ArtifactItem(BaseModel):
    artifact_id: str
    name: str
    kind: str
    path: str
    created_at: str
    source_tool: str = ""


class ChatResponse(BaseModel):
    session_id: str
    run_id: str
    reply: str
    agent_outputs: Dict[str, str]
    agent_trace: List[AgentTraceItem]
    artifacts: List[ArtifactItem] = Field(default_factory=list)
    messages: List[ChatMessage]


class SessionResponse(BaseModel):
    session_id: str
    user_id: str | None = None
    title: str = "New chat"
    dataset_name: str
    dataset_summary: str
    # True when the dataset file physically exists on disk and can be used for analysis.
    # False means the session had a dataset before but the file is no longer available
    # (e.g. after a server restart) — the user must re-upload it.
    dataset_file_available: bool = True
    artifacts: List[ArtifactItem] = Field(default_factory=list)
    messages: List[ChatMessage]
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class SessionListItem(BaseModel):
    session_id: str
    user_id: str | None = None
    title: str = "New chat"
    dataset_name: str
    message_count: int = 0
    preview: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
