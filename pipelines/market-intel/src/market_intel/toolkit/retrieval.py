"""Tavily retrieval tools (search_dedup, social, QnA) — tavily-python backed."""

from __future__ import annotations

import hashlib
import time
from typing import Any, Literal

from tavily import TavilyClient

from market_intel.config import Settings, get_settings
from market_intel.toolkit.tavily_metrics import get_metrics, timed_tavily

Platform = Literal["linkedin", "reddit", "x", "combined"]

PLATFORM_DOMAINS: dict[str, list[str]] = {
    "linkedin": ["linkedin.com"],
    "reddit": ["reddit.com"],
    "x": ["x.com", "twitter.com"],
}


def _client(settings: Settings | None = None) -> TavilyClient:
    settings = settings or get_settings()
    settings.require_tavily()
    return TavilyClient(api_key=settings.tavily_api_key)


def _guard_call_budget(settings: Settings) -> None:
    if get_metrics().count >= settings.max_tavily_calls_per_run:
        raise RuntimeError(
            f"Tavily call budget exceeded ({settings.max_tavily_calls_per_run} per run)"
        )


def _retry_tavily(fn, *, attempts: int = 3):
    last: Exception | None = None
    for i in range(attempts):
        try:
            return fn()
        except Exception as exc:  # noqa: BLE001 — Tavily SDK raises varied types
            last = exc
            msg = str(exc).lower()
            if "rate" in msg or "429" in msg or "timeout" in msg:
                time.sleep(1.5 * (i + 1))
                continue
            raise
    if last:
        raise last
    raise RuntimeError("tavily retry exhausted")


def _trim_text(text: str, limit: int) -> str:
    if len(text) <= limit:
        return text
    return text[: limit - 3] + "..."


def _dedup_results(results: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: set[str] = set()
    out: list[dict[str, Any]] = []
    for r in results:
        url = (r.get("url") or "").strip().lower()
        key = url or hashlib.sha256((r.get("title") or "").encode()).hexdigest()
        if key in seen:
            continue
        seen.add(key)
        out.append(r)
    return out


def search_dedup(
    query: str,
    *,
    max_results: int | None = None,
    topic: str | None = None,
    include_domains: list[str] | None = None,
    exclude_domains: list[str] | None = None,
    settings: Settings | None = None,
) -> dict[str, Any]:
    settings = settings or get_settings()
    _guard_call_budget(settings)
    client = _client(settings)

    def _call():
        return client.search(
            query=query,
            search_depth="advanced",
            max_results=max_results or settings.max_tavily_results,
            topic=topic,
            include_domains=include_domains,
            exclude_domains=exclude_domains,
            include_raw_content="markdown",
            timeout=settings.tavily_timeout,
        )

    resp = timed_tavily("search", lambda: _retry_tavily(_call), extra={"query": query[:120]})
    results = _dedup_results(resp.get("results") or [])
    formatted: list[str] = []
    budget = settings.search_token_limit
    used = 0
    for i, r in enumerate(results, start=1):
        chunk = f"[{i}] {r.get('title','')}\nURL: {r.get('url','')}\n{r.get('content','')}\n"
        if used + len(chunk) > budget:
            chunk = _trim_text(chunk, max(200, budget - used))
        formatted.append(chunk)
        used += len(chunk)
        if used >= budget:
            break
    return {
        "query": query,
        "answer": resp.get("answer"),
        "results": results,
        "formatted_context": "\n".join(formatted),
        "source_count": len(results),
    }


def search_and_answer(query: str, *, settings: Settings | None = None) -> dict[str, Any]:
    settings = settings or get_settings()
    _guard_call_budget(settings)
    client = _client(settings)

    def _call():
        return client.qna_search(query=query, search_depth="advanced", timeout=settings.tavily_timeout)

    return timed_tavily("qna_search", lambda: _retry_tavily(_call), extra={"query": query[:120]})


def social_media_search(
    query: str,
    *,
    platform: Platform = "combined",
    max_results: int | None = None,
    settings: Settings | None = None,
) -> dict[str, Any]:
    if platform == "combined":
        merged: list[dict[str, Any]] = []
        platforms_hit: list[str] = []
        for p in ("linkedin", "reddit", "x"):
            part = social_media_search(query, platform=p, max_results=max_results, settings=settings)
            if part.get("results"):
                platforms_hit.append(p)
            merged.extend(part.get("results") or [])
        merged = _dedup_results(merged)
        return {
            "query": query,
            "platform": platform,
            "platforms_hit": platforms_hit,
            "results": merged,
            "source_count": len(merged),
        }

    domains = PLATFORM_DOMAINS.get(platform, [])
    return search_dedup(
        query,
        max_results=max_results,
        include_domains=domains,
        settings=settings,
    )


def score_source(result: dict[str, Any], company: str) -> float:
    """Heuristic relevance 0..1 for curator."""
    text = f"{result.get('title','')} {result.get('content','')}".lower()
    company_l = company.lower()
    score = 0.35
    if company_l and company_l in text:
        score += 0.35
    if result.get("url"):
        score += 0.1
    if len(text) > 400:
        score += 0.1
    return min(1.0, score)


def curator_filter(results: list[dict[str, Any]], company: str, min_score: float = 0.4) -> list[dict[str, Any]]:
    scored = [(score_source(r, company), r) for r in results]
    kept = [r for s, r in scored if s >= min_score]
    kept.sort(key=lambda r: score_source(r, company), reverse=True)
    return kept[:10]
