"use client";

import DashboardChat, {
  type DashboardArtifact,
  type DashboardChatMessage,
} from "@/components/dashboard/dashboard-chat";
import { agentLabel, type AgentStep } from "@/components/ai-elements/reasoning";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MessageSquareMoreIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { type ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type SavedReport = {
  id: string;
  messageId: string;
  content: string;
  title: string;
  savedAt: string;
  sessionId?: string;
  datasetName?: string;
};

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
  dataset_file_available: boolean;
  artifacts: DashboardArtifact[];
  messages: BackendChatMessage[];
  created_at: string;
  updated_at: string;
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
  const [datasetSummary, setDatasetSummary] = useState("");
  const [datasetFileAvailable, setDatasetFileAvailable] = useState(true);
  const [artifacts, setArtifacts] = useState<DashboardArtifact[]>([]);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [agentSteps, setAgentSteps] = useState<AgentStep[]>([]);
  const [isAgentPipelineRunning, setIsAgentPipelineRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeSession = useMemo(
    () => sessions.find((session) => session.session_id === activeSessionId) ?? null,
    [sessions, activeSessionId]
  );
  const hasDatasetName = Boolean(activeSession?.dataset_name?.trim());
  // File is missing when the session recorded a dataset name but the file is no
  // longer available on the server (e.g. after a restart / redeployment).
  const isDatasetFileMissing = hasDatasetName && !datasetFileAvailable;
  const hasDataset = hasDatasetName && datasetFileAvailable;

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

  const deleteSession = useCallback(async (sessionId: string) => {
    const response = await fetch(`/api/chat/sessions/${sessionId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(payload.error || "Failed to delete chat session.");
    }
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
        setDatasetFileAvailable(session.dataset_file_available ?? true);
        setArtifacts(session.artifacts ?? []);
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
      setArtifacts(created.artifacts ?? []);

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

  const handleDeleteChat = useCallback(
    async (sessionId: string) => {
      setError(null);
      try {
        await deleteSession(sessionId);
        const nextSessions = await refreshSessions();

        if (activeSessionId === sessionId) {
          if (nextSessions.length > 0) {
            await openSession(nextSessions[0].session_id);
          } else {
            const createdId = await handleNewChat();
            if (!createdId) {
              setMessages([]);
              setDatasetSummary("");
              setDatasetFileAvailable(true);
              setArtifacts([]);
              setActiveSessionId(null);
            }
          }
        }

        toast.success("Chat deleted.");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unable to delete chat.";
        setError(message);
        toast.error(message);
      }
    },
    [activeSessionId, deleteSession, handleNewChat, openSession, refreshSessions]
  );

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
        if (!sessionId) return;
      }

      const userMsgId = `local-user-${Date.now()}`;
      const assistantMsgId = `streaming-${Date.now()}`;

      setMessages((prev) => [
        ...prev,
        { id: userMsgId, role: "user", content: text },
        { id: assistantMsgId, role: "assistant", content: "" },
      ]);
      setStreamingMessageId(assistantMsgId);
      setAgentSteps([]);
      setIsAgentPipelineRunning(true);
      setIsSending(true);

      try {
        const response = await fetch("/api/chat/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, message: text }),
        });

        if (!response.ok || !response.body) {
          const errPayload = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(errPayload.error || "Failed to send message.");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let firstTokenReceived = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          // SSE blocks are separated by double newlines.
          const blocks = buffer.split("\n\n");
          buffer = blocks.pop() ?? "";

          for (const block of blocks) {
            const line = block.trim();
            if (!line.startsWith("data: ")) continue;

            let event: { type: string; content?: string; agent?: string; session_id?: string; message?: string };
            try {
              event = JSON.parse(line.slice(6)) as typeof event;
            } catch {
              continue;
            }

            if (event.type === "agent_start" && event.agent) {
              const step: AgentStep = {
                agent: event.agent,
                label: agentLabel(event.agent),
                status: "running",
                startTime: Date.now(),
              };
              setAgentSteps((prev) => {
                const exists = prev.some((s) => s.agent === event.agent);
                return exists
                  ? prev.map((s) => (s.agent === event.agent ? { ...s, status: "running" } : s))
                  : [...prev, step];
              });
            } else if (event.type === "agent_done" && event.agent) {
              setAgentSteps((prev) =>
                prev.map((s) =>
                  s.agent === event.agent
                    ? { ...s, status: "done", durationMs: Date.now() - s.startTime }
                    : s
                )
              );
            } else if (event.type === "token" && event.content) {
              // First token means the pipeline finished — collapse the reasoning panel.
              if (!firstTokenReceived) {
                firstTokenReceived = true;
                setIsAgentPipelineRunning(false);
              }
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMsgId
                    ? { ...msg, content: msg.content + event.content }
                    : msg
                )
              );
            } else if (event.type === "error") {
              throw new Error(event.message ?? "Agent workflow failed.");
            }
          }
        }

        // Replace optimistic local messages with the canonical server version.
        if (sessionId) {
          try {
            const updated = await fetchSessionById(sessionId);
            setMessages(mapMessages(updated.messages));
            setArtifacts(updated.artifacts ?? []);
          } catch {
            // Non-fatal — optimistic messages are still correct.
          }
        }
        await refreshSessions();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Message delivery failed.";
        setError(message);
        // Remove both the optimistic user message and the empty assistant message.
        setMessages((prev) =>
          prev.filter((item) => item.id !== userMsgId && item.id !== assistantMsgId)
        );
      } finally {
        setStreamingMessageId(null);
        setIsAgentPipelineRunning(false);
        setIsSending(false);
      }
    },
    [activeSessionId, fetchSessionById, handleNewChat, hasDataset, refreshSessions]
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
        setDatasetFileAvailable(true);
        setArtifacts([]);
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
          setDatasetFileAvailable(created.dataset_file_available ?? true);
          setArtifacts(created.artifacts ?? []);
          return;
        }

        const firstSession = await fetchSessionById(initialSessions[0].session_id);
        if (cancelled) return;

        setActiveSessionId(firstSession.session_id);
        setMessages(mapMessages(firstSession.messages));
        setDatasetSummary(firstSession.dataset_summary || "");
        setDatasetFileAvailable(firstSession.dataset_file_available ?? true);
        setArtifacts(firstSession.artifacts ?? []);
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

  function saveReport(message: DashboardChatMessage): void {
    throw new Error("Function not implemented.");
  }

  function downloadPdf(message: DashboardChatMessage): void {
    throw new Error("Function not implemented.");
  }

  const downloadArtifact = useCallback(
    async (artifact: DashboardArtifact) => {
      if (!activeSessionId) {
        toast.error("No active chat session.");
        return;
      }

      try {
        const response = await fetch(
          `/api/chat/sessions/${encodeURIComponent(activeSessionId)}/artifacts/${encodeURIComponent(artifact.artifact_id)}/download`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(payload.error || "Failed to download artifact.");
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = artifact.name || "artifact.bin";
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to download artifact.";
        setError(message);
        toast.error(message);
      }
    },
    [activeSessionId]
  );

  return (
    <div className="grid h-full min-h-0 flex-1 gap-4 px-4 lg:grid-cols-[300px_minmax(0,1fr)] lg:px-6">
      {/* ── Chat History Sidebar ── */}
      <aside className="flex h-full min-h-0 flex-col rounded-2xl border border-[var(--chat-border)] bg-[var(--chat-surface)] p-3 shadow-[inset_0_1px_0_var(--chat-border-soft)]">
        <div className="mb-3 flex items-center justify-between px-1">
          <h2 className="text-sm font-semibold tracking-tight text-[var(--chat-text)]">Chat History</h2>
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 border-[var(--chat-border)] bg-[var(--chat-surface-elev)] text-[var(--chat-text-soft)] hover:bg-[var(--chat-surface-elev)] hover:text-[var(--chat-text)]"
            onClick={() => void handleNewChat()}
            disabled={isBooting || isSwitching}
          >
            <PlusIcon className="size-3.5" />
            New
          </Button>
        </div>

        <div className="flex-1 space-y-1 overflow-y-auto pr-0.5">
          {sessions.map((chat) => (
            <div
              key={chat.session_id}
              className={cn(
                "flex w-full items-start gap-2 rounded-xl border px-2 py-2 transition-colors",
                activeSessionId === chat.session_id
                  ? "border-[var(--chat-border)] bg-[var(--chat-surface-elev)]"
                  : "border-transparent hover:border-[var(--chat-border)] hover:bg-[var(--chat-surface-elev)]"
              )}
            >
              <MessageSquareMoreIcon className="mt-0.5 size-4 shrink-0 text-[var(--chat-text-muted)]" />
              <button
                type="button"
                onClick={() => void openSession(chat.session_id)}
                disabled={isBooting || isSwitching}
                className="min-w-0 flex-1 text-left"
              >
                <span className="block truncate text-sm font-medium text-[var(--chat-text)]">
                  {chat.title || "New chat"}
                </span>
                <span className="block truncate text-xs text-[var(--chat-text-muted)]">
                  {chat.dataset_name ? `📊 ${chat.dataset_name}` : chat.preview || "No messages yet"}
                </span>
              </button>
              <span className="shrink-0 text-[10px] text-[var(--chat-text-muted)]">
                {formatRelativeTime(chat.updated_at)}
              </span>
              <button
                type="button"
                onClick={() => void handleDeleteChat(chat.session_id)}
                disabled={isBooting || isSwitching}
                aria-label={`Delete ${chat.title || "chat"}`}
                className="rounded-md p-1 text-[var(--chat-text-muted)] transition-colors hover:bg-[var(--chat-surface)] hover:text-destructive disabled:opacity-50"
              >
                <Trash2Icon className="size-3.5" />
              </button>
            </div>
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
        {/* key forces a full remount on session switch so StickToBottom resets scroll */}
        <DashboardChat
          key={activeSessionId ?? "none"}
          className="flex-1 h-full"
          messages={messages}
          onSend={sendMessage}
          onClear={() => void handleNewChat()}
          isSending={isSending || isSwitching || isBooting}
          disabled={isBooting || isUploading || !hasDataset}
          hasDataset={hasDataset}
          datasetName={activeSession?.dataset_name ?? undefined}
          isDatasetFileMissing={isDatasetFileMissing}
          isUploading={isUploading}
          onFileUpload={uploadDataset}
          streamingMessageId={streamingMessageId}
          agentSteps={agentSteps}
          isAgentPipelineRunning={isAgentPipelineRunning}
          onSaveReport={saveReport}
          onDownloadPdf={downloadPdf}
          artifacts={artifacts}
          onDownloadArtifact={downloadArtifact}
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
