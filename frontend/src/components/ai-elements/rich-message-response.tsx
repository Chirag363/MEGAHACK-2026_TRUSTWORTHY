"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
} from "recharts";
import { RotateCcwIcon } from "lucide-react";
import { memo, type ReactElement, type ReactNode, useMemo, useRef, useState } from "react";
import { parse as parseYaml } from "yaml";

import { MessageResponse } from "@/components/ai-elements/message";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";

type RichMessageResponseProps = {
  children: string;
  className?: string;
  isAnimating?: boolean;
};

type RichSegment =
  | { type: "markdown"; content: string; key: string }
  | { type: "viz-chart"; content: string; key: string }
  | { type: "viz-3d"; content: string; key: string };

type ChartSeriesSpec = {
  key: string;
  label?: string;
  color?: string;
  stackId?: string;
};

type VizChartSpec = {
  type: "bar" | "line" | "area" | "pie" | "donut" | "scatter";
  title?: string;
  description?: string;
  insight?: string;
  data: Array<Record<string, string | number>>;
  xKey?: string;
  yKey?: string;
  nameKey?: string;
  labelKey?: string;
  valueKey?: string;
  series?: ChartSeriesSpec[];
  height?: number;
};

type Viz3DPoint = {
  label?: string;
  x: number;
  y: number;
  z: number;
  size?: number;
  color?: string;
};

type Viz3DSpec = {
  title?: string;
  description?: string;
  insight?: string;
  xLabel?: string;
  yLabel?: string;
  zLabel?: string;
  points: Viz3DPoint[];
  notes?: string[];
};

type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

type PreparedScatterData = {
  data: Array<Record<string, string | number>>;
  droppedRows: number;
  xIsDate: boolean;
};

const BLOCK_PATTERN = /```([a-zA-Z0-9_-]+)\s*\r?\n([\s\S]*?)```/g;
const VIZ_COLORS = [
  "#22d3ee",
  "#38bdf8",
  "#818cf8",
  "#f97316",
  "#facc15",
  "#34d399",
  "#fb7185",
  "#c084fc",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asNullableNumber(value: unknown): number | null | undefined {
  if (value === null) {
    return null;
  }
  return asNumber(value);
}

function parseNumericValue(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return undefined;
    }

    const numeric = Number(trimmed.replace(/,/g, ""));
    if (Number.isFinite(numeric)) {
      return numeric;
    }
  }

  return undefined;
}

function parseDateValue(value: unknown): number | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return undefined;
  }

  const timestamp = Date.parse(trimmed);
  return Number.isFinite(timestamp) ? timestamp : undefined;
}

function prettifyKey(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\w/, (char) => char.toUpperCase());
}

function formatValue(value: string | number | undefined): string {
  if (typeof value === "number") {
    if (Math.abs(value) >= 1000) {
      return new Intl.NumberFormat("en-US", {
        maximumFractionDigits: 1,
        notation: "compact",
      }).format(value);
    }
    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 2,
    }).format(value);
  }

  return value ?? "";
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getMedian(values: number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
  return sorted[middle];
}

function roundNumber(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function formatAxisTick(value: string | number | undefined): string {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length > 0 && !Number.isNaN(Number(trimmed))) {
      return formatValue(Number(trimmed));
    }
    return trimmed;
  }

  return formatValue(value);
}

function formatDateTick(value: string | number | undefined): string {
  const timestamp =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  if (!Number.isFinite(timestamp)) {
    return value == null ? "" : String(value);
  }

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return value == null ? "" : String(value);
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "2-digit",
  }).format(date);
}

