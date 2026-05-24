"""GEO / AIO / E-E-A-T observational block builder."""

from __future__ import annotations

from collections import Counter
from typing import Any
from urllib.parse import urlparse


def _domain(url: str) -> str:
    try:
        return urlparse(url).netloc.lower()
    except Exception:
        return ""


def build_ai_visibility(
    *,
    company: str,
    search_results: list[dict[str, Any]],
    social_by_platform: dict[str, list[dict[str, Any]]] | None = None,
    site_extract: dict[str, Any] | None = None,
) -> dict[str, Any]:
    social_by_platform = social_by_platform or {}
    domains = Counter(_domain(r.get("url") or "") for r in search_results if r.get("url"))
    top_domains = [
        {"domain": d, "url_count": c, "sample_urls": [r.get("url") for r in search_results if _domain(r.get("url") or "") == d][:3]}
        for d, c in domains.most_common(8)
        if d
    ]

    structured_pages: list[str] = []
    narrative = "unknown"
    clarity = "unknown"
    if site_extract and site_extract.get("summary"):
        summary_l = site_extract["summary"].lower()
        for tag in ("pricing", "docs", "faq", "about"):
            if tag in summary_l:
                structured_pages.append(tag)
        clarity = "medium" if structured_pages else "low"
        narrative = site_extract["summary"][:500]

    eeat_platform: dict[str, str] = {}
    authority: list[str] = []
    for platform, hits in social_by_platform.items():
        if hits:
            eeat_platform[platform] = f"{len(hits)} indexed mention(s)"
    for r in search_results[:15]:
        url = (r.get("url") or "").lower()
        title = (r.get("title") or "").lower()
        if any(x in url or x in title for x in ("press", "news", "reuters", "techcrunch")):
            authority.append("press")
        if "review" in url or "g2.com" in url or "gartner" in url:
            authority.append("customer_review")
        if "linkedin.com" in url and "pulse" in url:
            authority.append("executive_thought_leadership")

    citations = [f"src-{i}" for i in range(1, min(6, len(search_results) + 1))]

    return {
        "geo": {
            "top_cited_domains": top_domains,
            "generative_query_signals": [
                f"Sources referencing {company} in industry analysis",
                f"Publications citing {company} domain footprint",
            ],
            "notes": "Observational GEO footprint from Tavily search/extract — not ranking guarantees.",
        },
        "aio": {
            "site_clarity_score": clarity,
            "structured_pages_found": structured_pages,
            "narrative_consistency": narrative,
            "gaps": [] if structured_pages else ["pricing/docs/faq pages not clearly detected"],
        },
        "eeat": {
            "brand_mention_summary": {
                "linkedin": eeat_platform.get("linkedin", "none observed"),
                "reddit": eeat_platform.get("reddit", "none observed"),
                "x": eeat_platform.get("x", "none observed"),
                "news": "see press hits in sources" if "press" in authority else "none observed",
            },
            "authority_signals": sorted(set(authority)),
            "trust_risks": [],
            "citations": citations,
        },
    }


def render_ai_visibility_markdown(block: dict[str, Any]) -> str:
    geo = block.get("geo") or {}
    aio = block.get("aio") or {}
    eeat = block.get("eeat") or {}
    lines = [
        "## AI visibility snapshot",
        "",
        "### GEO",
        geo.get("notes", ""),
    ]
    for d in geo.get("top_cited_domains") or []:
        lines.append(f"- {d.get('domain')}: {d.get('url_count')} source(s)")
    lines.extend(["", "### AIO", f"Clarity: {aio.get('site_clarity_score', 'unknown')}"])
    pages = aio.get("structured_pages_found") or []
    if pages:
        lines.append("Structured pages: " + ", ".join(pages))
    lines.extend(["", "### E-E-A-T"])
    mentions = eeat.get("brand_mention_summary") or {}
    for k, v in mentions.items():
        lines.append(f"- {k}: {v}")
    sigs = eeat.get("authority_signals") or []
    if sigs:
        lines.append("Authority signals: " + ", ".join(sigs))
    return "\n".join(lines) + "\n"
