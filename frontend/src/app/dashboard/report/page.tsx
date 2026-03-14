"use client";

import { useEffect, useState } from "react";
import { BookmarkCheckIcon, DatabaseIcon, DownloadIcon, FileTextIcon, SearchIcon, TrashIcon } from "lucide-react";
import { jsPDF } from "jspdf";
import { RichMessageResponse } from "@/components/ai-elements/rich-message-response";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

function sanitizeForPdf(text: string) {
  return text
    .normalize("NFKD")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u00A0/g, " ")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "");
}

function isTableDivider(line: string) {
  const trimmed = line.replace(/\|/g, "").trim();
  return /^:?-{3,}:?$/.test(trimmed) || /^-+$/.test(trimmed);
}

function stripInlineMarkdown(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^>\s?/, "")
    .trim();
}

function parseTableRow(line: string) {
  return line
    .split("|")
    .map((cell) => stripInlineMarkdown(cell.trim()))
    .filter(Boolean);
}

function toSafeFilename(title: string) {
  const clean = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return clean || "report";
}

export default function DashboardReportPage() {
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
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
    if (selectedReportId === id) setSelectedReportId(null);
    toast.success("Report removed from library.");
  };

  const selectedReport = reports.find((report) => report.id === selectedReportId) ?? null;

  const downloadPdf = (report: SavedReport) => {
    try {
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const marginX = 44;
      const marginTop = 52;
      const lineHeight = 14;
      const maxWidth = pageWidth - marginX * 2;
      let cursorY = marginTop;

      const ensureSpace = (heightNeeded: number) => {
        if (cursorY + heightNeeded > pageHeight - 44) {
          doc.addPage();
          cursorY = marginTop;
        }
      };

      const drawWrapped = (text: string, x: number, width: number, lh: number) => {
        const lines = doc.splitTextToSize(text, width) as string[];
        for (const line of lines) {
          ensureSpace(lh);
          doc.text(line, x, cursorY);
          cursorY += lh;
        }
      };

      doc.setFont("times", "bold");
      doc.setFontSize(15);
      const safeTitle = sanitizeForPdf(report.title);
      const titleLines = doc.splitTextToSize(safeTitle, maxWidth) as string[];
      doc.text(titleLines, marginX, cursorY);
      cursorY += titleLines.length * 18;

      doc.setFont("times", "normal");
      doc.setFontSize(9);
      doc.setTextColor(110, 110, 110);
      const meta = sanitizeForPdf(
        `Saved ${formatDate(report.savedAt)}${report.datasetName ? ` | ${report.datasetName}` : ""}`
      );
      doc.text(meta, marginX, cursorY);
      cursorY += 16;

      doc.setDrawColor(220, 220, 220);
      doc.line(marginX, cursorY, pageWidth - marginX, cursorY);
      cursorY += 20;

      doc.setTextColor(20, 20, 20);
      doc.setFont("times", "normal");
      doc.setFontSize(10);

      const content = sanitizeForPdf(report.content);
      const rawLines = content.split("\n");

      for (let i = 0; i < rawLines.length; i += 1) {
        const rawLine = rawLines[i];
        const line = rawLine.trim();

        if (!line) {
          cursorY += 6;
          continue;
        }

        if (/^---+$/.test(line)) {
          ensureSpace(12);
          doc.setDrawColor(220, 220, 220);
          doc.line(marginX, cursorY, pageWidth - marginX, cursorY);
          cursorY += 12;
          continue;
        }

        const hMatch = line.match(/^(#{1,4})\s+(.+)$/);
        if (hMatch) {
          const level = hMatch[1].length;
          const heading = hMatch[2];
          const size = level === 1 ? 14 : level === 2 ? 12 : 11;
          const spacingBefore = level <= 2 ? 8 : 6;
          cursorY += spacingBefore;
          doc.setFont("times", "bold");
          doc.setFontSize(size);
          drawWrapped(heading, marginX, maxWidth, 15);
          doc.setFont("times", "normal");
          doc.setFontSize(10);
          cursorY += 2;
          continue;
        }

        if (/^\d+\s+/.test(line)) {
          doc.setFont("times", "bold");
          doc.setFontSize(12);
          drawWrapped(line, marginX, maxWidth, 15);
          doc.setFont("times", "normal");
          doc.setFontSize(10);
          cursorY += 2;
          continue;
        }

        const nextLine = rawLines[i + 1]?.trim() ?? "";
        if (line.includes("|") && isTableDivider(nextLine)) {
          const tableLines: string[] = [];
          tableLines.push(line);
          i += 1;

          while (i + 1 < rawLines.length) {
            const probe = rawLines[i + 1].trim();
            if (!probe || !probe.includes("|")) {
              break;
            }
            tableLines.push(probe);
            i += 1;
          }

          const headers = parseTableRow(tableLines[0]);
          const rows = tableLines.slice(1).map(parseTableRow).filter((row) => row.length > 0);
          const colCount = Math.max(headers.length, ...rows.map((row) => row.length));

          if (colCount > 0) {
            const gap = 8;
            const colWidth = (maxWidth - gap * (colCount - 1)) / colCount;
            const rowPaddingY = 6;

            const drawTableRow = (
              cells: string[],
              options: { header?: boolean; borderTop?: boolean; borderBottom?: boolean } = {}
            ) => {
              const cellLines = Array.from({ length: colCount }, (_, colIdx) => {
                const value = stripInlineMarkdown(cells[colIdx] ?? "");
                doc.setFont("times", options.header ? "bold" : "normal");
                doc.setFontSize(options.header ? 10 : 9.5);
                return doc.splitTextToSize(value || "-", colWidth - 6) as string[];
              });

              const maxLines = Math.max(1, ...cellLines.map((entry) => entry.length));
              const rowHeight = maxLines * 12 + rowPaddingY * 2;
              ensureSpace(rowHeight + 2);

              if (options.header) {
                doc.setFillColor(245, 245, 245);
                doc.rect(marginX, cursorY, maxWidth, rowHeight, "F");
              }

              if (options.borderTop) {
                doc.setDrawColor(180, 180, 180);
                doc.setLineWidth(0.8);
                doc.line(marginX, cursorY, marginX + maxWidth, cursorY);
              }

              for (let colIdx = 0; colIdx < colCount; colIdx += 1) {
                const x = marginX + colIdx * (colWidth + gap);
                const y = cursorY + rowPaddingY + 10;

                doc.setTextColor(20, 20, 20);
                doc.setFont("times", options.header ? "bold" : "normal");
                doc.setFontSize(options.header ? 10 : 9.5);
                doc.text(cellLines[colIdx], x + 3, y);

                if (colIdx < colCount - 1) {
                  const dividerX = x + colWidth + gap / 2;
                  doc.setDrawColor(210, 210, 210);
                  doc.setLineWidth(0.4);
                  doc.line(dividerX, cursorY, dividerX, cursorY + rowHeight);
                }
              }

              if (options.borderBottom) {
                doc.setDrawColor(180, 180, 180);
                doc.setLineWidth(0.8);
                doc.line(marginX, cursorY + rowHeight, marginX + maxWidth, cursorY + rowHeight);
              }

              cursorY += rowHeight;
            };

            drawTableRow(headers, { header: true, borderTop: true });
            rows.forEach((row, rowIdx) => {
              drawTableRow(row, { borderBottom: rowIdx === rows.length - 1 });
            });
            cursorY += 8;
          }
          continue;
        }

        if (line.includes("|") && !isTableDivider(line)) {
          const inlineCells = parseTableRow(line);
          if (inlineCells.length > 0) {
            const rowText = inlineCells.join("   |   ");
            doc.setFont("courier", "normal");
            doc.setFontSize(9);
            drawWrapped(rowText, marginX, maxWidth, 12);
            doc.setFont("times", "normal");
            doc.setFontSize(10);
          }
          continue;
        }

        if (/^[-*]\s+/.test(line)) {
          const bulletText = line.replace(/^[-*]\s+/, "");
          doc.text("-", marginX, cursorY);
          drawWrapped(bulletText, marginX + 12, maxWidth - 12, lineHeight);
          continue;
        }

        drawWrapped(stripInlineMarkdown(line), marginX, maxWidth, lineHeight);
      }

      doc.save(`${toSafeFilename(report.title)}.pdf`);
      toast.success("PDF downloaded.");
    } catch {
      toast.error("Could not generate PDF. Please try again.");
    }
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
              return (
                <div
                  key={report.id}
                  className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] transition-all"
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

                  {/* Preview */}
                  <div className="px-4 pb-3">
                    <p className="text-xs leading-relaxed text-white/45">
                      {getPreview(report.content)}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 border-t border-white/8 px-4 py-2.5">
                    <button
                      type="button"
                      onClick={() => setSelectedReportId(report.id)}
                      className="flex-1 rounded-lg border border-white/10 bg-white/4 px-3 py-1.5 text-[11px] font-medium text-white/55 transition-all hover:border-white/20 hover:bg-white/8 hover:text-white/80"
                    >
                      View Report
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

          <Dialog open={Boolean(selectedReport)} onOpenChange={(open) => !open && setSelectedReportId(null)}>
            <DialogContent className="flex h-[90vh] w-[98vw] max-w-[96vw] flex-col gap-0 overflow-hidden border-white/10 bg-[#090b10] p-0 text-white sm:h-[88vh] sm:w-[96vw] sm:max-w-[96vw]" showCloseButton={true}>
              {selectedReport && (
                <>
                  <DialogHeader className="border-b border-white/10 px-5 py-4">
                    <DialogTitle className="truncate pr-10 text-white/90">{selectedReport.title}</DialogTitle>
                    <DialogDescription className="text-xs text-white/45">
                      Saved {formatDate(selectedReport.savedAt)}
                      {selectedReport.datasetName ? ` · ${selectedReport.datasetName}` : ""}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                    <div className="rounded-xl border border-white/8 bg-black/20 p-4 text-xs leading-relaxed text-white/70">
                      <RichMessageResponse isAnimating={false}>{selectedReport.content}</RichMessageResponse>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 border-t border-white/10 px-5 py-3">
                    <button
                      type="button"
                      onClick={() => downloadPdf(selectedReport)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white"
                    >
                      <DownloadIcon className="size-3.5" />
                      Download
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteReport(selectedReport.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs text-red-300/90 transition-all hover:border-red-400/40 hover:bg-red-500/15"
                    >
                      <TrashIcon className="size-3.5" />
                      Delete
                    </button>
                  </div>
                </>
              )}
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
