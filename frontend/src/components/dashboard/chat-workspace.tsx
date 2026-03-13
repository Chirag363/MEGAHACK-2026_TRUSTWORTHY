"use client";

import DashboardChat, { type DashboardChatMessage } from "@/components/dashboard/dashboard-chat";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MessageSquareMoreIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { type ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";

type ChatSessionListItem = {
  session_id: string;
  title: string;
  dataset_name: string;
  preview: string;
  message_count: number;
  created_at: string;
  updated_at: string;
};

type BackendChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
  created_at: string;
};

type SessionResponse = {
  session_id: string;
  title: string;
  dataset_name: string;
  dataset_summary: string;
  messages: BackendChatMessage[];
  created_at: string;
  updated_at: string;
};

type ChatResponse = {
  session_id: string;
  messages: BackendChatMessage[];
};

type DatasetUploadResponse = {
  session_id: string;
  dataset_name: string;
  dataset_summary: string;
  messages: BackendChatMessage[];
};

function mapMessages(messages: BackendChatMessage[]): DashboardChatMessage[] {
  return messages.map((message, index) => ({
    id: `${message.created_at}-${index}`,
    role: message.role,
    content: message.content,
  }));
}

function formatRelativeTime(value: string): string {
  const updatedAt = new Date(value).getTime();
  if (!Number.isFinite(updatedAt)) {
    return "Now";
  }

  const diffMs = Date.now() - updatedAt;
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return "Now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(updatedAt));
}