function parseRichSegments(content: string): RichSegment[] {
  const segments: RichSegment[] = [];
  let lastIndex = 0;
  let blockIndex = 0;

  for (const match of content.matchAll(BLOCK_PATTERN)) {
    const fullMatch = match[0];
    const language = (match[1] ?? "").toLowerCase();
    const body = match[2] ?? "";
    const matchIndex = match.index ?? 0;

    if (matchIndex > lastIndex) {
      const markdown = content.slice(lastIndex, matchIndex);
      if (markdown.length > 0) {
        segments.push({
          type: "markdown",
          content: markdown,
          key: `md-${blockIndex}`,
        });
      }
    }

    const trimmedBody = body.trim();

    if (language === "viz-chart" || language === "viz-3d") {
      segments.push({
        type: language,
        content: trimmedBody,
        key: `${language}-${blockIndex}`,
      });
    } else if (language === "json" || language === "js" || language === "javascript") {
      // Some model outputs wrap chart specs in ```json fences; auto-detect and render.
      let parsed: unknown;
      try {
        parsed = JSON.parse(trimmedBody);
      } catch {
        parsed = null;
      }

      if (isRecord(parsed)) {
        const chartType = asString(parsed.type)?.toLowerCase();
        const hasChartData = Array.isArray(parsed.data);
        const has3DPoints = Array.isArray(parsed.points);

        if (chartType && ["bar", "line", "area", "pie", "donut", "scatter"].includes(chartType) && hasChartData) {
          segments.push({
            type: "viz-chart",
            content: trimmedBody,
            key: `viz-chart-${blockIndex}`,
          });
        } else if (has3DPoints) {
          segments.push({
            type: "viz-3d",
            content: trimmedBody,
            key: `viz-3d-${blockIndex}`,
          });
        } else {
          // Preserve unknown JSON blocks as markdown code fences.
          segments.push({
            type: "markdown",
            content: fullMatch,
            key: `md-code-${blockIndex}`,
          });
        }
      } else {
        segments.push({
          type: "markdown",
          content: fullMatch,
          key: `md-code-${blockIndex}`,
        });
      }
    } else {
      // Preserve non-viz fenced code blocks in markdown output.
      segments.push({
        type: "markdown",
        content: fullMatch,
        key: `md-code-${blockIndex}`,
      });
    }

    lastIndex = matchIndex + fullMatch.length;
    blockIndex += 1;
  }

  if (lastIndex < content.length) {
    segments.push({
      type: "markdown",
      content: content.slice(lastIndex),
      key: `md-tail-${blockIndex}`,
    });
  }

  return segments.length > 0
    ? segments
    : [{ type: "markdown", content, key: "md-full" }];
}

function parseStructuredObject(
  source: string,
  language: "viz-chart" | "viz-3d"
): ParseResult<Record<string, unknown>> {
  let parsed: unknown;

  try {
    parsed = JSON.parse(source);
  } catch {
    try {
      parsed = parseYaml(source);
    } catch {
      return {
        ok: false,
        error: `Invalid ${language} payload. Expected JSON or YAML object.`,
      };
    }
  }

  if (!isRecord(parsed)) {
    return {
      ok: false,
      error: `${language} block must be an object.`,
    };
  }

  return {
    ok: true,
    value: parsed,
  };
}

function coerceScalar(value: unknown): string | number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return undefined;
    }

    const numeric = Number(trimmed.replace(/,/g, ""));
    if (Number.isFinite(numeric)) {
      return numeric;
    }
    return trimmed;
  }

  return undefined;
}

function normalizeChartData(
  parsed: Record<string, unknown>,
  type: VizChartSpec["type"],
  xKey: string | undefined,
  yKey: string | undefined,
  nameKey: string | undefined,
  valueKey: string | undefined
): Array<Record<string, string | number>> {
  const directData = Array.isArray(parsed.data)
    ? parsed.data
        .filter(isRecord)
        .map((item) => {
          const row: Record<string, string | number> = {};
          for (const [key, value] of Object.entries(item)) {
            const scalar = coerceScalar(value);
            if (scalar !== undefined) {
              row[key] = scalar;
            }
          }
          return row;
        })
        .filter((row) => Object.keys(row).length > 0)
    : [];

  if (directData.length > 0) {
    return directData;
  }

  // YAML-style map under data:
  // data:
  //   Furniture: 650000
  //   Office Supplies: 850000
  if (isRecord(parsed.data)) {
    const rows: Array<Record<string, string | number>> = [];
    const x = xKey ?? "x";
    const y = yKey ?? "value";
    const n = nameKey ?? "name";
    const v = valueKey ?? "value";

    for (const [key, rawValue] of Object.entries(parsed.data)) {
      const scalar = coerceScalar(rawValue);
      if (scalar === undefined) {
        continue;
      }

      if (type === "pie" || type === "donut") {
        rows.push({ [n]: key, [v]: scalar });
      } else {
        rows.push({ [x]: key, [y]: scalar });
      }
    }

    if (rows.length > 0) {
      return rows;
    }
  }

  // YAML-style labels/values arrays:
  // labels: [East, West]
  // values: [120000, 90000]
  const rawLabels = parsed.labels;
  const rawValues = parsed.values;
  if (Array.isArray(rawLabels) && Array.isArray(rawValues) && rawLabels.length > 0 && rawValues.length > 0) {
    const rows: Array<Record<string, string | number>> = [];
    const n = nameKey ?? "name";
    const v = valueKey ?? "value";
    const length = Math.min(rawLabels.length, rawValues.length);

    for (let index = 0; index < length; index += 1) {
      const label = coerceScalar(rawLabels[index]);
      const value = coerceScalar(rawValues[index]);
      if (label === undefined || value === undefined) {
        continue;
      }
      rows.push({ [n]: String(label), [v]: value });
    }

    if (rows.length > 0) {
      return rows;
    }
  }

  return [];
}

