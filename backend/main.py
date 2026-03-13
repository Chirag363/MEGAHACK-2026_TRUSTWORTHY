from __future__ import annotations

import argparse
import os
import sys

import uvicorn

from app.core.logging_config import setup_logging


def _to_bool(value: str, default: bool) -> bool:
    if value is None:
        return default
    return value.lower() in {"1", "true", "yes", "on"}


def _run_server(argv: list[str]) -> None:
    default_host = os.getenv("API_HOST", "0.0.0.0")
    default_port = int(os.getenv("API_PORT", "8000"))
    default_reload = _to_bool(os.getenv("API_RELOAD"), default=True)

    parser = argparse.ArgumentParser(description="Run InsightForge FastAPI backend")
    parser.add_argument("--host", default=default_host, help="Bind host")
    parser.add_argument("--port", type=int, default=default_port, help="Bind port")
    parser.add_argument(
        "--reload",
        action=argparse.BooleanOptionalAction,
        default=default_reload,
        help="Enable/disable reload",
    )
    args = parser.parse_args(argv)

    setup_logging()
    uvicorn.run("app.api:app", host=args.host, port=args.port, reload=args.reload)


def main() -> None:
    mode_parser = argparse.ArgumentParser(add_help=False)
    mode_parser.add_argument("mode", nargs="?", default="serve")
    parsed_mode, remaining = mode_parser.parse_known_args(sys.argv[1:])

    if parsed_mode.mode == "cmd":
        setup_logging()
        parser = build_parser()
        args = parser.parse_args(["cmd", *remaining])
        args.func(args)
        return

    if parsed_mode.mode == "serve":
        _run_server(remaining)
        return

    raise SystemExit("Unknown mode. Use 'serve' or 'cmd'.")


if __name__ == "__main__":
    main()
