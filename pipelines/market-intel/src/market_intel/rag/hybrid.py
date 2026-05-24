"""Hybrid research: internal pgvector + Tavily web gap-fill + enrichment flywheel."""

from __future__ import annotations

from typing import Any

from langchain_core.messages import HumanMessage, SystemMessage

from market_intel.config import Settings, get_settings
from market_intel.prompts import HYBRID_SYSTEM
from market_intel.rag.internal_rag import retrieve_chunks
from market_intel.rag.vectorize import upsert_web_enrichment
from market_intel.security import sanitize_user_query
from market_intel.toolkit.context_budget import trim_to_budget
from market_intel.toolkit.model_config import init_chat_model
from market_intel.toolkit.retrieval import search_dedup


def hybrid_research(
    thread_id: str,
    question: str,
    *,
    enrich_kb: bool = True,
    settings: Settings | None = None,
) -> dict[str, Any]:
    settings = settings or get_settings()
    settings.require_tavily()
    question = sanitize_user_query(question)

    internal = retrieve_chunks(thread_id, question, top_k=4, settings=settings)
    web = search_dedup(question, max_results=5, settings=settings)
    web_results = web.get("results") or []

    enrichment = {"ingested": 0}
    if enrich_kb and web_results:
        enrichment = upsert_web_enrichment(thread_id, web_results, settings=settings)

    internal_ctx = "\n".join(
        f"[INTERNAL {i}] {c['url']}\n{c['content'][:1500]}" for i, c in enumerate(internal, 1)
    )
    web_ctx = "\n".join(
        f"[WEB {i}] {r.get('url')}\n{r.get('content','')[:1200]}" for i, r in enumerate(web_results, 1)
    )
    combined, _ = trim_to_budget(
        f"{internal_ctx}\n\n{web_ctx}",
        settings.llm_context_char_limit,
    )

    llm = init_chat_model(settings)
    msg = llm.invoke(
        [
            SystemMessage(content=HYBRID_SYSTEM),
            HumanMessage(content=f"Question: {question}\n\n{combined}"),
        ]
    )
    answer = msg.content if isinstance(msg.content, str) else str(msg.content)
    return {
        "answer": answer,
        "internal_chunks": internal,
        "web_sources": [{"url": r.get("url"), "title": r.get("title")} for r in web_results],
        "web_enriched_count": len(web_results),
        "kb_enrichment": enrichment,
    }