function parseChartSpec(source: string): ParseResult<VizChartSpec> {
  const parsedResult = parseStructuredObject(source, "viz-chart");
  if (parsedResult.ok === false) {
    return parsedResult;
  }

  const parsed = parsedResult.value;

  const type = asString(parsed.type)?.toLowerCase();
  if (!type || !["bar", "line", "area", "pie", "donut", "scatter"].includes(type)) {
    return {
      ok: false,
      error: "viz-chart.type must be one of bar, line, area, pie, donut, or scatter.",
    };
  }

  const xKey = asString(parsed.xKey) ?? asString(parsed.x);
  const yKey = asString(parsed.yKey) ?? asString(parsed.y);
  const labelOrNameKey = asString(parsed.nameKey) ?? asString(parsed.labelKey);
  const nameKey = labelOrNameKey ?? asString(parsed.name);
  const valueKey = asString(parsed.valueKey) ?? asString(parsed.value);

  let data = normalizeChartData(
    parsed,
    type as VizChartSpec["type"],
    xKey,
    yKey,
    nameKey,
    valueKey
  );

  let finalNameKey = nameKey;
  let finalValueKey = valueKey;
  if ((type === "pie" || type === "donut") && data.length > 0) {
    const first = data[0];
    finalNameKey = finalNameKey ?? (Object.keys(first).find((key) => typeof first[key] === "string") ?? "name");
    finalValueKey = finalValueKey ?? (Object.keys(first).find((key) => typeof first[key] === "number") ?? "value");
  }

  if (data.length === 0) {
    return {
      ok: false,
      error: "viz-chart requires data rows (JSON or YAML).",
    };
  }

  const series = Array.isArray(parsed.series)
    ? parsed.series
        .filter(isRecord)
        .map((item): ChartSeriesSpec | null => {
          const key = asString(item.key);
          if (!key) {
            return null;
          }

          return {
            key,
            label: asString(item.label),
            color: asString(item.color),
            stackId: asString(item.stackId),
          };
        })
        .filter((item): item is ChartSeriesSpec => item !== null)
    : undefined;

  return {
    ok: true,
    value: {
      type: type as VizChartSpec["type"],
      title: asString(parsed.title),
      description: asString(parsed.description),
      insight: asString(parsed.insight),
      data,
      xKey,
      yKey,
      nameKey: finalNameKey,
      labelKey: asString(parsed.labelKey),
      valueKey: finalValueKey,
      series,
      height: asNumber(parsed.height),
    },
  };
}

function parse3DSpec(source: string): ParseResult<Viz3DSpec> {
  const parsedResult = parseStructuredObject(source, "viz-3d");
  if (parsedResult.ok === false) {
    return parsedResult;
  }

  const parsed = parsedResult.value;

  const rawPoints = Array.isArray(parsed.points)
    ? parsed.points.filter(isRecord)
    : [];

  if (rawPoints.length === 0) {
    return {
      ok: false,
      error: "viz-3d.points must contain at least one point with x, y, and z values.",
    };
  }

  const xValues = rawPoints.map((item) => asNullableNumber(item.x)).filter((value): value is number => value !== undefined && value !== null);
  const yValues = rawPoints.map((item) => asNullableNumber(item.y)).filter((value): value is number => value !== undefined && value !== null);
  const zValues = rawPoints.map((item) => asNullableNumber(item.z)).filter((value): value is number => value !== undefined && value !== null);

  if (xValues.length === 0) {
    return {
      ok: false,
      error: "viz-3d requires at least one numeric x value.",
    };
  }

  const fallbackMap = {
    x: xValues.length > 0 ? getMedian(xValues) : 0,
    y: yValues.length > 0 ? getMedian(yValues) : 0,
    z: zValues.length > 0 ? getMedian(zValues) : 0,
  };

  const axisLabels = {
    x: asString(parsed.xLabel) ?? "X axis",
    y: asString(parsed.yLabel) ?? "Y axis",
    z: asString(parsed.zLabel) ?? "Z axis",
  };

  const notes: string[] = [];
  const axisStates: Array<{
    key: "x" | "y" | "z";
    values: number[];
    label: string;
  }> = [
    { key: "x", values: xValues, label: axisLabels.x },
    { key: "y", values: yValues, label: axisLabels.y },
    { key: "z", values: zValues, label: axisLabels.z },
  ];

  for (const axis of axisStates) {
    const missingCount = rawPoints.length - axis.values.length;
    if (missingCount <= 0) {
      continue;
    }

    if (axis.values.length === 0) {
      notes.push(
        `${axis.label} was unavailable for all points, so the chart uses a flat ${axis.key.toUpperCase()}=0 plane.`
      );
      continue;
    }

    notes.push(
      `${missingCount} point${missingCount === 1 ? "" : "s"} had missing ${axis.label.toLowerCase()} values and were filled with ${formatValue(roundNumber(fallbackMap[axis.key]))}.`
    );
  }

  const points = rawPoints.map((item): Viz3DPoint => {
    const x = asNullableNumber(item.x);
    const y = asNullableNumber(item.y);
    const z = asNullableNumber(item.z);

    return {
      label: asString(item.label),
      x: x ?? fallbackMap.x,
      y: y ?? fallbackMap.y,
      z: z ?? fallbackMap.z,
      size: asNumber(item.size),
      color: asString(item.color),
    };
  });

  return {
    ok: true,
    value: {
      title: asString(parsed.title),
      description: asString(parsed.description),
      insight: asString(parsed.insight),
      xLabel: axisLabels.x,
      yLabel: axisLabels.y,
      zLabel: axisLabels.z,
      points,
      notes,
    },
  };
}

