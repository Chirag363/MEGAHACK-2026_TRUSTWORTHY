import { jsPDF } from "jspdf";

export type SavedReport = {
  id: string;
  messageId: string;
  content: string;
  title: string;
  savedAt: string;
  sessionId?: string;
  datasetName?: string;
};

// ── localStorage key used by the Reports library page ──────────────────────
export const SAVED_REPORTS_KEY = "savedReports";

// ── Helpers ─────────────────────────────────────────────────────────────────

export function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function extractTitle(content: string): string {
  const headingMatch = content.match(/^#{1,4}\s+(.+)$/m);
  if (headingMatch) return headingMatch[1].replace(/[*`_]/g, "").trim().slice(0, 80);
  const firstLine = content.split("\n").find((l) => l.trim());
  if (firstLine) {
    const stripped = firstLine.replace(/[#*`_>]/g, "").trim();
    if (stripped) return stripped.slice(0, 80);
  }
  return "AI Report";
}

export function toSafeFilename(title: string) {
  const clean = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return clean || "report";
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

// ── Main export ──────────────────────────────────────────────────────────────

export function downloadReportPdf(report: SavedReport) {
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

    // Title
    doc.setFont("times", "bold");
    doc.setFontSize(15);
    const safeTitle = sanitizeForPdf(report.title);
    const titleLines = doc.splitTextToSize(safeTitle, maxWidth) as string[];
    doc.text(titleLines, marginX, cursorY);
    cursorY += titleLines.length * 18;

    // Meta line
    doc.setFont("times", "normal");
    doc.setFontSize(9);
    doc.setTextColor(110, 110, 110);
    const meta = sanitizeForPdf(
      `Saved ${formatDate(report.savedAt)}${report.datasetName ? ` | ${report.datasetName}` : ""}`
    );
    doc.text(meta, marginX, cursorY);
    cursorY += 16;

    // Divider
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
          if (!probe || !probe.includes("|")) break;
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

            const maxCellLines = Math.max(1, ...cellLines.map((entry) => entry.length));
            const rowHeight = maxCellLines * 12 + rowPaddingY * 2;
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
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
