"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

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

function formatDate(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function DashboardOverview() {
  const [sessions, setSessions] = useState<ChatSessionListItem[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<SessionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    const response = await fetch("/api/chat/sessions", { method: "GET", cache: "no-store" });
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(payload.error || "Failed to load sessions.");
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
      throw new Error(payload.error || "Failed to load session details.");
    }
    return (await response.json()) as SessionResponse;
  }, []);

  const loadSessionDetails = useCallback(
    async (sessionId: string) => {
      setIsLoadingSession(true);
      setError(null);
      try {
        const detail = await fetchSessionById(sessionId);
        setActiveSessionId(detail.session_id);
        setActiveSession(detail);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unable to load session details.";
        setError(message);
      } finally {
        setIsLoadingSession(false);
      }
    },
    [fetchSessionById]
  );

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      setIsLoading(true);
      setError(null);
      try {
        const list = await fetchSessions();
        if (cancelled) return;

        setSessions(list);
        if (list.length > 0) {
          const firstSessionId = list[0].session_id;
          setActiveSessionId(firstSessionId);
          const detail = await fetchSessionById(firstSessionId);
          if (cancelled) return;
          setActiveSession(detail);
        } else {
          setActiveSessionId(null);
          setActiveSession(null);
        }
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Failed to initialize dashboard.";
        setError(message);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void initialize();
    return () => {
      cancelled = true;
    };
  }, [fetchSessionById, fetchSessions]);

  const assistantMessages = useMemo(
    () => activeSession?.messages.filter((msg) => msg.role === "assistant") ?? [],
    [activeSession]
  );
  const userMessages = useMemo(
    () => activeSession?.messages.filter((msg) => msg.role === "user") ?? [],
    [activeSession]
  );

  const totals = useMemo(() => {
    const uploads = sessions.filter((item) => item.dataset_name.trim().length > 0).length;
    const messages = sessions.reduce((acc, item) => acc + item.message_count, 0);
    return {
      sessions: sessions.length,
      uploads,
      messages,
    };
  }, [sessions]);

  return (
    <div className="space-y-6 px-4 pb-6 lg:px-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs text-white/50">Total Sessions</p>
          <p className="mt-1 text-2xl font-semibold text-white">{totals.sessions}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs text-white/50">Datasets Uploaded</p>
          <p className="mt-1 text-2xl font-semibold text-white">{totals.uploads}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs text-white/50">Total Messages</p>
          <p className="mt-1 text-2xl font-semibold text-white">{totals.messages}</p>
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      )}

      {isLoading ? (
        <div className="rounded-xl border border-white/10 bg-black/20 p-6 text-sm text-white/70">
          Loading your dashboard data...
        </div>
      ) : sessions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/20 bg-black/20 p-6 text-sm text-white/70">
          No uploaded data yet. Go to{" "}
          <Link href="/dashboard/chat" className="text-white underline underline-offset-4">
            chat
          </Link>{" "}
          to upload a dataset and start analysis.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="rounded-xl border border-white/10 bg-black/20 p-3">
            <h2 className="mb-3 text-sm font-semibold text-white/90">Uploaded Data Sessions</h2>
            <div className="space-y-2">
              {sessions.map((session) => (
                <button
                  key={session.session_id}
                  type="button"
                  onClick={() => void loadSessionDetails(session.session_id)}
                  className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                    activeSessionId === session.session_id
                      ? "border-white/30 bg-white/10"
                      : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]"
                  }`}
                >
                  <p className="truncate text-sm font-medium text-white/90">
                    {session.title || "New chat"}
                  </p>
                  <p className="truncate text-xs text-white/55">
                    {session.dataset_name || "No dataset uploaded"}
                  </p>
                  <p className="mt-1 text-[11px] text-white/40">{formatDate(session.updated_at)}</p>
                </button>
              ))}
            </div>
          </aside>

          <section className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {activeSession?.title || "Session"}
                  </h3>
                  <p className="text-sm text-white/65">
                    Dataset: {activeSession?.dataset_name || "No dataset uploaded"}
                  </p>
                </div>
                <Link
                  href="/dashboard/chat"
                  className="rounded-md border border-white/20 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"
                >
                  Manage in Chat
                </Link>
              </div>

              <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm text-white/75">
                <p className="text-xs uppercase tracking-wide text-white/50">Dataset Summary</p>
                <p className="mt-1">{activeSession?.dataset_summary || "No summary available."}</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <h4 className="text-sm font-semibold text-white/90">Recent Analysis Outputs</h4>
                {isLoadingSession ? (
                  <p className="mt-3 text-sm text-white/60">Loading analysis messages...</p>
                ) : assistantMessages.length === 0 ? (
                  <p className="mt-3 text-sm text-white/60">No analysis output yet.</p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {assistantMessages.slice(-3).reverse().map((msg, idx) => (
                      <div key={`${msg.created_at}-${idx}`} className="rounded-md border border-white/10 p-2">
                        <p className="line-clamp-4 text-xs text-white/80">{msg.content}</p>
                        <p className="mt-1 text-[11px] text-white/45">{formatDate(msg.created_at)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <h4 className="text-sm font-semibold text-white/90">Recent User Requests</h4>
                {isLoadingSession ? (
                  <p className="mt-3 text-sm text-white/60">Loading user requests...</p>
                ) : userMessages.length === 0 ? (
                  <p className="mt-3 text-sm text-white/60">No user analysis requests yet.</p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {userMessages.slice(-5).reverse().map((msg, idx) => (
                      <div key={`${msg.created_at}-${idx}`} className="rounded-md border border-white/10 p-2">
                        <p className="line-clamp-3 text-xs text-white/80">{msg.content}</p>
                        <p className="mt-1 text-[11px] text-white/45">{formatDate(msg.created_at)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
