"""Tavily crawl + map wrappers."""

from __future__ import annotations

from typing import Any

from tavily import TavilyClient

from market_intel.config import Settings, get_settings
from market_intel.toolkit.retrieval import _guard_call_budget, _retry_tavily
from market_intel.toolkit.tavily_metrics import timed_tavily


def get_client(settings: Settings | None = None) -> TavilyClient:
    settings = settings or get_settings()
    settings.require_tavily()
    return TavilyClient(api_key=settings.tavily_api_key)


def map_site(url: str, *, max_depth: int = 1, limit: int = 20, settings: Settings | None = None) -> dict[str, Any]:
    client = get_client(settings)
    settings = settings or get_settings()
    _guard_call_budget(settings)

    def _call():
        return client.map(url=url, max_depth=max_depth, limit=limit, timeout=settings.tavily_timeout)

    return timed_tavily("map", lambda: _retry_tavily(_call), extra={"url": url})


def crawl_site(
    url: str,
    *,
    max_depth: int = 1,
    limit: int = 10,
    instructions: str | None = None,
    settings: Settings | None = None,
) -> dict[str, Any]:
    client = get_client(settings)
    settings = settings or get_settings()
    kwargs: dict[str, Any] = {
        "url": url,
        "max_depth": max_depth,
        "limit": limit,
        "timeout": settings.tavily_timeout,
    }
    if instructions:
        kwargs["instructions"] = instructions
    _guard_call_budget(settings)

    def _call():
        return client.crawl(**kwargs)

    return timed_tavily("crawl", lambda: _retry_tavily(_call), extra={"url": url})