function buildSeries(spec: VizChartSpec): ChartSeriesSpec[] {
  if (spec.series && spec.series.length > 0) {
    return spec.series.map((series, index) => ({
      ...series,
      color: series.color ?? VIZ_COLORS[index % VIZ_COLORS.length],
    }));
  }

  if (spec.yKey) {
    return [
      {
        key: spec.yKey,
        label: prettifyKey(spec.yKey),
        color: VIZ_COLORS[0],
      },
    ];
  }

  const firstRow = spec.data[0] ?? {};
  const excludedKeys = new Set(
    [spec.xKey, spec.nameKey, spec.valueKey, spec.yKey].filter(Boolean)
  );

  return Object.entries(firstRow)
    .filter(([key, value]) => typeof value === "number" && !excludedKeys.has(key))
    .map(([key], index) => ({
      key,
      label: prettifyKey(key),
      color: VIZ_COLORS[index % VIZ_COLORS.length],
    }));
}

function prepareScatterData(spec: VizChartSpec): PreparedScatterData {
  if (!spec.xKey || !spec.yKey) {
    return { data: [], droppedRows: spec.data.length, xIsDate: false };
  }

  const preparedRows: Array<Record<string, string | number>> = [];
  let droppedRows = 0;
  let dateRows = 0;
  let numericRows = 0;

  for (const row of spec.data) {
    const rawX = row[spec.xKey];
    const rawY = row[spec.yKey];
    const yValue = parseNumericValue(rawY);

    let xValue = parseNumericValue(rawX);
    let xIsDate = false;

    if (xValue === undefined) {
      const parsedDate = parseDateValue(rawX);
      if (parsedDate !== undefined) {
        xValue = parsedDate;
        xIsDate = true;
      }
    }

    if (xValue === undefined || yValue === undefined) {
      droppedRows += 1;
      continue;
    }

    if (xIsDate) {
      dateRows += 1;
    } else {
      numericRows += 1;
    }

    preparedRows.push({
      ...row,
      [spec.xKey]: xValue,
      [spec.yKey]: yValue,
    });
  }

  return {
    data: preparedRows,
    droppedRows,
    xIsDate: dateRows > 0 && numericRows === 0,
  };
}

function buildChartConfig(
  spec: VizChartSpec,
  series: ChartSeriesSpec[]
): ChartConfig {
  if (spec.type === "pie" || spec.type === "donut") {
    const nameKey = spec.nameKey ?? spec.labelKey ?? "name";

    return spec.data.reduce((config, row, index) => {
      const rawLabel = row[nameKey];
      const label = typeof rawLabel === "string" ? rawLabel : `Slice ${index + 1}`;

      config[label] = {
        label,
        color:
          typeof row.color === "string"
            ? row.color
            : VIZ_COLORS[index % VIZ_COLORS.length],
      };

      return config;
    }, {} as ChartConfig);
  }

  if (spec.type === "scatter") {
    const key = spec.yKey ?? "value";
    return {
      [key]: {
        label: prettifyKey(key),
        color: VIZ_COLORS[0],
      },
    };
  }

  return series.reduce((config, item) => {
    config[item.key] = {
      label: item.label ?? prettifyKey(item.key),
      color: item.color ?? VIZ_COLORS[0],
    };
    return config;
  }, {} as ChartConfig);
}

