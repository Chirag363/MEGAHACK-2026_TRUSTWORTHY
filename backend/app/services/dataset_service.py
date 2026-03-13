from __future__ import annotations

import csv
import io
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


MAX_UPLOAD_BYTES = int(os.getenv("MAX_DATASET_UPLOAD_BYTES", "5242880"))
UPLOAD_DIR = Path(os.getenv("DATA_UPLOAD_DIR", "data/uploads"))


def save_uploaded_dataset(session_id: str, filename: str, raw_bytes: bytes) -> Path:
    safe_name = Path(filename or "dataset.csv").name
    target_dir = UPLOAD_DIR / session_id
    target_dir.mkdir(parents=True, exist_ok=True)

    target_path = target_dir / safe_name
    target_path.write_bytes(raw_bytes)
    return target_path


def load_dataset_records(dataset_path: str | Path) -> tuple[list[str], list[dict[str, Any]]]:
    path = Path(dataset_path)
    suffix = path.suffix.lower()

    if suffix == ".csv":
        with path.open("r", encoding="utf-8", errors="replace", newline="") as f:
            reader = csv.DictReader(f)
            rows = [dict(row) for row in reader]
            columns = list(reader.fieldnames or [])
        return columns, rows

    if suffix == ".json":
        payload = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(payload, list):
            rows = [dict(item) if isinstance(item, dict) else {"value": item} for item in payload]
            columns = list(rows[0].keys()) if rows else []
            return columns, rows
        if isinstance(payload, dict):
            rows = [dict(payload)]
            return list(payload.keys()), rows
        return ["value"], [{"value": payload}]

    raise ValueError(f"Unsupported dataset type '{suffix}'. Please upload CSV or JSON.")


def write_dataset_records(dataset_path: str | Path, columns: list[str], rows: list[dict[str, Any]]) -> None:
    path = Path(dataset_path)
    suffix = path.suffix.lower()

    path.parent.mkdir(parents=True, exist_ok=True)

    if suffix == ".csv":
        with path.open("w", encoding="utf-8", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=columns)
            writer.writeheader()
            for row in rows:
                writer.writerow({column: row.get(column, "") for column in columns})
        return

    if suffix == ".json":
        path.write_text(json.dumps(rows, ensure_ascii=True, indent=2, default=str), encoding="utf-8")
        return

    raise ValueError(f"Unsupported dataset type '{suffix}' for write.")


def save_cleaned_dataset(
    source_dataset_path: str | Path,
    columns: list[str],
    rows: list[dict[str, Any]],
    label: str,
) -> Path:
    source = Path(source_dataset_path)
    suffix = source.suffix.lower()
    if suffix not in {".csv", ".json"}:
        suffix = ".csv"

    artifacts_dir = source.parent / "artifacts"
    artifacts_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    safe_label = "".join(ch if ch.isalnum() or ch in {"-", "_"} else "-" for ch in label).strip("-")
    safe_label = safe_label or "cleaned"
    target = artifacts_dir / f"{source.stem}_{safe_label}_{timestamp}{suffix}"

    write_dataset_records(target, columns, rows)
    return target


def summarize_dataset_upload(filename: str, raw_bytes: bytes) -> tuple[str, str]:
    if not raw_bytes:
        raise ValueError("Uploaded file is empty.")

    if len(raw_bytes) > MAX_UPLOAD_BYTES:
        raise ValueError(f"File too large. Max upload size is {MAX_UPLOAD_BYTES} bytes.")

    safe_name = filename or "dataset"
    suffix = Path(safe_name).suffix.lower()
    text = raw_bytes.decode("utf-8", errors="replace")

    if suffix == ".csv":
        return _summarize_csv(safe_name, text)
    if suffix == ".json":
        return _summarize_json(safe_name, text)

    preview = text[:1800].strip() or "No readable text preview available."
    summary = f"Uploaded {safe_name} as plain text ({len(raw_bytes)} bytes)."
    context = (
        f"Dataset file: {safe_name}\n"
        f"Type: text\n"
        f"Size: {len(raw_bytes)} bytes\n"
        f"Preview:\n{preview}"
    )
    return context, summary


def _summarize_csv(filename: str, text: str) -> tuple[str, str]:
    reader = csv.reader(io.StringIO(text))
    headers = next(reader, [])

    row_count = 0
    samples: list[list[str]] = []
    for row in reader:
        row_count += 1
        if len(samples) < 5:
            samples.append(row)

    header_line = ", ".join(headers) if headers else "No headers detected"
    sample_lines = []
    for idx, row in enumerate(samples, start=1):
        sample_lines.append(f"row_{idx}: {json.dumps(row, ensure_ascii=True)}")

    sample_block = "\n".join(sample_lines) if sample_lines else "No sample rows available."
    summary = (
        f"Uploaded {filename} with {row_count} rows and {len(headers)} columns. "
        f"Columns: {header_line}."
    )
    context = (
        f"Dataset file: {filename}\n"
        f"Type: csv\n"
        f"Columns ({len(headers)}): {header_line}\n"
        f"Row count: {row_count}\n"
        f"Sample rows:\n{sample_block}"
    )

    return context, summary


def _summarize_json(filename: str, text: str) -> tuple[str, str]:
    try:
        payload = json.loads(text)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Invalid JSON file: {exc}") from exc

    if isinstance(payload, list):
        record_count = len(payload)
        first = payload[0] if payload else {}
        key_line = ", ".join(first.keys()) if isinstance(first, dict) else type(first).__name__
        sample_preview = json.dumps(payload[:2], indent=2, ensure_ascii=True)[:1800]
        summary = f"Uploaded {filename} JSON array with {record_count} records."
        context = (
            f"Dataset file: {filename}\n"
            f"Type: json-array\n"
            f"Record count: {record_count}\n"
            f"Primary keys/sample shape: {key_line}\n"
            f"Sample:\n{sample_preview}"
        )
        return context, summary

    if isinstance(payload, dict):
        keys = ", ".join(payload.keys())
        sample_preview = json.dumps(payload, indent=2, ensure_ascii=True)[:1800]
        summary = f"Uploaded {filename} JSON object with {len(payload.keys())} top-level keys."
        context = (
            f"Dataset file: {filename}\n"
            f"Type: json-object\n"
            f"Top-level keys ({len(payload.keys())}): {keys}\n"
            f"Sample:\n{sample_preview}"
        )
        return context, summary

    summary = f"Uploaded {filename} JSON value of type {type(payload).__name__}."
    context = (
        f"Dataset file: {filename}\n"
        f"Type: json-scalar\n"
        f"Value preview: {str(payload)[:300]}"
    )
    return context, summary
