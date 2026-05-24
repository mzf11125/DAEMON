"""L2c Shodan Trends API client (historical aggregates only)."""

from __future__ import annotations

from typing import Any

import httpx

from market_intel.config import Settings, get_settings

TRENDS_BASE = "https://trends.shodan.io"


def search_trends(
    query: str,
    *,
    facets: str | None = None,
    settings: Settings | None = None,
) -> dict[str, Any]:
    settings = settings or get_settings()
    key = (settings.shodan_api_key or "").strip()
    if not key:
        return {"skipped": True, "reason": "SHODAN_API_KEY not set"}

    params: dict[str, str] = {"query": query, "key": key}
    if facets:
        params["facets"] = facets
    with httpx.Client(timeout=60.0) as client:
        resp = client.get(f"{TRENDS_BASE}/api/v1/search", params=params)
        resp.raise_for_status()
        return resp.json()
