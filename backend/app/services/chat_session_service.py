from __future__ import annotations

from dataclasses import dataclass, field
from threading import Lock
from uuid import uuid4

from app.models.api import ChatMessage


@dataclass
class ChatSession:
    session_id: str
    dataset_name: str
    dataset_path: str
    dataset_summary: str
    dataset_context: str
    messages: list[ChatMessage] = field(default_factory=list)
    artifacts: list[dict[str, str]] = field(default_factory=list)


class ChatSessionService:
    def __init__(self):
        self._sessions: dict[str, ChatSession] = {}
        self._lock = Lock()

    def create_or_update_session(
        self,
        dataset_name: str,
        dataset_path: str,
        dataset_summary: str,
        dataset_context: str,
        session_id: str | None = None,
    ) -> ChatSession:
        with self._lock:
            resolved_id = session_id or str(uuid4())
            session = ChatSession(
                session_id=resolved_id,
                dataset_name=dataset_name,
                dataset_path=dataset_path,
                dataset_summary=dataset_summary,
                dataset_context=dataset_context,
                messages=[
                    ChatMessage(
                        role="system",
                        content=(
                            f"Dataset '{dataset_name}' uploaded successfully. "
                            "You can now ask analysis questions."
                        ),
                    )
                ],
            )
            self._sessions[resolved_id] = session
            return session

    def get_session(self, session_id: str) -> ChatSession | None:
        with self._lock:
            return self._sessions.get(session_id)

    def append_message(self, session_id: str, role: str, content: str) -> ChatSession:
        with self._lock:
            session = self._sessions.get(session_id)
            if not session:
                raise KeyError(session_id)

            session.messages.append(ChatMessage(role=role, content=content))
            return session

    def add_artifacts(self, session_id: str, artifacts: list[dict[str, str]]) -> ChatSession:
        with self._lock:
            session = self._sessions.get(session_id)
            if not session:
                raise KeyError(session_id)

            existing = {item.get("artifact_id", "") for item in session.artifacts}
            for artifact in artifacts:
                artifact_id = artifact.get("artifact_id", "")
                if artifact_id and artifact_id in existing:
                    continue
                session.artifacts.append(artifact)
                if artifact_id:
                    existing.add(artifact_id)

            return session

    def list_artifacts(self, session_id: str) -> list[dict[str, str]]:
        with self._lock:
            session = self._sessions.get(session_id)
            if not session:
                raise KeyError(session_id)
            return list(session.artifacts)

    def get_artifact(self, session_id: str, artifact_id: str) -> dict[str, str] | None:
        with self._lock:
            session = self._sessions.get(session_id)
            if not session:
                return None

            for artifact in session.artifacts:
                if artifact.get("artifact_id") == artifact_id:
                    return artifact

            return None
