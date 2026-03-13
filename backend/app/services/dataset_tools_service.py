from __future__ import annotations

import json
import math
import statistics
from collections import Counter
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

    @staticmethod
    def _normalize_column_name(value: str) -> str:
        return "".join(char.lower() for char in str(value) if char.isalnum())

    def _resolve_column(self, requested: str, columns: list[str]) -> str | None:
        candidate = str(requested or "").strip()
        if not candidate:
            return None

        exact_lower = {column.lower(): column for column in columns}
        if candidate.lower() in exact_lower:
            return exact_lower[candidate.lower()]

        normalized = self._normalize_column_name(candidate)
        exact_normalized = [
            column for column in columns if self._normalize_column_name(column) == normalized
        ]
        if len(exact_normalized) == 1:
            return exact_normalized[0]

        partial_matches = [
            column for column in columns if normalized and normalized in self._normalize_column_name(column)
        ]
        if len(partial_matches) == 1:
            return partial_matches[0]

        return None

    @staticmethod
    def _parse_datetime(value: Any) -> datetime | None:
        if isinstance(value, datetime):
            return value
        if value is None:
            return None

        text = str(value).strip()
        if not text or text.lower() in {"na", "nan", "null", "none"}:
            return None

        iso_candidate = text.replace("Z", "+00:00")
        try:
            return datetime.fromisoformat(iso_candidate)
        except ValueError:
            pass

        formats = (
            "%Y-%m-%d",
            "%Y/%m/%d",
            "%Y-%m-%d %H:%M:%S",
            "%Y/%m/%d %H:%M:%S",
            "%m/%d/%Y",
            "%d/%m/%Y",
            "%m/%d/%y",
            "%d/%m/%y",
            "%m-%d-%Y",
            "%d-%m-%Y",
        )
        for fmt in formats:
            try:
                return datetime.strptime(text, fmt)
            except ValueError:
                continue

        return None

    @staticmethod
    def _bucket_datetime(value: datetime, frequency: str) -> tuple[str, tuple[int, ...]]:
        selected = str(frequency or "month").strip().lower()

        if selected == "day":
            return value.strftime("%Y-%m-%d"), (value.year, value.month, value.day)
        if selected == "week":
            iso_year, iso_week, _ = value.isocalendar()
            return f"{iso_year}-W{iso_week:02d}", (iso_year, iso_week)
        if selected == "quarter":
            quarter = (value.month - 1) // 3 + 1
            return f"{value.year}-Q{quarter}", (value.year, quarter)
        if selected == "year":
            return str(value.year), (value.year,)

        return value.strftime("%Y-%m"), (value.year, value.month)

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

        @tool("distinct_values")
        def distinct_values(column: str, limit: int = 20) -> str:
            """Return the most common distinct values for a column with counts and percentages."""
            columns, rows = self._load()
            resolved_column = self._resolve_column(column, columns)
            if not resolved_column:
                return json.dumps(
                    {
                        "error": f"Column '{column}' was not found.",
                        "available_columns": columns,
                    },
                    ensure_ascii=True,
                )

            counter: Counter[str] = Counter()
            non_missing = 0
            for row in rows:
                value = row.get(resolved_column)
                if self._is_missing(value):
                    continue
                normalized = str(value).strip()
                if not normalized:
                    continue
                counter[normalized] += 1
                non_missing += 1

            limited = max(1, min(int(limit), 50))
            payload = [
                {
                    "value": value,
                    "count": count,
                    "pct": round(count / max(non_missing, 1) * 100, 2),
                }
                for value, count in counter.most_common(limited)
            ]
            return json.dumps(
                {
                    "column": resolved_column,
                    "non_missing": non_missing,
                    "values": payload,
                },
                ensure_ascii=True,
            )

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

        @tool("aggregate_data")
        def aggregate_data(
            group_by: str,
            value_column: str,
            aggregation: str = "sum",
            limit: int = 25,
            descending: bool = True,
        ) -> str:
            """Group rows by one or more columns and aggregate a numeric value column.

            group_by: comma-separated column names such as "Region" or "Category,Sub-Category"
            value_column: numeric column to aggregate, such as "Sales"
            aggregation: one of sum, avg, mean, min, max, count
            """
            columns, rows = self._load()
            requested_groups = [item.strip() for item in str(group_by).split(",") if item.strip()]
            resolved_groups = [self._resolve_column(item, columns) for item in requested_groups]
            if not requested_groups or any(item is None for item in resolved_groups):
                return json.dumps(
                    {
                        "error": f"Unable to resolve group_by columns from '{group_by}'.",
                        "available_columns": columns,
                    },
                    ensure_ascii=True,
                )

            selected_aggregation = str(aggregation or "sum").strip().lower()
            if selected_aggregation == "mean":
                selected_aggregation = "avg"
            if selected_aggregation not in {"sum", "avg", "min", "max", "count"}:
                return json.dumps(
                    {"error": "Unsupported aggregation. Use sum, avg, mean, min, max, or count."},
                    ensure_ascii=True,
                )

            resolved_value = None
            if selected_aggregation != "count":
                resolved_value = self._resolve_column(value_column, columns)
                if not resolved_value:
                    return json.dumps(
                        {
                            "error": f"Value column '{value_column}' was not found.",
                            "available_columns": columns,
                        },
                        ensure_ascii=True,
                    )

            grouped: dict[tuple[str, ...], dict[str, float | int | None]] = {}
            dropped_rows = 0

            for row in rows:
                key = tuple(
                    str(row.get(column)).strip() if not self._is_missing(row.get(column)) else "Unknown"
                    for column in resolved_groups
                    if column is not None
                )

                state = grouped.setdefault(
                    key,
                    {
                        "count": 0,
                        "sum": 0.0,
                        "min": None,
                        "max": None,
                    },
                )

                if selected_aggregation == "count":
                    state["count"] = int(state["count"] or 0) + 1
                    continue

                number = self._to_float(row.get(resolved_value))
                if number is None:
                    dropped_rows += 1
                    continue

                state["count"] = int(state["count"] or 0) + 1
                state["sum"] = float(state["sum"] or 0.0) + number
                state["min"] = number if state["min"] is None else min(float(state["min"]), number)
                state["max"] = number if state["max"] is None else max(float(state["max"]), number)

            results = []
            for key, state in grouped.items():
                if selected_aggregation == "count":
                    value = int(state["count"] or 0)
                elif selected_aggregation == "sum":
                    value = round(float(state["sum"] or 0.0), 4)
                elif selected_aggregation == "avg":
                    count = int(state["count"] or 0)
                    value = round(float(state["sum"] or 0.0) / count, 4) if count else None
                elif selected_aggregation == "min":
                    value = round(float(state["min"]), 4) if state["min"] is not None else None
                else:
                    value = round(float(state["max"]), 4) if state["max"] is not None else None

                results.append(
                    {
                        **{resolved_groups[idx]: key[idx] for idx in range(len(key))},
                        "value": value,
                    }
                )

            results.sort(
                key=lambda item: (
                    item["value"] is None,
                    item["value"] if isinstance(item["value"], (int, float)) else str(item["value"]),
                ),
                reverse=bool(descending),
            )

            limited = max(1, min(int(limit), 200))
            return json.dumps(
                {
                    "group_by": [column for column in resolved_groups if column is not None],
                    "value_column": resolved_value or "__row_count__",
                    "aggregation": selected_aggregation,
                    "dropped_rows_non_numeric": dropped_rows,
                    "rows": results[:limited],
                },
                ensure_ascii=True,
            )

        @tool("time_series_aggregate")
        def time_series_aggregate(
            date_column: str,
            value_column: str,
            frequency: str = "month",
            aggregation: str = "sum",
            limit: int = 36,
        ) -> str:
            """Aggregate a numeric value over time buckets such as month, quarter, or year."""
            columns, rows = self._load()
            resolved_date = self._resolve_column(date_column, columns)
            resolved_value = self._resolve_column(value_column, columns)
            if not resolved_date or not resolved_value:
                return json.dumps(
                    {
                        "error": "Unable to resolve date_column or value_column.",
                        "available_columns": columns,
                    },
                    ensure_ascii=True,
                )

            selected_aggregation = str(aggregation or "sum").strip().lower()
            if selected_aggregation == "mean":
                selected_aggregation = "avg"
            if selected_aggregation not in {"sum", "avg", "min", "max", "count"}:
                return json.dumps(
                    {"error": "Unsupported aggregation. Use sum, avg, mean, min, max, or count."},
                    ensure_ascii=True,
                )

            buckets: dict[str, dict[str, float | int | tuple[int, ...] | None]] = {}
            invalid_dates = 0
            invalid_values = 0

            for row in rows:
                parsed_date = self._parse_datetime(row.get(resolved_date))
                if parsed_date is None:
                    invalid_dates += 1
                    continue

                bucket, sort_key = self._bucket_datetime(parsed_date, frequency)
                state = buckets.setdefault(
                    bucket,
                    {
                        "sort_key": sort_key,
                        "count": 0,
                        "sum": 0.0,
                        "min": None,
                        "max": None,
                    },
                )

                if selected_aggregation == "count":
                    state["count"] = int(state["count"] or 0) + 1
                    continue

                number = self._to_float(row.get(resolved_value))
                if number is None:
                    invalid_values += 1
                    continue

                state["count"] = int(state["count"] or 0) + 1
                state["sum"] = float(state["sum"] or 0.0) + number
                state["min"] = number if state["min"] is None else min(float(state["min"]), number)
                state["max"] = number if state["max"] is None else max(float(state["max"]), number)

            results = []
            for bucket, state in sorted(
                buckets.items(),
                key=lambda item: item[1].get("sort_key") or (),
            ):
                if selected_aggregation == "count":
                    value = int(state["count"] or 0)
                elif selected_aggregation == "sum":
                    value = round(float(state["sum"] or 0.0), 4)
                elif selected_aggregation == "avg":
                    count = int(state["count"] or 0)
                    value = round(float(state["sum"] or 0.0) / count, 4) if count else None
                elif selected_aggregation == "min":
                    value = round(float(state["min"]), 4) if state["min"] is not None else None
                else:
                    value = round(float(state["max"]), 4) if state["max"] is not None else None

                results.append({"period": bucket, "value": value})

            limited = max(1, min(int(limit), 240))
            return json.dumps(
                {
                    "date_column": resolved_date,
                    "value_column": resolved_value,
                    "frequency": str(frequency or "month").strip().lower() or "month",
                    "aggregation": selected_aggregation,
                    "invalid_dates": invalid_dates,
                    "invalid_values": invalid_values,
                    "rows": results[:limited],
                },
                ensure_ascii=True,
            )

        @tool("entity_performance_metrics")
        def entity_performance_metrics(
            entity_column: str,
            revenue_column: str,
            date_column: str,
            profit_column: str = "",
            frequency: str = "month",
            limit: int = 25,
        ) -> str:
            """Compute per-entity revenue totals plus optional profit/margin and period-over-period growth."""
            columns, rows = self._load()
            resolved_entity = self._resolve_column(entity_column, columns)
            resolved_revenue = self._resolve_column(revenue_column, columns)
            resolved_date = self._resolve_column(date_column, columns)
            resolved_profit = self._resolve_column(profit_column, columns) if profit_column else self._resolve_column("Profit", columns)

            if not resolved_entity or not resolved_revenue or not resolved_date:
                return json.dumps(
                    {
                        "error": "Unable to resolve entity_column, revenue_column, or date_column.",
                        "available_columns": columns,
                    },
                    ensure_ascii=True,
                )

            stats: dict[str, dict[str, Any]] = {}
            invalid_dates = 0
            invalid_revenue = 0

            for row in rows:
                entity_value = row.get(resolved_entity)
                entity_key = str(entity_value).strip() if not self._is_missing(entity_value) else "Unknown"

                parsed_date = self._parse_datetime(row.get(resolved_date))
                if parsed_date is None:
                    invalid_dates += 1
                    continue

                revenue = self._to_float(row.get(resolved_revenue))
                if revenue is None:
                    invalid_revenue += 1
                    continue

                bucket, sort_key = self._bucket_datetime(parsed_date, frequency)
                entity_state = stats.setdefault(
                    entity_key,
                    {
                        "total_revenue": 0.0,
                        "total_profit": 0.0,
                        "profit_rows": 0,
                        "periods": {},
                        "period_sort_keys": {},
                    },
                )

                entity_state["total_revenue"] += revenue
                entity_state["periods"][bucket] = entity_state["periods"].get(bucket, 0.0) + revenue
                entity_state["period_sort_keys"][bucket] = sort_key

                if resolved_profit:
                    profit = self._to_float(row.get(resolved_profit))
                    if profit is not None:
                        entity_state["total_profit"] += profit
                        entity_state["profit_rows"] += 1

            rows_out = []
            for entity_name, state in stats.items():
                sorted_periods = sorted(
                    state["periods"].items(),
                    key=lambda item: state["period_sort_keys"].get(item[0]) or (),
                )
                latest_period = sorted_periods[-1] if sorted_periods else None
                previous_period = sorted_periods[-2] if len(sorted_periods) >= 2 else None

                latest_value = latest_period[1] if latest_period else None
                previous_value = previous_period[1] if previous_period else None
                growth_pct = None
                if latest_value is not None and previous_value not in (None, 0):
                    growth_pct = round((latest_value - previous_value) / abs(previous_value) * 100, 2)

                total_revenue = round(float(state["total_revenue"]), 4)
                total_profit = round(float(state["total_profit"]), 4) if state["profit_rows"] else None
                margin_pct = None
                if total_profit is not None and total_revenue != 0:
                    margin_pct = round(total_profit / total_revenue * 100, 2)

                rows_out.append(
                    {
                        "entity": entity_name,
                        "total_revenue": total_revenue,
                        "total_profit": total_profit,
                        "margin_pct": margin_pct,
                        "latest_period": latest_period[0] if latest_period else None,
                        "latest_period_revenue": round(float(latest_value), 4) if latest_value is not None else None,
                        "previous_period": previous_period[0] if previous_period else None,
                        "previous_period_revenue": round(float(previous_value), 4) if previous_value is not None else None,
                        "growth_pct": growth_pct,
                    }
                )

            rows_out.sort(key=lambda item: item["total_revenue"], reverse=True)
            limited = max(1, min(int(limit), 200))
            return json.dumps(
                {
                    "entity_column": resolved_entity,
                    "revenue_column": resolved_revenue,
                    "date_column": resolved_date,
                    "profit_column": resolved_profit,
                    "frequency": str(frequency or "month").strip().lower() or "month",
                    "invalid_dates": invalid_dates,
                    "invalid_revenue": invalid_revenue,
                    "rows": rows_out[:limited],
                },
                ensure_ascii=True,
            )

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
            distinct_values,
            missing_values_report,
            summary_statistics,
            aggregate_data,
            time_series_aggregate,
            entity_performance_metrics,
            correlation_report,
            outlier_report_iqr,
            impute_missing_values,
        ]

    def get_artifacts(self) -> list[dict[str, str]]:
        return list(self._artifacts)
