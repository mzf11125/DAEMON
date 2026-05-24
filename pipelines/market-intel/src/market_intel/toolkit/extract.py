"""Tavily extract + LLM summarize."""

from __future__ import annotations

from typing import Any

from langchain_core.messages import HumanMessage, SystemMessage

from market_intel.config import Settings, get_settings
from market_intel.toolkit.context_budget import trim_to_budget
from market_intel.toolkit.crawl import get_client
from market_intel.toolkit.model_config import init_chat_model
from market_intel.toolkit.retrieval import _guard_call_budget, _retry_tavily
from market_intel.toolkit.tavily_metrics import timed_tavily


def extract_urls(
    urls: list[str] | str,
    *,
    query: str | None = None,
    settings: Settings | None = None,
) -> dict[str, Any]:
    settings = settings or get_settings()
    client = get_client(settings)
    _guard_call_budget(settings)

    def _call():
        return client.extract(
            urls=urls,
            extract_depth="advanced",
            format="markdown",
            query=query,
            timeout=settings.tavily_timeout,
        )

    return timed_tavily(
        "extract",
        lambda: _retry_tavily(_call),
        extra={"url_count": len(urls) if isinstance(urls, list) else 1},
    )


def extract_and_summarize(
    urls: list[str],
    *,
    focus: str,
    settings: Settings | None = None,
) -> dict[str, Any]:
    settings = settings or get_settings()
    batch = extract_urls(urls, query=focus, settings=settings)
    successes = []
    failed = batch.get("failed_results") or []
    for item in batch.get("results") or []:
        raw = item.get("raw_content") or item.get("content") or ""
        if not raw.strip():
            continue
        successes.append({"url": item.get("url"), "raw_content": raw})

    if not successes:
        return {"summary": "", "sources": [], "failed_results": failed, "extract_batch": batch}

    llm = init_chat_model(settings)
    raw_ctx = "\n\n---\n\n".join(f"URL: {s['url']}\n{s['raw_content'][:8000]}" for s in successes[:5])
    context, _ = trim_to_budget(raw_ctx, settings.llm_context_char_limit)
    prompt = (
        f"Summarize the following extracted pages with focus: {focus}. "
        "Use bullet points. Note gaps or contradictions. Do not invent facts."
    )
    msg = llm.invoke([SystemMessage(content=prompt), HumanMessage(content=context)])
    summary = msg.content if isinstance(msg.content, str) else str(msg.content)
    return {
        "summary": summary,
        "sources": [{"url": s["url"]} for s in successes],
        "failed_results": failed,
        "extract_batch": batch,
    }
