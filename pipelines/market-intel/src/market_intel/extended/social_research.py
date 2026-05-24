"""L2 social research (LinkedIn/Reddit/X via Tavily domain filters)."""

from __future__ import annotations

from typing import Any, Literal

from langchain_core.messages import HumanMessage, SystemMessage

from market_intel.config import Settings, get_settings
from market_intel.postprocess.humanize import humanize_markdown
from market_intel.postprocess.normalize import build_sources_index, scrub_pii
from market_intel.prompts import SOCIAL_SYNTHESIS_SYSTEM
from market_intel.toolkit.model_config import init_chat_model
from market_intel.toolkit.retrieval import Platform, social_media_search


def _merge_results(existing: list[dict[str, Any]], new: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen = {(r.get("url") or "").lower() for r in existing}
    out = list(existing)
    for r in new:
        url = (r.get("url") or "").lower()
        if url and url in seen:
            continue
        if url:
            seen.add(url)
        out.append(r)
    return out


def run_social_research(
    topic: str,
    *,
    company: str | None = None,
    platform: Platform = "combined",
    settings: Settings | None = None,
) -> dict[str, Any]:
    settings = settings or get_settings()
    settings.require_tavily()
    query = topic if not company else f"{company} {topic}"
    max_iter = max(1, settings.max_social_iterations)

    results: list[dict[str, Any]] = []
    platforms_hit: list[str] = []
    queries_run: list[str] = [query]

    for i in range(max_iter):
        q = queries_run[-1]
        raw = social_media_search(q, platform=platform, settings=settings)
        results = _merge_results(results, raw.get("results") or [])
        if raw.get("platforms_hit"):
            for p in raw["platforms_hit"]:
                if p not in platforms_hit:
                    platforms_hit.append(p)
        if len(results) >= 6 or i + 1 >= max_iter:
            break
        llm = init_chat_model(settings)
        refine = llm.invoke(
            [
                SystemMessage(content="Return ONE short Tavily search query only, no prose."),
                HumanMessage(
                    content=(
                        f"Topic: {query}\nResults so far: {len(results)} hits.\n"
                        "Suggest a narrower query for missing LinkedIn/Reddit/X angles."
                    )
                ),
            ]
        )
        next_q = refine.content if isinstance(refine.content, str) else str(refine.content)
        next_q = next_q.strip().strip('"').split("\n")[0][:200]
        if not next_q or next_q in queries_run:
            break
        queries_run.append(next_q)

    llm = init_chat_model(settings)
    ctx_lines = []
    for i, r in enumerate(results[:12], 1):
        ctx_lines.append(f"[{i}] {r.get('url')}\n{r.get('content','')[:1500]}")
    synthesis = ""
    if ctx_lines:
        msg = llm.invoke(
            [
                SystemMessage(content=SOCIAL_SYNTHESIS_SYSTEM),
                HumanMessage(content=f"Topic: {query}\n\n" + "\n\n".join(ctx_lines)),
            ]
        )
        synthesis = msg.content if isinstance(msg.content, str) else str(msg.content)

    report_md = scrub_pii(f"# Social research: {query}\n\n{synthesis}\n")
    if settings.enable_humanize:
        report_md = humanize_markdown(report_md)
    return {
        "query": query,
        "platform": platform,
        "platforms_hit": platforms_hit or ([platform] if platform != "combined" else []),
        "queries_run": queries_run,
        "iterations": len(queries_run),
        "results": results,
        "social_report_md": report_md,
        "sources": build_sources_index(results),
    }
