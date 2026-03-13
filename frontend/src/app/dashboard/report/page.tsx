"use client";

import { useEffect, useState } from "react";
import { BookmarkCheckIcon, DatabaseIcon, DownloadIcon, FileTextIcon, SearchIcon, TrashIcon } from "lucide-react";
import { MessageResponse } from "@/components/ai-elements/message";
import { cn } from "@/lib/utils";
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

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function getPreview(content: string, maxChars = 180) {
  const stripped = content.replace(/^#+\s+.+$/m, "").replace(/[#*`_]/g, "").trim();
  return stripped.length > maxChars ? stripped.slice(0, maxChars) + "…" : stripped;
}

export default function DashboardReportPage() {
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("savedReports") ?? "[]") as SavedReport[];
      setReports(stored);
    } catch {
      setReports([]);
    }
  }, []);

  const deleteReport = (id: string) => {
    const next = reports.filter((r) => r.id !== id);
    setReports(next);
    localStorage.setItem("savedReports", JSON.stringify(next));
    if (expandedId === id) setExpandedId(null);
    toast.success("Report removed from library.");
  };

  const downloadPdf = (report: SavedReport) => {
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${report.title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 13px; line-height: 1.7; color: #111; padding: 40px 56px; max-width: 860px; margin: 0 auto; }
    h1, h2, h3, h4 { margin: 1.4em 0 0.5em; font-weight: 600; line-height: 1.3; }
    h1 { font-size: 22px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; }
    h2 { font-size: 17px; } h3 { font-size: 14px; }
    p { margin: 0.7em 0; }
    ul, ol { margin: 0.7em 0 0.7em 1.5em; } li { margin: 0.3em 0; }
    code { background: #f3f4f6; border-radius: 3px; padding: 1px 5px; font-size: 12px; font-family: 'Courier New', monospace; }
    pre { background: #f3f4f6; border-radius: 6px; padding: 12px 16px; overflow-x: auto; margin: 1em 0; }
    pre code { background: none; padding: 0; }
    strong, b { font-weight: 600; } em, i { font-style: italic; }
    blockquote { border-left: 3px solid #d1d5db; padding-left: 14px; color: #6b7280; margin: 1em 0; }
    table { border-collapse: collapse; width: 100%; margin: 1em 0; font-size: 12px; }
    th, td { border: 1px solid #e5e7eb; padding: 6px 10px; text-align: left; }
    th { background: #f9fafb; font-weight: 600; }
    hr { border: none; border-top: 1px solid #e5e7eb; margin: 1.5em 0; }
    .meta { color: #6b7280; font-size: 11px; margin-bottom: 24px; padding-bottom: 12px; border-bottom: 1px solid #e5e7eb; }
    @media print { body { padding: 20px 30px; } }
  </style>
</head>
<body>
  <div class="meta">InsightForge · Saved ${formatDate(report.savedAt)}${report.datasetName ? ` · ${report.datasetName}` : ""}</div>
  <div id="content"></div>
  <script>
    const raw = ${JSON.stringify(report.content)};
    function mdToHtml(md) {
      return md
        .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
        .replace(/^#{6}\\s+(.+)$/gm,'<h6>$1</h6>').replace(/^#{5}\\s+(.+)$/gm,'<h5>$1</h5>')
        .replace(/^#{4}\\s+(.+)$/gm,'<h4>$1</h4>').replace(/^###\\s+(.+)$/gm,'<h3>$1</h3>')
        .replace(/^##\\s+(.+)$/gm,'<h2>$1</h2>').replace(/^#\\s+(.+)$/gm,'<h1>$1</h1>')
        .replace(/\\*\\*(.+?)\\*\\*/g,'<strong>$1</strong>').replace(/\\*(.+?)\\*/g,'<em>$1</em>')
        .replace(/\`([^\`]+)\`/g,'<code>$1</code>')
        .replace(/^---+$/gm,'<hr/>')
        .replace(/^[\\*\\-]\\s+(.+)$/gm,'<li>$1</li>')
        .replace(/^\\d+\\.\\s+(.+)$/gm,'<li>$1</li>')
        .replace(/\\n\\n/g,'</p><p>')
        .replace(/<p><\\/p>/g,'');
    }
    document.getElementById('content').innerHTML = mdToHtml(raw);
    window.onload = () => { window.print(); };
  </script>
</body>
</html>`;
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) { toast.error("Pop-up blocked. Please allow pop-ups."); return; }
    win.document.write(htmlContent);
    win.document.close();
  };

  const filtered = reports.filter(
    (r) =>
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      (r.datasetName ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 px-4 py-6 lg:px-6">
      {/* Page header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold text-white/90">Saved Reports</h1>
        <p className="text-xs text-white/45">
          Reports saved from your AI analysis conversations.
        </p>
      </div>

      {reports.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/4">
            <BookmarkCheckIcon className="size-6 text-white/30" />
          </div>
          <div>
            <p className="text-sm font-medium text-white/60">No saved reports yet</p>
            <p className="mt-1 text-xs text-white/35">
              Click <span className="font-medium text-white/55">"Save to Library"</span> on any AI response in the Chat to save it here.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Search */}
          <div className="relative max-w-sm">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-white/35" />
            <input
              type="text"
              placeholder="Search reports…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/4 py-2 pl-8 pr-3 text-xs text-white/80 placeholder:text-white/30 focus:border-white/20 focus:outline-none"
            />
          </div>

          {/* Count */}
          <p className="text-[11px] text-white/35">
            {filtered.length} report{filtered.length !== 1 ? "s" : ""}
            {search && ` matching "${search}"`}
          </p>

          {/* Reports grid */}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((report) => {
              const isExpanded = expandedId === report.id;
              return (
                <div
                  key={report.id}
                  className={cn(
                    "flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] transition-all",
                    isExpanded && "sm:col-span-2 xl:col-span-3"
                  )}
                >
                  {/* Card header */}
                  <div className="flex items-start gap-3 px-4 pt-4 pb-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5">
                      <FileTextIcon className="size-4 text-cyan-400/70" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white/85">{report.title}</p>
                      <p className="mt-0.5 text-[11px] text-white/40">{formatDate(report.savedAt)}</p>
                    </div>
                  </div>

                  {/* Dataset chip */}
                  {report.datasetName && (
                    <div className="mx-4 mb-3 flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/8 px-2.5 py-1">
                      <DatabaseIcon className="size-3 text-emerald-400/70 shrink-0" />
                      <span className="truncate text-[11px] text-emerald-300/80">{report.datasetName}</span>
                    </div>
                  )}

                  {/* Preview / full content */}
                  <div className="px-4 pb-3">
                    {isExpanded ? (
                      <div className="prose prose-sm prose-invert max-w-none rounded-xl border border-white/8 bg-black/20 p-4 text-xs leading-relaxed text-white/70">
                        <MessageResponse isAnimating={false}>
                          {report.content}
                        </MessageResponse>
                      </div>
                    ) : (
                      <p className="text-xs leading-relaxed text-white/45">
                        {getPreview(report.content)}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 border-t border-white/8 px-4 py-2.5">
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : report.id)}
                      className="flex-1 rounded-lg border border-white/10 bg-white/4 px-3 py-1.5 text-[11px] font-medium text-white/55 transition-all hover:border-white/20 hover:bg-white/8 hover:text-white/80"
                    >
                      {isExpanded ? "Collapse" : "View Full Report"}
                    </button>
                    <button
                      type="button"
                      title="Download PDF"
                      onClick={() => downloadPdf(report)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/4 text-white/45 transition-all hover:border-white/20 hover:bg-white/8 hover:text-white/80"
                    >
                      <DownloadIcon className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      title="Delete report"
                      onClick={() => deleteReport(report.id)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-red-500/15 bg-red-500/5 text-red-400/50 transition-all hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400/80"
                    >
                      <TrashIcon className="size-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
