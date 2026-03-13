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
    dataset_name: str
    dataset_summary: str
    artifacts: List[ArtifactItem] = Field(default_factory=list)
    messages: List[ChatMessage]
