"""L1 LangGraph company research pipeline."""

from __future__ import annotations

from typing import Any, TypedDict

from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import END, StateGraph

from market_intel.config import Settings, get_settings
from market_intel.extended.ai_visibility import build_ai_visibility, render_ai_visibility_markdown
from market_intel.postprocess.humanize import humanize_markdown
from market_intel.postprocess.normalize import build_sources_index, scrub_pii
from market_intel.prompts import L1_BRIEFING_SYSTEM, L1_EDITOR_SYSTEM
from market_intel.toolkit.context_budget import pack_sections, trim_to_budget
from market_intel.toolkit.extract import extract_and_summarize
from market_intel.toolkit.model_config import init_chat_model
from market_intel.toolkit.retrieval import curator_filter, search_dedup, social_media_search


class L1State(TypedDict, total=False):
    company: str
    domain: str | None
    industry: str | None
    include_ai_visibility: bool
    enable_humanize: bool
    queries: list[str]
    raw_results: list[dict[str, Any]]
    curated: list[dict[str, Any]]
    extract_summary: dict[str, Any]
    social: dict[str, Any]
    draft_md: str
    report_md: str
    account_brief: dict[str, Any]


def _plan_queries(state: L1State) -> L1State:
    company = state["company"]
    industry = state.get("industry") or "technology"
    domain = state.get("domain")
    queries = [
        f"{company} company overview products customers",
        f"{company} {industry} news funding leadership",
        f"What do customers say about {company}?",
    ]
    if domain:
        queries.append(f"site:{domain} pricing product documentation")
    return {**state, "queries": queries}


def _research(state: L1State, settings: Settings) -> L1State:
    merged: list[dict[str, Any]] = []
    for q in state.get("queries") or []:
        resp = search_dedup(q, settings=settings)
        merged.extend(resp.get("results") or [])
    seen: set[str] = set()
    raw: list[dict[str, Any]] = []
    for r in merged:
        u = (r.get("url") or "").lower()
        if u and u in seen:
            continue
        if u:
            seen.add(u)
        raw.append(r)
    return {**state, "raw_results": raw}


def _curate(state: L1State) -> L1State:
    curated = curator_filter(state.get("raw_results") or [], state["company"])
    return {**state, "curated": curated}


def _extract_deep(state: L1State, settings: Settings) -> L1State:
    curated = state.get("curated") or []
    urls = [r["url"] for r in curated[:3] if r.get("url")]
    if not urls:
        return {**state, "extract_summary": {}}
    focus = f"{state['company']} product positioning pricing and differentiation"
    summary = extract_and_summarize(urls, focus=focus, settings=settings)
    return {**state, "extract_summary": summary}


def _social_optional(state: L1State, settings: Settings) -> L1State:
    if not state.get("include_ai_visibility", True):
        return {**state, "social": {}}
    company = state["company"]
    social = social_media_search(f"{company} brand perception", platform="combined", settings=settings)
    return {**state, "social": social}


def _brief(state: L1State, settings: Settings) -> L1State:
    llm = init_chat_model(settings)
    curated = state.get("curated") or []
    extract = state.get("extract_summary") or {}
    sections: list[tuple[str, str]] = []
    if curated:
        lines = []
        for i, r in enumerate(curated, 1):
            lines.append(f"[{i}] {r.get('title')} — {r.get('url')}\n{r.get('content','')[:1200]}")
        sections.append(("Search results", "\n\n".join(lines)))
    if extract.get("summary"):
        sections.append(("Deep extract", extract["summary"]))
    ctx = pack_sections(sections, max_chars=settings.llm_context_char_limit) if sections else ""
    if not ctx:
        ctx = search_dedup(f"{state['company']} summary", settings=settings)["formatted_context"]
    prompt = f"Company: {state['company']}\nIndustry: {state.get('industry') or 'n/a'}\n\nSources:\n{ctx}"
    prompt, _ = trim_to_budget(prompt, settings.llm_context_char_limit)
    msg = llm.invoke([SystemMessage(content=L1_BRIEFING_SYSTEM), HumanMessage(content=prompt)])
    draft = msg.content if isinstance(msg.content, str) else str(msg.content)
    return {**state, "draft_md": scrub_pii(draft)}


