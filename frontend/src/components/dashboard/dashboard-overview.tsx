"use client";

import Link from "next/link";
import { BookmarkCheckIcon, DatabaseIcon, FileTextIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SAVED_REPORTS_KEY, type SavedReport } from "@/lib/report-pdf";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme-provider";

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
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const { theme } = useTheme();
  const d = theme !== "light";

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(SAVED_REPORTS_KEY) ?? "[]") as SavedReport[];
      setSavedReports(stored.slice(0, 3));
    } catch {
      setSavedReports([]);
    }
  }, []);

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
        <div className={cn("rounded-xl border p-4", d ? "border-white/10 bg-black/20" : "border-slate-200 bg-slate-50")}>
          <p className={cn("text-xs", d ? "text-white/50" : "text-slate-500")}>Total Sessions</p>
          <p className={cn("mt-1 text-2xl font-semibold", d ? "text-white" : "text-slate-900")}>{totals.sessions}</p>
        </div>
        <div className={cn("rounded-xl border p-4", d ? "border-white/10 bg-black/20" : "border-slate-200 bg-slate-50")}>
          <p className={cn("text-xs", d ? "text-white/50" : "text-slate-500")}>Datasets Uploaded</p>
          <p className={cn("mt-1 text-2xl font-semibold", d ? "text-white" : "text-slate-900")}>{totals.uploads}</p>
        </div>
        <div className={cn("rounded-xl border p-4", d ? "border-white/10 bg-black/20" : "border-slate-200 bg-slate-50")}>
          <p className={cn("text-xs", d ? "text-white/50" : "text-slate-500")}>Total Messages</p>
          <p className={cn("mt-1 text-2xl font-semibold", d ? "text-white" : "text-slate-900")}>{totals.messages}</p>
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      )}

      {isLoading ? (
        <div className={cn("rounded-xl border p-6 text-sm", d ? "border-white/10 bg-black/20 text-white/70" : "border-slate-200 bg-slate-50 text-slate-500")}>
          Loading your dashboard data...
        </div>
      ) : sessions.length === 0 ? (
        <div className={cn("rounded-xl border border-dashed p-6 text-sm", d ? "border-white/20 bg-black/20 text-white/70" : "border-slate-300 bg-slate-50 text-slate-500")}>
          No uploaded data yet. Go to{" "}
          <Link href="/dashboard/chat" className={cn("underline underline-offset-4", d ? "text-white" : "text-slate-900")}>
            chat
          </Link>{" "}
          to upload a dataset and start analysis.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className={cn("rounded-xl border p-3", d ? "border-white/10 bg-black/20" : "border-slate-200 bg-white")}>
            <h2 className={cn("mb-3 text-sm font-semibold", d ? "text-white/90" : "text-slate-800")}>Uploaded Data Sessions</h2>
            <div className="space-y-2">
              {sessions.map((session) => (
                <button
                  key={session.session_id}
                  type="button"
                  onClick={() => void loadSessionDetails(session.session_id)}
                  className={cn(
                    "w-full rounded-lg border px-3 py-2 text-left transition",
                    activeSessionId === session.session_id
                      ? d ? "border-white/30 bg-white/10" : "border-slate-400 bg-slate-100"
                      : d ? "border-white/10 bg-white/3 hover:border-white/20 hover:bg-white/6" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  )}
                >
                  <p className={cn("truncate text-sm font-medium", d ? "text-white/90" : "text-slate-800")}>
                    {session.title || "New chat"}
                  </p>
                  <p className={cn("truncate text-xs", d ? "text-white/55" : "text-slate-500")}>
                    {session.dataset_name || "No dataset uploaded"}
                  </p>
                  <p className={cn("mt-1 text-[11px]", d ? "text-white/40" : "text-slate-400")}>{formatDate(session.updated_at)}</p>
                </button>
              ))}
            </div>
          </aside>

          <section className="space-y-4">
            <div className={cn("rounded-xl border p-4", d ? "border-white/10 bg-black/20" : "border-slate-200 bg-white")}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className={cn("text-lg font-semibold", d ? "text-white" : "text-slate-900")}>
                    {activeSession?.title || "Session"}
                  </h3>
                  <p className={cn("text-sm", d ? "text-white/65" : "text-slate-500")}>
                    Dataset: {activeSession?.dataset_name || "No dataset uploaded"}
                  </p>
                </div>
                <Link
                  href="/dashboard/chat"
                  className={cn("rounded-md border px-3 py-1.5 text-xs transition", d ? "border-white/20 text-white/80 hover:bg-white/10" : "border-slate-300 text-slate-600 hover:bg-slate-100")}
                >
                  Manage in Chat
                </Link>
              </div>

              <div className={cn("mt-3 rounded-lg border p-3 text-sm", d ? "border-white/10 bg-white/3 text-white/75" : "border-slate-200 bg-slate-50 text-slate-600")}>
                <p className={cn("text-xs uppercase tracking-wide", d ? "text-white/50" : "text-slate-400")}>Dataset Summary</p>
                <p className="mt-1">{activeSession?.dataset_summary || "No summary available."}</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className={cn("rounded-xl border p-4", d ? "border-white/10 bg-black/20" : "border-slate-200 bg-white")}>
                <div className="flex items-center justify-between">
                  <h4 className={cn("text-sm font-semibold", d ? "text-white/90" : "text-slate-800")}>Saved Reports</h4>
                  <Link
                    href="/dashboard/report"
                    className="text-[11px] text-cyan-400/70 hover:text-cyan-300 transition-colors"
                  >
                    View all →
                  </Link>
                </div>
                {savedReports.length === 0 ? (
                  <div className="mt-3 flex flex-col items-center gap-2 py-4 text-center">
                    <BookmarkCheckIcon className={cn("size-5", d ? "text-white/20" : "text-slate-300")} />
                    <p className={cn("text-xs", d ? "text-white/40" : "text-slate-400")}>No saved reports yet.</p>
                    <p className={cn("text-[11px]", d ? "text-white/30" : "text-slate-400")}>
                      Use &ldquo;Save to Library&rdquo; in Chat to save reports here.
                    </p>
                  </div>
                ) : (
                  <div className="mt-3 space-y-2">
                    {savedReports.map((report) => (
                      <Link
                        key={report.id}
                        href="/dashboard/report"
                        className={cn("flex items-start gap-2.5 rounded-lg border p-2.5 transition-all", d ? "border-white/10 bg-white/3 hover:border-white/20 hover:bg-white/6" : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100")}
                      >
                        <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-md border", d ? "border-white/10 bg-white/5" : "border-slate-200 bg-slate-100")}>
                          <FileTextIcon className="size-3.5 text-cyan-400/70" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={cn("truncate text-xs font-medium", d ? "text-white/80" : "text-slate-700")}>{report.title}</p>
                          {report.datasetName && (
                            <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-emerald-300/60">
                              <DatabaseIcon className="size-2.5 shrink-0" />
                              {report.datasetName}
                            </p>
                          )}
                          <p className={cn("mt-0.5 text-[11px]", d ? "text-white/35" : "text-slate-400")}>{formatDate(report.savedAt)}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <div className={cn("rounded-xl border p-4", d ? "border-white/10 bg-black/20" : "border-slate-200 bg-white")}>
                <h4 className={cn("text-sm font-semibold", d ? "text-white/90" : "text-slate-800")}>Recent User Requests</h4>
                {isLoadingSession ? (
                  <p className={cn("mt-3 text-sm", d ? "text-white/60" : "text-slate-500")}>Loading user requests...</p>
                ) : userMessages.length === 0 ? (
                  <p className={cn("mt-3 text-sm", d ? "text-white/60" : "text-slate-500")}>No user analysis requests yet.</p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {userMessages.slice(-5).reverse().map((msg, idx) => (
                      <div key={`${msg.created_at}-${idx}`} className={cn("rounded-md border p-2", d ? "border-white/10" : "border-slate-200")}>
                        <p className={cn("line-clamp-3 text-xs", d ? "text-white/80" : "text-slate-700")}>{msg.content}</p>
                        <p className={cn("mt-1 text-[11px]", d ? "text-white/45" : "text-slate-400")}>{formatDate(msg.created_at)}</p>
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