export default function ChatWorkspace() {
  const [sessions, setSessions] = useState<ChatSessionListItem[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DashboardChatMessage[]>([]);
  const [isBooting, setIsBooting] = useState(true);
  const [isSwitching, setIsSwitching] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [datasetSummary, setDatasetSummary] = useState("");
  const [error, setError] = useState<string | null>(null);

  const activeSession = useMemo(
    () => sessions.find((session) => session.session_id === activeSessionId) ?? null,
    [sessions, activeSessionId]
  );
  const hasDataset = Boolean(activeSession?.dataset_name?.trim());

  const fetchSessions = useCallback(async () => {
    const response = await fetch("/api/chat/sessions", {
      method: "GET",
      cache: "no-store",
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(payload.error || "Failed to load chat sessions.");
    }
    return (await response.json()) as ChatSessionListItem[];
  }, []);

  const fetchSessionById = useCallback(async (sessionId: string) => {
    const response = await fetch(`/api/chat/sessions/${sessionId}`, {
      method: "GET",
      cache: "no-store",
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(payload.error || "Failed to load chat session.");
    }
    return (await response.json()) as SessionResponse;
  }, []);

  const createSession = useCallback(async () => {
    const response = await fetch("/api/chat/sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title: "New chat" }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(payload.error || "Failed to create new chat.");
    }

    return (await response.json()) as SessionResponse;
  }, []);

  const refreshSessions = useCallback(async () => {
    const nextSessions = await fetchSessions();
    setSessions(nextSessions);
    return nextSessions;
  }, [fetchSessions]);

  const openSession = useCallback(
    async (sessionId: string) => {
      setIsSwitching(true);
      setError(null);
      try {
        const session = await fetchSessionById(sessionId);
        setActiveSessionId(session.session_id);
        setMessages(mapMessages(session.messages));
        setDatasetSummary(session.dataset_summary || "");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unable to open chat session.";
        setError(message);
      } finally {
        setIsSwitching(false);
      }
    },
    [fetchSessionById]
  );

  const handleNewChat = useCallback(async () => {
    setError(null);
    try {
      const created = await createSession();
      const nextList = await refreshSessions();
      setActiveSessionId(created.session_id);
      setMessages(mapMessages(created.messages));
      setDatasetSummary(created.dataset_summary || "");

      if (!nextList.some((item) => item.session_id === created.session_id)) {
        setSessions((prev) => [
          {
            session_id: created.session_id,
            title: created.title,
            dataset_name: created.dataset_name || "",
            preview: "",
            message_count: created.messages.length,
            created_at: created.created_at,
            updated_at: created.updated_at,
          },
          ...prev,
        ]);
      }
      return created.session_id;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to create chat.";
      setError(message);
      return null;
    }
  }, [createSession, refreshSessions]);

  const sendMessage = useCallback(
    async (text: string) => {
      setError(null);
      if (!hasDataset) {
        setError("Please upload a dataset before sending a chat message.");
        return;
      }
      let sessionId = activeSessionId;

      if (!sessionId) {
        sessionId = await handleNewChat();
        if (!sessionId) {
          return;
        }
      }

      const optimisticUserMessage: DashboardChatMessage = {
        id: `local-${Date.now()}`,
        role: "user",
        content: text,
      };
      setMessages((prev) => [...prev, optimisticUserMessage]);
      setIsSending(true);

      try {
        const response = await fetch("/api/chat/message", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sessionId,
            message: text,
          }),
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(payload.error || "Failed to send message.");
        }

        const payload = (await response.json()) as ChatResponse;
        setMessages(mapMessages(payload.messages));
        await refreshSessions();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Message delivery failed.";
        setError(message);
        setMessages((prev) => prev.filter((item) => item.id !== optimisticUserMessage.id));
      } finally {
        setIsSending(false);
      }
    },
    [activeSessionId, handleNewChat, hasDataset, refreshSessions]
  );

  const uploadDataset = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";

      if (!file) {
        return;
      }

      setError(null);
      let sessionId = activeSessionId;
      if (!sessionId) {
        sessionId = await handleNewChat();
        if (!sessionId) {
          return;
        }
      }

      const formData = new FormData();
      formData.set("file", file);
      formData.set("sessionId", sessionId);

      setIsUploading(true);
      try {
        const response = await fetch("/api/chat/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(payload.error || "Failed to upload dataset.");
        }

        const payload = (await response.json()) as DatasetUploadResponse;
        setActiveSessionId(payload.session_id);
        setMessages(mapMessages(payload.messages));
        setDatasetSummary(payload.dataset_summary || "");
        await refreshSessions();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Dataset upload failed.";
        setError(message);
      } finally {
        setIsUploading(false);
      }
    },
    [activeSessionId, handleNewChat, refreshSessions]
  );

  const clearChatHistory = useCallback(async () => {
    setError(null);
    setIsClearing(true);
    try {
      const response = await fetch("/api/chat/sessions", {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error || "Failed to clear chat history.");
      }

      setSessions([]);
      setActiveSessionId(null);
      setMessages([]);
      setDatasetSummary("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to clear chat history.";
      setError(message);
    } finally {
      setIsClearing(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      setIsBooting(true);
      setError(null);
      try {
        const initialSessions = await fetchSessions();
        if (cancelled) return;

        setSessions(initialSessions);

        if (initialSessions.length === 0) {
          const created = await createSession();
          if (cancelled) return;

          setSessions([
            {
              session_id: created.session_id,
              title: created.title,
              dataset_name: created.dataset_name || "",
              preview: "",
              message_count: created.messages.length,
              created_at: created.created_at,
              updated_at: created.updated_at,
            },
          ]);
          setActiveSessionId(created.session_id);
          setMessages(mapMessages(created.messages));
          setDatasetSummary(created.dataset_summary || "");
          return;
        }

        const firstSession = await fetchSessionById(initialSessions[0].session_id);
        if (cancelled) return;

        setActiveSessionId(firstSession.session_id);
        setMessages(mapMessages(firstSession.messages));
        setDatasetSummary(firstSession.dataset_summary || "");
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Failed to initialize chat.";
        setError(message);
      } finally {
        if (!cancelled) {
          setIsBooting(false);
        }
      }
    }

    void initialize();

    return () => {
      cancelled = true;
    };
  }, [createSession, fetchSessionById, fetchSessions]);

  return (
    <div className="grid h-full min-h-0 flex-1 gap-4 px-4 lg:grid-cols-[300px_minmax(0,1fr)] lg:px-6">
      {/* ── Chat History Sidebar ── */}
      <aside className="flex h-full min-h-0 flex-col rounded-2xl border border-[var(--chat-border)] bg-[var(--chat-surface)] p-3 shadow-[inset_0_1px_0_var(--chat-border-soft)]">
        <div className="mb-3 flex items-center justify-between px-1">
          <h2 className="text-sm font-semibold tracking-tight text-[var(--chat-text)]">Chat History</h2>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 border-[var(--chat-border)] bg-[var(--chat-surface-elev)] text-[var(--chat-text-soft)] hover:bg-[var(--chat-surface-elev)] hover:text-[var(--chat-text)]"
              onClick={() => void clearChatHistory()}
              disabled={isBooting || isClearing || sessions.length === 0}
            >
              <Trash2Icon className="size-3.5" />
              {isClearing ? "Clearing..." : "Clear"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 border-[var(--chat-border)] bg-[var(--chat-surface-elev)] text-[var(--chat-text-soft)] hover:bg-[var(--chat-surface-elev)] hover:text-[var(--chat-text)]"
              onClick={() => void handleNewChat()}
              disabled={isBooting || isClearing}
            >
              <PlusIcon className="size-3.5" />
              New
            </Button>
          </div>
        </div>

        <div className="flex-1 space-y-1 overflow-y-auto pr-0.5">
          {sessions.map((chat) => (
            <button
              key={chat.session_id}
              type="button"
              onClick={() => void openSession(chat.session_id)}
              className={cn(
                "flex w-full cursor-pointer items-start gap-2.5 rounded-xl border px-2.5 py-2 text-left transition-colors",
                activeSessionId === chat.session_id
                  ? "border-[var(--chat-border)] bg-[var(--chat-surface-elev)]"
                  : "border-transparent hover:border-[var(--chat-border)] hover:bg-[var(--chat-surface-elev)]"
              )}
            >
              <MessageSquareMoreIcon className="mt-0.5 size-4 shrink-0 text-[var(--chat-text-muted)]" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-[var(--chat-text)]">
                  {chat.title || "New chat"}
                </span>
                <span className="block truncate text-xs text-[var(--chat-text-muted)]">
                  {chat.dataset_name ? `📊 ${chat.dataset_name}` : chat.preview || "No messages yet"}
                </span>
              </span>
              <span className="shrink-0 text-[10px] text-[var(--chat-text-muted)]">
                {formatRelativeTime(chat.updated_at)}
              </span>
            </button>
          ))}

          {sessions.length === 0 && (
            <div className="rounded-xl border border-dashed border-[var(--chat-border)] px-3 py-3 text-xs text-[var(--chat-text-muted)]">
              No chats yet. Click <span className="font-medium text-[var(--chat-text)]">+ New</span> to start.
            </div>
          )}
        </div>
      </aside>

      {/* ── Main Chat Area ── */}
      <div className="flex h-full min-h-0 min-w-0 flex-col gap-3">
        {/* Chat component */}
        <DashboardChat
          className="flex-1 h-full"
          messages={messages}
          onSend={sendMessage}
          onClear={() => void handleNewChat()}
          isSending={isSending || isSwitching || isBooting}
          disabled={isBooting || isUploading || !hasDataset}
          hasDataset={hasDataset}
          datasetName={activeSession?.dataset_name ?? undefined}
          isUploading={isUploading}
          onFileUpload={uploadDataset}
          description={
            activeSession
              ? hasDataset
                ? `Session ${activeSession.session_id.slice(0, 8)} · ${activeSession.title}`
                : `Session ${activeSession.session_id.slice(0, 8)} · upload dataset to continue`
              : "Loading chat session…"
          }
        />

        {error && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
