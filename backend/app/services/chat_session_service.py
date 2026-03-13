from __future__ import annotations

import logging
import os
from dataclasses import dataclass, field
from datetime import datetime, timezone
from threading import Lock
from uuid import uuid4

try:
    from pymongo import DESCENDING, MongoClient
except ImportError:  # pragma: no cover - optional dependency in local setup
    DESCENDING = None
    MongoClient = None

from app.models.api import ChatMessage


logger = logging.getLogger(__name__)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _normalize_datetime(value: datetime | str | None) -> datetime:
    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value

    if isinstance(value, str) and value:
        try:
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
            if parsed.tzinfo is None:
                return parsed.replace(tzinfo=timezone.utc)
            return parsed
        except ValueError:
            return _utcnow()

    return _utcnow()


@dataclass
class ChatSession:
    session_id: str
    user_id: str | None
    title: str
    dataset_name: str
    dataset_path: str
    dataset_summary: str
    dataset_context: str
    messages: list[ChatMessage] = field(default_factory=list)
    artifacts: list[dict[str, str]] = field(default_factory=list)
    created_at: datetime = field(default_factory=_utcnow)
    updated_at: datetime = field(default_factory=_utcnow)


@dataclass
class ChatSessionSummary:
    session_id: str
    user_id: str | None
    title: str
    dataset_name: str
    message_count: int
    preview: str
    created_at: datetime
    updated_at: datetime


