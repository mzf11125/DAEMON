"""Workflow orchestrators for competitor scan and market map."""

from __future__ import annotations

from typing import Any

from market_intel.config import Settings, get_settings
from market_intel.extended.company_intelligence import run_company_intelligence
from market_intel.extended.shodan_trends import search_trends
from market_intel.pipeline.l1_graph import run_company_brief


def render_competitor_matrix_md(matrix: list[dict[str, Any]]) -> str:
    lines = ["# Competitor matrix", "", "| Company | GEO domains cited | Authority signals |", "| --- | --- | --- |"]
    for row in matrix:
        signals = ", ".join(row.get("authority_signals") or []) or "—"
        lines.append(
            f"| {row.get('company','')} | {row.get('geo_domain_count', 0)} | {signals} |"
        )
    return "\n".join(lines) + "\n"


def run_competitor_scan(
    company: str,
    competitors: list[str],
    *,
    domain: str | None = None,
    include_ai_visibility: bool = True,
    enable_humanize: bool = True,
    settings: Settings | None = None,
) -> dict[str, Any]:
    settings = settings or get_settings()
    competitors = competitors[: settings.max_competitor_profiles]

    primary = run_company_brief(
        company,
        domain=domain,
        include_ai_visibility=include_ai_visibility,
        enable_humanize=enable_humanize,
        settings=settings,
    )
    profiles: list[dict[str, Any]] = []
    for comp in competitors:
        brief = run_company_brief(
            comp,
            include_ai_visibility=include_ai_visibility,
            enable_humanize=enable_humanize,
            settings=settings,
        )
        intel = run_company_intelligence(comp, settings=settings)
        profiles.append(
            {
                "company": comp,
                "account_brief": brief.get("account_brief"),
                "competitor_profile": intel,
            }
        )

    matrix = []
    for p in profiles:
        av = (p.get("competitor_profile") or {}).get("ai_visibility") or {}
        geo_domains = av.get("geo", {}).get("top_cited_domains") or []
        matrix.append(
            {
                "company": p["company"],
                "geo_domain_count": len(geo_domains),
                "authority_signals": av.get("eeat", {}).get("authority_signals") or [],
            }
        )

    return {
        "primary_company": company,
        "primary_brief": primary.get("account_brief"),
        "primary_report_md": primary.get("report_md"),
        "competitors": profiles,
        "competitor_matrix": matrix,
        "competitor_matrix_md": render_competitor_matrix_md(matrix),
    }


def run_market_map(
    industry: str,
    *,
    region: str | None = None,
    seed_companies: list[str] | None = None,
    include_ai_visibility: bool = True,
    enable_humanize: bool = True,
    settings: Settings | None = None,
) -> dict[str, Any]:
    settings = settings or get_settings()
    query = f"{industry} market leaders vendors"
    if region:
        query += f" {region}"

    companies = (seed_companies or [])[: settings.max_competitor_profiles]
    entities: list[dict[str, Any]] = []
    for name in companies:
        brief = run_company_brief(
            name,
            industry=industry,
            include_ai_visibility=include_ai_visibility,
            enable_humanize=enable_humanize,
            settings=settings,
        )
        entities.append({"name": name, "brief": brief.get("account_brief")})

    infra = search_trends(f"product:nginx country:{region or 'US'}", settings=settings)
    return {
        "industry": industry,
        "region": region,
        "entities": entities,
        "infrastructure_trends": infra,
        "market_map_query": query,
    }
