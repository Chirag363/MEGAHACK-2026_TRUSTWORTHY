from __future__ import annotations

import json
import math
import statistics
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from uuid import uuid4

from langchain_core.tools import tool

from app.services.dataset_service import load_dataset_records, save_cleaned_dataset


class DatasetToolService:
    def __init__(self, dataset_path: str | Path):
        self.dataset_path = Path(dataset_path)
        self._columns: list[str] | None = None
        self._rows: list[dict[str, Any]] | None = None
        self._artifacts: list[dict[str, str]] = []

    @staticmethod
    def _is_missing(value: Any) -> bool:
        if value is None:
            return True
        text = str(value).strip().lower()
        return text in {"", "na", "nan", "null", "none"}

    def _load(self) -> tuple[list[str], list[dict[str, Any]]]:
        if self._columns is None or self._rows is None:
            self._columns, self._rows = load_dataset_records(self.dataset_path)
        return self._columns, self._rows

    @staticmethod
    def _to_float(value: Any) -> float | None:
        if value is None:
            return None
        text = str(value).strip()
        if text == "" or text.lower() in {"na", "nan", "null", "none"}:
            return None
        try:
            return float(text)
        except ValueError:
            return None

    def build_tools(self):
        @tool("dataset_schema")
        def dataset_schema() -> str:
            """Return dataset schema with columns, inferred types, and row count."""
            columns, rows = self._load()
            inferred = {}
            for column in columns:
                numeric_hits = 0
                non_empty = 0
                for row in rows[:300]:
                    value = row.get(column)
                    if value is None or str(value).strip() == "":
                        continue
                    non_empty += 1
                    if self._to_float(value) is not None:
                        numeric_hits += 1
                inferred[column] = "numeric" if non_empty and numeric_hits / non_empty > 0.8 else "categorical"

            payload = {
                "rows": len(rows),
                "columns": columns,
                "inferred_types": inferred,
            }
            return json.dumps(payload, ensure_ascii=True)

        @tool("sample_rows")
        def sample_rows(n: int = 5) -> str:
            """Return sample rows from the uploaded dataset."""
            _, rows = self._load()
            limited = max(1, min(int(n), 20))
            return json.dumps(rows[:limited], ensure_ascii=True, default=str)

        @tool("missing_values_report")
        def missing_values_report() -> str:
            """Return per-column missing value counts and percentages."""
            columns, rows = self._load()
            total = max(len(rows), 1)

            payload = {}
            for column in columns:
                missing = 0
                for row in rows:
                    value = row.get(column)
                    if value is None or str(value).strip() == "":
                        missing += 1
                payload[column] = {
                    "count": missing,
                    "pct": round(missing / total * 100, 2),
                }

            return json.dumps(payload, ensure_ascii=True)

        @tool("summary_statistics")
        def summary_statistics() -> str:
            """Return numeric summary stats: count, mean, std, min, median, max."""
            columns, rows = self._load()
            payload = {}

            for column in columns:
                values = []
                for row in rows:
                    number = self._to_float(row.get(column))
                    if number is not None:
                        values.append(number)

                if not values:
                    continue

                payload[column] = {
                    "count": len(values),
                    "mean": round(statistics.fmean(values), 4),
                    "std": round(statistics.pstdev(values), 4) if len(values) > 1 else 0.0,
                    "min": round(min(values), 4),
                    "median": round(statistics.median(values), 4),
                    "max": round(max(values), 4),
                }

            if not payload:
                return json.dumps({"message": "No numeric columns detected."}, ensure_ascii=True)
            return json.dumps(payload, ensure_ascii=True)

        @tool("correlation_report")
        def correlation_report(top_n: int = 10) -> str:
            """Return strongest absolute Pearson correlations between numeric columns."""
            columns, rows = self._load()
            numeric_by_col: dict[str, list[float]] = {}

            for column in columns:
                values = []
                for row in rows:
                    number = self._to_float(row.get(column))
                    if number is not None:
                        values.append(number)
                if len(values) >= 3:
                    numeric_by_col[column] = values

            keys = list(numeric_by_col.keys())
            if len(keys) < 2:
                return json.dumps({"message": "At least two numeric columns are required."}, ensure_ascii=True)

            pairs = []
            for i in range(len(keys)):
                for j in range(i + 1, len(keys)):
                    c1 = keys[i]
                    c2 = keys[j]

                    paired = []
                    for row in rows:
                        a = self._to_float(row.get(c1))
                        b = self._to_float(row.get(c2))
                        if a is not None and b is not None:
                            paired.append((a, b))

                    if len(paired) < 3:
                        continue

                    xs = [item[0] for item in paired]
                    ys = [item[1] for item in paired]
                    x_mean = statistics.fmean(xs)
                    y_mean = statistics.fmean(ys)
                    numerator = sum((x - x_mean) * (y - y_mean) for x, y in paired)
                    denom_x = math.sqrt(sum((x - x_mean) ** 2 for x in xs))
                    denom_y = math.sqrt(sum((y - y_mean) ** 2 for y in ys))
                    if denom_x == 0 or denom_y == 0:
                        continue

                    corr = numerator / (denom_x * denom_y)
                    pairs.append(
                        {
                            "column_a": c1,
                            "column_b": c2,
                            "correlation": round(corr, 4),
                            "abs_correlation": round(abs(corr), 4),
                        }
                    )

            pairs.sort(key=lambda item: item["abs_correlation"], reverse=True)
            limited = max(1, min(int(top_n), 50))
            return json.dumps(pairs[:limited], ensure_ascii=True)

        @tool("outlier_report_iqr")
        def outlier_report_iqr() -> str:
            """Return outlier counts for numeric columns using IQR fences."""
            columns, rows = self._load()
            payload = {}

            for column in columns:
                values = []
                for row in rows:
                    number = self._to_float(row.get(column))
                    if number is not None:
                        values.append(number)

                if len(values) < 4:
                    continue

                sorted_values = sorted(values)
                q1_idx = int((len(sorted_values) - 1) * 0.25)
                q3_idx = int((len(sorted_values) - 1) * 0.75)
                q1 = sorted_values[q1_idx]
                q3 = sorted_values[q3_idx]
                iqr = q3 - q1
                lower = q1 - 1.5 * iqr
                upper = q3 + 1.5 * iqr
                outliers = [value for value in values if value < lower or value > upper]

                payload[column] = {
                    "outliers": len(outliers),
                    "total": len(values),
                    "pct": round(len(outliers) / len(values) * 100, 2),
                }

            if not payload:
                return json.dumps({"message": "No numeric columns with enough values for IQR analysis."}, ensure_ascii=True)
            return json.dumps(payload, ensure_ascii=True)

        @tool("impute_missing_values")
        def impute_missing_values(
            strategy: str = "mean",
            columns: str = "",
            constant_value: str = "0",
        ) -> str:
            """Fill missing values, save cleaned dataset artifact, and return artifact metadata.

            strategy: one of mean, median, mode, constant
            columns: comma-separated column names. Empty means all columns with missing values.
            constant_value: used only when strategy is constant.
            """
            selected_strategy = strategy.strip().lower()
            if selected_strategy not in {"mean", "median", "mode", "constant"}:
                return json.dumps(
                    {"error": "Unsupported strategy. Use one of: mean, median, mode, constant."},
                    ensure_ascii=True,
                )

            dataset_columns, rows = self._load()
            requested_columns = [item.strip() for item in columns.split(",") if item.strip()]
            if requested_columns:
                target_columns = [column for column in requested_columns if column in dataset_columns]
            else:
                target_columns = [
                    column
                    for column in dataset_columns
                    if any(self._is_missing(row.get(column)) for row in rows)
                ]

            if not target_columns:
                return json.dumps({"message": "No eligible columns found for imputation."}, ensure_ascii=True)

            cleaned_rows = [dict(row) for row in rows]
            columns_updated: list[str] = []
            missing_before = 0
            missing_after = 0
            filled_cells = 0

            for column in target_columns:
                missing_indices = []
                non_missing_values = []

                for idx, row in enumerate(cleaned_rows):
                    value = row.get(column)
                    if self._is_missing(value):
                        missing_indices.append(idx)
                    else:
                        non_missing_values.append(value)

                if not missing_indices:
                    continue

                missing_before += len(missing_indices)

                fill_value: Any = None
                if selected_strategy in {"mean", "median"}:
                    numeric_values = [self._to_float(value) for value in non_missing_values]
                    numeric_values = [value for value in numeric_values if value is not None]
                    if not numeric_values:
                        missing_after += len(missing_indices)
                        continue

                    if selected_strategy == "mean":
                        fill_value = round(statistics.fmean(numeric_values), 6)
                    else:
                        fill_value = round(statistics.median(numeric_values), 6)
                elif selected_strategy == "mode":
                    normalized = [str(value).strip() for value in non_missing_values if str(value).strip()]
                    if not normalized:
                        missing_after += len(missing_indices)
                        continue
                    modes = statistics.multimode(normalized)
                    fill_value = modes[0] if modes else normalized[0]
                else:
                    fill_value = constant_value

                for idx in missing_indices:
                    cleaned_rows[idx][column] = fill_value

                columns_updated.append(column)
                filled_cells += len(missing_indices)

            if not columns_updated:
                return json.dumps(
                    {"message": "No values were imputed. Check strategy and column data types."},
                    ensure_ascii=True,
                )

            for column in target_columns:
                for row in cleaned_rows:
                    if self._is_missing(row.get(column)):
                        missing_after += 1

            cleaned_path = save_cleaned_dataset(
                source_dataset_path=self.dataset_path,
                columns=dataset_columns,
                rows=cleaned_rows,
                label=f"imputed-{selected_strategy}",
            )

            artifact_id = uuid4().hex[:12]
            artifact = {
                "artifact_id": artifact_id,
                "name": cleaned_path.name,
                "kind": "cleaned_dataset",
                "path": str(cleaned_path),
                "created_at": datetime.now(timezone.utc).isoformat(),
                "source_tool": "impute_missing_values",
            }
            self._artifacts.append(artifact)

            return json.dumps(
                {
                    "artifact_id": artifact_id,
                    "artifact_name": cleaned_path.name,
                    "artifact_path": str(cleaned_path),
                    "strategy": selected_strategy,
                    "columns_updated": columns_updated,
                    "missing_before": missing_before,
                    "filled_cells": filled_cells,
                    "missing_after": missing_after,
                },
                ensure_ascii=True,
            )

        return [
            dataset_schema,
            sample_rows,
            missing_values_report,
            summary_statistics,
            correlation_report,
            outlier_report_iqr,
            impute_missing_values,
        ]

    def get_artifacts(self) -> list[dict[str, str]]:
        return list(self._artifacts)
