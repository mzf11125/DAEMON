"""L2b company intelligence — crawl + extract + search (cookbook pattern)."""

from __future__ import annotations

from typing import Any

from market_intel.config import Settings, get_settings
from market_intel.extended.ai_visibility import build_ai_visibility
from market_intel.toolkit.crawl import crawl_site, map_site
from market_intel.toolkit.extract import extract_and_summarize
from market_intel.toolkit.retrieval import search_dedup


def run_company_intelligence(
    company: str,
    *,
    domain: str | None = None,
    settings: Settings | None = None,
) -> dict[str, Any]:
    """Port of Tavily company-intelligence: map/crawl site + extract + web search."""
    settings = settings or get_settings()
    settings.require_tavily()

    search = search_dedup(f"{company} competitors products positioning", settings=settings)
    site_summary: dict[str, Any] = {}
    crawl_manifest: dict[str, Any] = {}
    map_manifest: dict[str, Any] = {}

    if domain:
        root = domain if domain.startswith("http") else f"https://{domain}"
        map_manifest = map_site(root, limit=15, settings=settings)
        crawl_manifest = crawl_site(root, limit=5, instructions="product pricing about docs", settings=settings)
        urls = []
        for page in crawl_manifest.get("results") or []:
            if page.get("url"):
                urls.append(page["url"])
        if not urls:
            urls = [root]
        site_summary = extract_and_summarize(urls[:5], focus=f"{company} product and pricing clarity", settings=settings)

    ai_vis = build_ai_visibility(
        company=company,
        search_results=search.get("results") or [],
        site_extract=site_summary,
    )

    profile = {
        "company": company,
        "domain": domain,
        "web_search": search,
        "site_extract": site_summary,
        "crawl_manifest": crawl_manifest,
        "map_manifest": map_manifest,
        "ai_visibility": ai_vis,
    }
    return profile