class ChatSessionService:
    def __init__(self):
        self._sessions: dict[str, ChatSession] = {}
        self._lock = Lock()
        self._collection = None
        self._init_mongo()

    def _init_mongo(self) -> None:
        mongo_uri = (
            os.getenv("MONGODB_URI")
            or os.getenv("MONGO_URI")
            or os.getenv("MONGODB_URL")
        )

        if not mongo_uri:
            logger.warning("MongoDB URI not set. Falling back to in-memory chat sessions.")
            return

        if MongoClient is None:
            logger.warning("pymongo is not installed. Falling back to in-memory chat sessions.")
            return

        db_name = os.getenv("MONGODB_DB_NAME", "insightforge")
        collection_name = os.getenv("MONGODB_CHAT_COLLECTION", "chat_sessions")

        try:
            client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
            client.admin.command("ping")
            self._collection = client[db_name][collection_name]
            self._collection.create_index("session_id", unique=True)
            self._collection.create_index([("user_id", DESCENDING), ("updated_at", DESCENDING)])
            logger.info("ChatSessionService connected to MongoDB db=%s collection=%s", db_name, collection_name)
        except Exception:
            logger.exception("Failed to connect to MongoDB. Falling back to in-memory chat sessions.")
            self._collection = None

    def _message_to_doc(self, message: ChatMessage) -> dict[str, object]:
        return {
            "role": message.role,
            "content": message.content,
            "created_at": _normalize_datetime(message.created_at),
        }

    def _message_from_doc(self, payload: dict[str, object]) -> ChatMessage:
        return ChatMessage(
            role=str(payload.get("role", "assistant")),
            content=str(payload.get("content", "")),
            created_at=_normalize_datetime(payload.get("created_at")),
        )

    def _session_to_doc(self, session: ChatSession) -> dict[str, object]:
        return {
            "session_id": session.session_id,
            "user_id": session.user_id,
            "title": session.title,
            "dataset_name": session.dataset_name,
            "dataset_path": session.dataset_path,
            "dataset_summary": session.dataset_summary,
            "dataset_context": session.dataset_context,
            "messages": [self._message_to_doc(msg) for msg in session.messages],
            "artifacts": session.artifacts,
            "created_at": _normalize_datetime(session.created_at),
            "updated_at": _normalize_datetime(session.updated_at),
        }

    def _session_from_doc(self, payload: dict[str, object]) -> ChatSession:
        messages = payload.get("messages", []) or []
        return ChatSession(
            session_id=str(payload.get("session_id", "")),
            user_id=payload.get("user_id") if isinstance(payload.get("user_id"), str) else None,
            title=str(payload.get("title") or "New chat"),
            dataset_name=str(payload.get("dataset_name") or ""),
            dataset_path=str(payload.get("dataset_path") or ""),
            dataset_summary=str(payload.get("dataset_summary") or ""),
            dataset_context=str(payload.get("dataset_context") or ""),
            messages=[self._message_from_doc(item) for item in messages if isinstance(item, dict)],
            artifacts=[item for item in (payload.get("artifacts") or []) if isinstance(item, dict)],
            created_at=_normalize_datetime(payload.get("created_at")),
            updated_at=_normalize_datetime(payload.get("updated_at")),
        )

    def _save_session(self, session: ChatSession) -> None:
        if self._collection is not None:
            self._collection.replace_one(
                {"session_id": session.session_id},
                self._session_to_doc(session),
                upsert=True,
            )
            return

        with self._lock:
            self._sessions[session.session_id] = session

    def _title_from_content(self, content: str) -> str:
        compact = " ".join(content.strip().split())
        if not compact:
            return "New chat"
        return compact[:72]

    def create_session(
        self,
        user_id: str | None = None,
        title: str | None = None,
        session_id: str | None = None,
    ) -> ChatSession:
        resolved_id = session_id or str(uuid4())
        now = _utcnow()
        session = ChatSession(
            session_id=resolved_id,
            user_id=user_id,
            title=(title or "New chat").strip() or "New chat",
            dataset_name="",
            dataset_path="",
            dataset_summary="",
            dataset_context="",
            messages=[],
            artifacts=[],
            created_at=now,
            updated_at=now,
        )
        self._save_session(session)
        return session

    def create_or_update_session(
        self,
        dataset_name: str,
        dataset_path: str,
        dataset_summary: str,
        dataset_context: str,
        session_id: str | None = None,
        user_id: str | None = None,
        title: str | None = None,
    ) -> ChatSession:
        resolved_id = session_id or str(uuid4())
        existing = self.get_session(resolved_id, user_id=user_id)
        created_at = existing.created_at if existing else _utcnow()
        now = _utcnow()
        resolved_title = (title or dataset_name or "New chat").strip() or "New chat"

        session = ChatSession(
            session_id=resolved_id,
            user_id=user_id,
            title=resolved_title,
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
            artifacts=[],
            created_at=created_at,
            updated_at=now,
        )
        self._save_session(session)
        return session

    def list_sessions(self, user_id: str | None = None, limit: int = 50) -> list[ChatSessionSummary]:
        if self._collection is not None:
            query: dict[str, object] = {}
            if user_id:
                query["user_id"] = user_id

            cursor = self._collection.find(query).sort("updated_at", DESCENDING).limit(max(1, limit))
            sessions = [self._session_from_doc(item) for item in cursor]
        else:
            with self._lock:
                sessions = list(self._sessions.values())
            if user_id:
                sessions = [session for session in sessions if session.user_id == user_id]
            sessions.sort(key=lambda item: _normalize_datetime(item.updated_at), reverse=True)
            sessions = sessions[: max(1, limit)]

        summaries: list[ChatSessionSummary] = []
        for session in sessions:
            non_system = [msg for msg in session.messages if msg.role != "system"]
            preview = non_system[-1].content if non_system else ""
            summaries.append(
                ChatSessionSummary(
                    session_id=session.session_id,
                    user_id=session.user_id,
                    title=session.title,
                    dataset_name=session.dataset_name,
                    message_count=len(session.messages),
                    preview=preview,
                    created_at=session.created_at,
                    updated_at=session.updated_at,
                )
            )

        return summaries

    def get_session(self, session_id: str, user_id: str | None = None) -> ChatSession | None:
        if self._collection is not None:
            query: dict[str, object] = {"session_id": session_id}
            if user_id:
                query["user_id"] = user_id

            payload = self._collection.find_one(query)
            if not payload:
                return None
            return self._session_from_doc(payload)

        with self._lock:
            session = self._sessions.get(session_id)

        if not session:
            return None
        if user_id and session.user_id != user_id:
            return None
        return session

    def append_message(
        self,
        session_id: str,
        role: str,
        content: str,
        user_id: str | None = None,
    ) -> ChatSession:
        session = self.get_session(session_id, user_id=user_id)
        if not session:
            raise KeyError(session_id)

        session.messages.append(ChatMessage(role=role, content=content))
        if role == "user" and (not session.title or session.title == "New chat"):
            session.title = self._title_from_content(content)
        session.updated_at = _utcnow()
        self._save_session(session)
        return session

    def add_artifacts(
        self,
        session_id: str,
        artifacts: list[dict[str, str]],
        user_id: str | None = None,
    ) -> ChatSession:
        session = self.get_session(session_id, user_id=user_id)
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

        session.updated_at = _utcnow()
        self._save_session(session)
        return session

    def list_artifacts(self, session_id: str, user_id: str | None = None) -> list[dict[str, str]]:
        session = self.get_session(session_id, user_id=user_id)
        if not session:
            raise KeyError(session_id)
        return list(session.artifacts)

    def get_artifact(
        self,
        session_id: str,
        artifact_id: str,
        user_id: str | None = None,
    ) -> dict[str, str] | None:
        session = self.get_session(session_id, user_id=user_id)
        if not session:
            return None

        for artifact in session.artifacts:
            if artifact.get("artifact_id") == artifact_id:
                return artifact

        return None
