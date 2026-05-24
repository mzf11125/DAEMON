"""Tavily Research API (poll + stream helpers)."""

from __future__ import annotations

import time
from typing import Any, Iterator

from market_intel.config import Settings, get_settings
from market_intel.toolkit.crawl import get_client


def start_research(
    query: str,
    *,
    model: str = "mini",
    output_schema: dict[str, Any] | None = None,
    settings: Settings | None = None,
) -> dict[str, Any]:
    client = get_client(settings)
    settings = settings or get_settings()
    kwargs: dict[str, Any] = {"input": query, "model": model, "timeout": settings.tavily_timeout}
    if output_schema:
        kwargs["output_schema"] = output_schema
    return client.research(**kwargs)


def poll_research(
    request_id: str,
    *,
    timeout_s: float = 300,
    poll_interval: float = 3.0,
    settings: Settings | None = None,
) -> dict[str, Any]:
    client = get_client(settings)
    deadline = time.time() + timeout_s
    last: dict[str, Any] = {}
    while time.time() < deadline:
        last = client.get_research(request_id)
        status = (last.get("status") or "").lower()
        if status in ("completed", "failed", "error"):
            return last
        time.sleep(poll_interval)
    last.setdefault("status", "timeout")
    return last


def research_and_wait(
    query: str,
    *,
    model: str = "mini",
    output_schema: dict[str, Any] | None = None,
    settings: Settings | None = None,
) -> dict[str, Any]:
    started = start_research(query, model=model, output_schema=output_schema, settings=settings)
    request_id = started.get("request_id") or started.get("id")
    if not request_id:
        return started
    return poll_research(request_id, settings=settings)


def stream_research_events(
    query: str,
    *,
    model: str = "mini",
    settings: Settings | None = None,
) -> Iterator[dict[str, Any]]:
    """Best-effort streaming: yields poll snapshots until terminal state."""
    started = start_research(query, model=model, settings=settings)
    request_id = started.get("request_id") or started.get("id")
    if not request_id:
        yield started
        return
    while True:
        snap = poll_research(request_id, timeout_s=5, poll_interval=1.0, settings=settings)
        yield snap
        status = (snap.get("status") or "").lower()
        if status in ("completed", "failed", "error", "timeout"):
            break