def _editor(state: L1State, settings: Settings) -> L1State:
    llm = init_chat_model(settings)
    ai_block = None
    ai_md = ""
    if state.get("include_ai_visibility", True):
        social = state.get("social") or {}
        by_platform: dict[str, list[dict[str, Any]]] = {}
        if social.get("platforms_hit"):
            for p in social["platforms_hit"]:
                part = social_media_search(f"{state['company']}", platform=p, settings=settings)
                by_platform[p] = part.get("results") or []
        ai_block = build_ai_visibility(
            company=state["company"],
            search_results=state.get("curated") or [],
            social_by_platform=by_platform,
            site_extract=state.get("extract_summary"),
        )
        ai_md = render_ai_visibility_markdown(ai_block)

    edit_prompt = f"Draft:\n{state.get('draft_md','')}\n\nAdd AI visibility section using:\n{ai_md}"
    edit_prompt, _ = trim_to_budget(edit_prompt, settings.llm_context_char_limit)
    msg = llm.invoke([SystemMessage(content=L1_EDITOR_SYSTEM), HumanMessage(content=edit_prompt)])
    report = msg.content if isinstance(msg.content, str) else str(msg.content)
    if ai_md and "AI visibility" not in report:
        report = report + "\n\n" + ai_md
    report = scrub_pii(report)
    if state.get("enable_humanize", True):
        report = humanize_markdown(report)

    sources = build_sources_index(state.get("curated") or [])
    extract = state.get("extract_summary") or {}
    for s in extract.get("sources") or []:
        url = s.get("url")
        if url and not any(x.get("url") == url for x in sources):
            sources.append({"url": url, "title": url, "index": len(sources) + 1})

    brief: dict[str, Any] = {
        "company": state["company"],
        "domain": state.get("domain"),
        "industry": state.get("industry"),
        "summary_markdown": report,
        "sources": sources,
        "market_signals": (state.get("social") or {}).get("results") or [],
        "extract_summary": extract.get("summary") or "",
    }
    if ai_block:
        brief["ai_visibility"] = ai_block
    return {**state, "report_md": report, "account_brief": brief}


def build_l1_graph(settings: Settings | None = None):
    settings = settings or get_settings()

    graph = StateGraph(L1State)
    graph.add_node("plan", _plan_queries)
    graph.add_node("research", lambda s: _research(s, settings))
    graph.add_node("curate", _curate)
    graph.add_node("extract", lambda s: _extract_deep(s, settings))
    graph.add_node("social", lambda s: _social_optional(s, settings))
    graph.add_node("brief", lambda s: _brief(s, settings))
    graph.add_node("editor", lambda s: _editor(s, settings))

    graph.set_entry_point("plan")
    graph.add_edge("plan", "research")
    graph.add_edge("research", "curate")
    graph.add_edge("curate", "extract")
    graph.add_edge("extract", "social")
    graph.add_edge("social", "brief")
    graph.add_edge("brief", "editor")
    graph.add_edge("editor", END)
    return graph.compile()


def run_company_brief(
    company: str,
    *,
    domain: str | None = None,
    industry: str | None = None,
    include_ai_visibility: bool = True,
    enable_humanize: bool = True,
    settings: Settings | None = None,
) -> dict[str, Any]:
    settings = settings or get_settings()
    settings.require_tavily()
    app = build_l1_graph(settings)
    final = app.invoke(
        {
            "company": company,
            "domain": domain,
            "industry": industry,
            "include_ai_visibility": include_ai_visibility,
            "enable_humanize": enable_humanize,
        }
    )
    return final