function VisualizationShell({
  title,
  description,
  insight,
  typeLabel,
  itemCount,
  source,
  children,
}: {
  title?: string;
  description?: string;
  insight?: string;
  typeLabel: string;
  itemCount: string;
  source: string;
  children: ReactNode;
}) {
  return (
    <Card className="my-3 overflow-hidden border border-cyan-400/20 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.18),_rgba(7,23,52,0.94)_42%,_rgba(2,6,23,0.98)_100%)] text-white shadow-[0_20px_70px_rgba(8,47,73,0.35)]">
      <CardHeader className="border-b border-white/10 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-100/90">
                {typeLabel}
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-white/55">
                {itemCount}
              </span>
            </div>
            <CardTitle className="text-base text-white">
              {title ?? "Interactive visualization"}
            </CardTitle>
            {description ? (
              <CardDescription className="max-w-2xl text-sm leading-relaxed text-white/65">
                {description}
              </CardDescription>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-3 py-4 sm:px-4">{children}</CardContent>
      {(insight || source) && (
        <CardFooter className="flex-col items-start gap-3 border-t border-white/10 bg-white/[0.03]">
          {insight ? (
            <p className="text-xs leading-relaxed text-cyan-50/85">
              <span className="font-semibold text-cyan-200">Why this view:</span>{" "}
              {insight}
            </p>
          ) : null}
          <details className="w-full rounded-xl border border-white/10 bg-slate-950/60">
            <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-white/65">
              View visualization spec
            </summary>
            <pre className="overflow-x-auto border-t border-white/8 px-3 py-3 text-[11px] leading-relaxed text-cyan-100/80">
              {source}
            </pre>
          </details>
        </CardFooter>
      )}
    </Card>
  );
}

function VisualizationError({
  language,
  source,
  error,
}: {
  language: "viz-chart" | "viz-3d";
  source: string;
  error: string;
}) {
  return (
    <Card className="my-3 border border-rose-400/20 bg-rose-950/35 text-white">
      <CardHeader>
        <CardTitle className="text-sm text-rose-100">
          Unable to render {language}
        </CardTitle>
        <CardDescription className="text-rose-100/70">{error}</CardDescription>
      </CardHeader>
      <CardContent>
        <pre className="overflow-x-auto rounded-xl border border-white/10 bg-slate-950/80 p-3 text-[11px] leading-relaxed text-rose-100/80">
          {source}
        </pre>
      </CardContent>
    </Card>
  );
}

function ChartBlock({ source }: { source: string }) {
  const parsed = useMemo(() => parseChartSpec(source), [source]);

  if (parsed.ok === false) {
    return (
      <VisualizationError error={parsed.error} language="viz-chart" source={source} />
    );
  }

  const spec = parsed.value;
  const series = buildSeries(spec);
  const chartConfig = buildChartConfig(spec, series);
  const height = clamp(spec.height ?? 320, 240, 420);
  const scatterData = spec.type === "scatter" ? prepareScatterData(spec) : null;

  if ((spec.type === "bar" || spec.type === "line" || spec.type === "area") && series.length === 0) {
    return (
      <VisualizationError
        error="No numeric series were found for this chart."
        language="viz-chart"
        source={source}
      />
    );
  }

  if (spec.type === "scatter" && (!spec.xKey || !spec.yKey)) {
    return (
      <VisualizationError
        error="Scatter charts require xKey and yKey."
        language="viz-chart"
        source={source}
      />
    );
  }

  if (spec.type === "scatter" && scatterData && scatterData.data.length === 0) {
    return (
      <VisualizationError
        error="Scatter charts require numeric y values and numeric or parseable date x values."
        language="viz-chart"
        source={source}
      />
    );
  }

  if ((spec.type === "pie" || spec.type === "donut") && (!spec.nameKey || !spec.valueKey)) {
    return (
      <VisualizationError
        error="Pie and donut charts require nameKey or labelKey, plus valueKey."
        language="viz-chart"
        source={source}
      />
    );
  }

  let chartElement: ReactElement;

  if (spec.type === "bar") {
    chartElement = (
      <BarChart accessibilityLayer data={spec.data}>
        <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.08)" />
        <XAxis
          axisLine={false}
          dataKey={spec.xKey}
          minTickGap={24}
          tickLine={false}
          tickMargin={10}
        />
        <YAxis
          axisLine={false}
          tickFormatter={(value) => formatAxisTick(value)}
          tickLine={false}
          tickMargin={10}
          width={72}
        />
        <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
        <ChartLegend content={<ChartLegendContent />} />
        {series.map((item) => (
          <Bar
            dataKey={item.key}
            fill={item.color}
            key={item.key}
            name={item.label ?? prettifyKey(item.key)}
            radius={[8, 8, 0, 0]}
            stackId={item.stackId}
          />
        ))}
      </BarChart>
    );
  } else if (spec.type === "line") {
    chartElement = (
      <LineChart accessibilityLayer data={spec.data}>
        <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.08)" />
        <XAxis
          axisLine={false}
          dataKey={spec.xKey}
          minTickGap={24}
          tickLine={false}
          tickMargin={10}
        />
        <YAxis
          axisLine={false}
          tickFormatter={(value) => formatAxisTick(value)}
          tickLine={false}
          tickMargin={10}
          width={72}
        />
        <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
        <ChartLegend content={<ChartLegendContent />} />
        {series.map((item) => (
          <Line
            dataKey={item.key}
            dot={{ r: 3, strokeWidth: 0, fill: item.color }}
            key={item.key}
            name={item.label ?? prettifyKey(item.key)}
            stroke={item.color}
            strokeWidth={2.5}
            type="monotone"
          />
        ))}
      </LineChart>
    );
  } else if (spec.type === "area") {
    chartElement = (
      <AreaChart accessibilityLayer data={spec.data}>
        <defs>
          {series.map((item) => (
            <linearGradient
              id={`gradient-${item.key}`}
              key={item.key}
              x1="0"
              x2="0"
              y1="0"
              y2="1"
            >
              <stop offset="5%" stopColor={item.color} stopOpacity={0.7} />
              <stop offset="95%" stopColor={item.color} stopOpacity={0.08} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.08)" />
        <XAxis
          axisLine={false}
          dataKey={spec.xKey}
          minTickGap={24}
          tickLine={false}
          tickMargin={10}
        />
        <YAxis
          axisLine={false}
          tickFormatter={(value) => formatAxisTick(value)}
          tickLine={false}
          tickMargin={10}
          width={72}
        />
        <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
        <ChartLegend content={<ChartLegendContent />} />
        {series.map((item) => (
          <Area
            dataKey={item.key}
            fill={`url(#gradient-${item.key})`}
            key={item.key}
            name={item.label ?? prettifyKey(item.key)}
            stackId={item.stackId}
            stroke={item.color}
            strokeWidth={2.5}
            type="monotone"
          />
        ))}
      </AreaChart>
    );
  } else if (spec.type === "pie" || spec.type === "donut") {
    const pieNameKey = spec.nameKey ?? spec.labelKey;
    chartElement = (
      <PieChart>
        <ChartTooltip content={<ChartTooltipContent hideIndicator />} />
        <ChartLegend
          content={<ChartLegendContent nameKey={pieNameKey} />}
          verticalAlign="bottom"
        />
        <Pie
          data={spec.data}
          dataKey={spec.valueKey}
          innerRadius={spec.type === "donut" ? 65 : 0}
          nameKey={pieNameKey}
          outerRadius={110}
          paddingAngle={2}
        >
          {spec.data.map((entry, index) => (
            <Cell
              fill={
                typeof entry.color === "string"
                  ? entry.color
                  : VIZ_COLORS[index % VIZ_COLORS.length]
              }
              key={`slice-${index}`}
            />
          ))}
        </Pie>
      </PieChart>
    );
  } else {
    chartElement = (
      <ScatterChart accessibilityLayer data={scatterData?.data ?? []}>
        <CartesianGrid stroke="rgba(255,255,255,0.08)" />
        <XAxis
          axisLine={false}
          dataKey={spec.xKey}
          name={spec.xKey}
          tickLine={false}
          tickFormatter={(value) =>
            scatterData?.xIsDate ? formatDateTick(value) : formatAxisTick(value)
          }
          type="number"
        />
        <YAxis
          axisLine={false}
          dataKey={spec.yKey}
          name={spec.yKey}
          tickLine={false}
          tickFormatter={(value) => formatAxisTick(value)}
          type="number"
          width={72}
        />
        <ChartTooltip
          cursor={{ strokeDasharray: "3 3" }}
          content={
            <ChartTooltipContent
              labelFormatter={(value) =>
                scatterData?.xIsDate ? formatDateTick(value as string | number | undefined) : formatAxisTick(value as string | number | undefined)
              }
            />
          }
        />
        <Scatter data={scatterData?.data ?? []} fill={VIZ_COLORS[0]} name={spec.title ?? "Series"} />
      </ScatterChart>
    );
  }

  return (
    <VisualizationShell
      title={spec.title}
      description={spec.description}
      insight={spec.insight}
      typeLabel={spec.type === "donut" ? "Interactive donut chart" : `Interactive ${spec.type} chart`}
      itemCount={`${spec.data.length} rows`}
      source={source}
    >
      <div className="space-y-3">
        <ChartContainer
          className="w-full [&_.recharts-cartesian-axis-tick_text]:fill-white/45 [&_.recharts-legend-item-text]:fill-white/65 [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-white/10 [&_.recharts-reference-line_[stroke='#ccc']]:stroke-white/10"
          config={chartConfig}
          style={{ height }}
        >
          {chartElement}
        </ChartContainer>
        {spec.type === "scatter" && scatterData && scatterData.droppedRows > 0 ? (
          <div className="rounded-2xl border border-amber-300/20 bg-amber-300/8 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-100/70">
              Scatter notes
            </p>
            <p className="mt-2 text-xs leading-relaxed text-amber-50/80">
              {scatterData.droppedRows} row{scatterData.droppedRows === 1 ? "" : "s"} were skipped because the scatter chart needs numeric Y values and numeric or parseable date X values.
            </p>
          </div>
        ) : null}
      </div>
    </VisualizationShell>
  );
}

function Scatter3DScene({ spec }: { spec: Viz3DSpec }) {
  const [rotationX, setRotationX] = useState(-0.45);
  const [rotationY, setRotationY] = useState(0.72);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const dragRef = useRef<{
    pointerId: number;
    x: number;
    y: number;
    startX: number;
    startY: number;
  } | null>(null);

  const { projectedPoints, axisLines, axisLabels } = useMemo(() => {
    const width = 720;
    const height = 360;
    const centerX = width / 2;
    const centerY = height / 2 + 8;
    const scale = 150;

    const getRange = (values: number[]) => {
      const min = Math.min(...values);
      const max = Math.max(...values);
      const span = max - min || 1;
      return { min, max, span };
    };

    const xRange = getRange(spec.points.map((point) => point.x));
    const yRange = getRange(spec.points.map((point) => point.y));
    const zRange = getRange(spec.points.map((point) => point.z));

    const normalize = (value: number, range: { min: number; span: number }) =>
      ((value - range.min) / range.span) * 2 - 1;

    const project = (x: number, y: number, z: number) => {
      const sinY = Math.sin(rotationY);
      const cosY = Math.cos(rotationY);
      const sinX = Math.sin(rotationX);
      const cosX = Math.cos(rotationX);

      const rotatedX = x * cosY + z * sinY;
      const rotatedZ = -x * sinY + z * cosY;
      const rotatedY = y * cosX - rotatedZ * sinX;
      const depth = y * sinX + rotatedZ * cosX;
      const perspective = 1 / (depth + 3.4);

      return {
        screenX: centerX + rotatedX * scale * perspective * 2.1,
        screenY: centerY - rotatedY * scale * perspective * 2.1,
        depth,
        perspective,
      };
    };

    const projected = spec.points
      .map((point, index) => {
        const px = normalize(point.x, xRange);
        const py = normalize(point.y, yRange);
        const pz = normalize(point.z, zRange);
        const projection = project(px, py, pz);

        return {
          ...point,
          index,
          radius: (point.size ?? 10) * projection.perspective * 1.9 + 3,
          ...projection,
        };
      })
      .sort((left, right) => left.depth - right.depth);

    const axis = [
      {
        key: "x",
        color: "#22d3ee",
        label: spec.xLabel ?? "X axis",
        start: project(-1, 0, 0),
        end: project(1, 0, 0),
      },
      {
        key: "y",
        color: "#f97316",
        label: spec.yLabel ?? "Y axis",
        start: project(0, -1, 0),
        end: project(0, 1, 0),
      },
      {
        key: "z",
        color: "#a78bfa",
        label: spec.zLabel ?? "Z axis",
        start: project(0, 0, -1),
        end: project(0, 0, 1),
      },
    ];

    return {
      projectedPoints: projected,
      axisLines: axis,
      axisLabels: {
        xRange,
        yRange,
        zRange,
      },
    };
  }, [rotationX, rotationY, spec]);

  const activePoint = spec.points[activeIndex] ?? spec.points[0];

  return (
    <div className="space-y-4">
      <div
        className="relative overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.92)_0%,rgba(2,6,23,0.98)_100%)]"
        onPointerDown={(event) => {
          dragRef.current = {
            pointerId: event.pointerId,
            x: event.clientX,
            y: event.clientY,
            startX: rotationX,
            startY: rotationY,
          };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) {
            return;
          }

          const deltaX = event.clientX - dragRef.current.x;
          const deltaY = event.clientY - dragRef.current.y;
          setRotationY(dragRef.current.startY + deltaX * 0.01);
          setRotationX(clamp(dragRef.current.startX + deltaY * 0.01, -1.2, 1.2));
        }}
        onPointerUp={(event) => {
          if (dragRef.current?.pointerId === event.pointerId) {
            dragRef.current = null;
          }
        }}
        onPointerLeave={() => {
          dragRef.current = null;
        }}
      >
        <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-3 border-b border-white/8 bg-slate-950/40 px-3 py-2">
          <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">
            Drag to rotate
          </p>
          <Button
            className="border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
            onClick={() => {
              setRotationX(-0.45);
              setRotationY(0.72);
            }}
            size="xs"
            type="button"
            variant="outline"
          >
            <RotateCcwIcon className="size-3" />
            Reset view
          </Button>
        </div>

        <svg
          aria-label="Interactive 3D scatter visualization"
          className="h-[360px] w-full"
          viewBox="0 0 720 360"
        >
          <defs>
            <radialGradient id="scene-glow" cx="50%" cy="46%" r="65%">
              <stop offset="0%" stopColor="rgba(56,189,248,0.16)" />
              <stop offset="100%" stopColor="rgba(15,23,42,0)" />
            </radialGradient>
          </defs>

          <rect fill="url(#scene-glow)" height="360" width="720" x="0" y="0" />

          {axisLines.map((axis) => (
            <g key={axis.key}>
              <line
                opacity={0.75}
                stroke={axis.color}
                strokeWidth="2"
                x1={axis.start.screenX}
                x2={axis.end.screenX}
                y1={axis.start.screenY}
                y2={axis.end.screenY}
              />
              <circle
                cx={axis.end.screenX}
                cy={axis.end.screenY}
                fill={axis.color}
                opacity={0.9}
                r="3"
              />
              <text
                fill={axis.color}
                fontSize="11"
                letterSpacing="0.08em"
                x={axis.end.screenX + 8}
                y={axis.end.screenY - 8}
              >
                {axis.label}
              </text>
            </g>
          ))}

          {projectedPoints.map((point) => (
            <g
              key={`${point.label ?? "point"}-${point.index}`}
              onMouseEnter={() => setActiveIndex(point.index)}
            >
              <circle
                cx={point.screenX}
                cy={point.screenY}
                fill={point.color ?? VIZ_COLORS[point.index % VIZ_COLORS.length]}
                opacity={0.2}
                r={point.radius * 2.2}
              />
              <circle
                cx={point.screenX}
                cy={point.screenY}
                fill={point.color ?? VIZ_COLORS[point.index % VIZ_COLORS.length]}
                opacity={0.95}
                r={point.radius}
                stroke="rgba(255,255,255,0.6)"
                strokeWidth="1"
              />
              {activeIndex === point.index ? (
                <text
                  fill="rgba(240,249,255,0.92)"
                  fontSize="11"
                  x={point.screenX + 10}
                  y={point.screenY - 10}
                >
                  {point.label ?? `Point ${point.index + 1}`}
                </text>
              ) : null}
            </g>
          ))}
        </svg>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
            Active point
          </p>
          <p className="mt-2 text-sm font-semibold text-white">
            {activePoint.label ?? `Point ${activeIndex + 1}`}
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/8 p-2">
              <p className="text-[10px] uppercase tracking-[0.16em] text-cyan-100/60">
                {spec.xLabel ?? "X"}
              </p>
              <p className="mt-1 text-sm font-semibold text-cyan-100">
                {formatValue(activePoint.x)}
              </p>
            </div>
            <div className="rounded-xl border border-orange-400/20 bg-orange-400/8 p-2">
              <p className="text-[10px] uppercase tracking-[0.16em] text-orange-100/60">
                {spec.yLabel ?? "Y"}
              </p>
              <p className="mt-1 text-sm font-semibold text-orange-100">
                {formatValue(activePoint.y)}
              </p>
            </div>
            <div className="rounded-xl border border-violet-400/20 bg-violet-400/8 p-2">
              <p className="text-[10px] uppercase tracking-[0.16em] text-violet-100/60">
                {spec.zLabel ?? "Z"}
              </p>
              <p className="mt-1 text-sm font-semibold text-violet-100">
                {formatValue(activePoint.z)}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
            Axis ranges
          </p>
          <div className="mt-3 space-y-2 text-xs text-white/70">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
              <span>{spec.xLabel ?? "X axis"}</span>
              <span>
                {formatValue(axisLabels.xRange.min)} to {formatValue(axisLabels.xRange.max)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
              <span>{spec.yLabel ?? "Y axis"}</span>
              <span>
                {formatValue(axisLabels.yRange.min)} to {formatValue(axisLabels.yRange.max)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
              <span>{spec.zLabel ?? "Z axis"}</span>
              <span>
                {formatValue(axisLabels.zRange.min)} to {formatValue(axisLabels.zRange.max)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Viz3DBlock({ source }: { source: string }) {
  const parsed = useMemo(() => parse3DSpec(source), [source]);

  if (parsed.ok === false) {
    return <VisualizationError error={parsed.error} language="viz-3d" source={source} />;
  }

  const spec = parsed.value;

  return (
    <VisualizationShell
      title={spec.title}
      description={spec.description}
      insight={spec.insight}
      typeLabel="Interactive 3D scatter"
      itemCount={`${spec.points.length} points`}
      source={source}
    >
      <div className="space-y-3">
        <Scatter3DScene spec={spec} />
        {spec.notes && spec.notes.length > 0 ? (
          <div className="rounded-2xl border border-amber-300/20 bg-amber-300/8 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-100/70">
              3D fallback notes
            </p>
            <div className="mt-2 space-y-1.5 text-xs leading-relaxed text-amber-50/80">
              {spec.notes.map((note) => (
                <p key={note}>{note}</p>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </VisualizationShell>
  );
}

export const RichMessageResponse = memo(function RichMessageResponse({
  children,
  className,
  isAnimating,
}: RichMessageResponseProps) {
  const segments = useMemo(() => parseRichSegments(children), [children]);

  return (
    <div className={cn("w-full", className)}>
      {segments.map((segment) => {
        if (segment.type === "markdown") {
          if (segment.content.trim().length === 0) {
            return null;
          }

          return (
            <MessageResponse isAnimating={isAnimating} key={segment.key}>
              {segment.content}
            </MessageResponse>
          );
        }

        if (segment.type === "viz-chart") {
          return <ChartBlock key={segment.key} source={segment.content} />;
        }

        return <Viz3DBlock key={segment.key} source={segment.content} />;
      })}
    </div>
  );
});
