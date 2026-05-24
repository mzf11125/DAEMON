"""Market intelligence CLI."""

from __future__ import annotations

import argparse
import json
import sys

from market_intel.config import get_settings
from market_intel.extended.shodan_trends import search_trends
from market_intel.extended.social_research import run_social_research
from market_intel.pipeline.l1_graph import run_company_brief
from market_intel.pipeline.schemas_output import validate_artifact
from market_intel.pipeline.workflows import run_competitor_scan, run_market_map
from market_intel.postprocess.humanize import ai_tell_density
from market_intel.postprocess.normalize import assert_no_secrets_in_artifact, slugify_thread_id
from market_intel.rag.hybrid import hybrid_research
from market_intel.rag.internal_rag import ask_internal
from market_intel.rag.vectorize import seed_internal_chunk, vectorize_url
from market_intel.run_context import RunContext
from market_intel.toolkit.research import research_and_wait, stream_research_events


def _settings_from_args(args: argparse.Namespace):
    settings = get_settings()
    if getattr(args, "no_ai_visibility", False):
        settings.enable_ai_visibility = False
    if getattr(args, "no_humanize", False):
        settings.enable_humanize = False
    return settings


def cmd_company_brief(args: argparse.Namespace) -> int:
    settings = _settings_from_args(args)
    ctx = RunContext("company-brief", settings=settings, thread_id=slugify_thread_id(args.company))
    ctx.manifest.layers = ["L1"]
    try:
        final = run_company_brief(
            args.company,
            domain=args.domain,
            industry=args.industry,
            include_ai_visibility=settings.enable_ai_visibility,
            enable_humanize=settings.enable_humanize,
            settings=settings,
        )
        brief = final.get("account_brief") or {}
        report = final.get("report_md") or ""
        assert_no_secrets_in_artifact(report)
        validate_artifact(brief, "account_brief.schema.json")
        ctx.write_json("account_brief.json", brief)
        ctx.write_text("report.md", report)
        ctx.write_json("sources.json", brief.get("sources") or [])
        extract = final.get("extract_summary") or {}
        if extract.get("extract_batch"):
            ctx.write_json("extract_batch.json", extract.get("extract_batch"))
        density = ai_tell_density(report)
        ctx.write_json("humanize_metrics.json", {"ai_tell_density": density})
        if density > settings.humanize_max_density:
            ctx.finish("completed_with_warnings", f"ai_tell_density={density:.2f}")
        else:
            ctx.finish("completed")
        print(ctx.root)
        return 0
    except Exception as exc:
        ctx.finish("failed", str(exc))
        raise


def cmd_competitor_scan(args: argparse.Namespace) -> int:
    settings = _settings_from_args(args)
    competitors = [c.strip() for c in args.competitors.split(",") if c.strip()]
    ctx = RunContext("competitor-scan", settings=settings, thread_id=slugify_thread_id(args.company))
    ctx.manifest.layers = ["L1", "L2b"]
    try:
        result = run_competitor_scan(
            args.company,
            competitors,
            domain=args.domain,
            include_ai_visibility=settings.enable_ai_visibility,
            enable_humanize=settings.enable_humanize,
            settings=settings,
        )
        ctx.write_json("competitor_scan.json", result)
        if result.get("primary_report_md"):
            ctx.write_text("report.md", result["primary_report_md"])
        if result.get("competitor_matrix_md"):
            ctx.write_text("competitor_matrix.md", result["competitor_matrix_md"])
        for p in result.get("competitors") or []:
            name = (p.get("company") or "competitor").replace(" ", "-").lower()
            if p.get("competitor_profile"):
                ctx.write_json(f"competitor_profile_{name}.json", p["competitor_profile"])
        validate_artifact(result.get("primary_brief") or {"company": args.company, "sources": []}, "account_brief.schema.json")
        ctx.finish("completed")
        print(ctx.root)
        return 0
    except Exception as exc:
        ctx.finish("failed", str(exc))
        raise


def cmd_market_map(args: argparse.Namespace) -> int:
    settings = _settings_from_args(args)
    seeds = [s.strip() for s in (args.companies or "").split(",") if s.strip()]
    ctx = RunContext("market-map", settings=settings)
    ctx.manifest.layers = ["L1", "L2c"]
    try:
        result = run_market_map(
            args.industry,
            region=args.region,
            seed_companies=seeds,
            include_ai_visibility=settings.enable_ai_visibility,
            enable_humanize=settings.enable_humanize,
            settings=settings,
        )
        validate_artifact({"industry": args.industry, **{k: result.get(k) for k in ("region", "entities", "infrastructure_trends", "market_map_query")}}, "market_map.schema.json")
        ctx.write_json("market_map.json", result)
        if result.get("infrastructure_trends"):
            ctx.write_json("shodan_trends.json", result["infrastructure_trends"])
        ctx.finish("completed")
        print(ctx.root)
        return 0
    except Exception as exc:
        ctx.finish("failed", str(exc))
        raise


def cmd_market_trends(args: argparse.Namespace) -> int:
    settings = get_settings()
    ctx = RunContext("market-trends", settings=settings)
    ctx.manifest.layers = ["L2c"]
    data = search_trends(args.query, facets=args.facets, settings=settings)
    ctx.write_json("shodan_trends.json", data)
    ctx.finish("completed" if not data.get("skipped") else "skipped")
    print(json.dumps(data, indent=2))
    return 0


def cmd_social(args: argparse.Namespace) -> int:
    settings = get_settings()
    ctx = RunContext("social", settings=settings, thread_id=slugify_thread_id(args.company or args.topic))
    ctx.manifest.layers = ["L2a"]
    result = run_social_research(
        args.topic,
        company=args.company,
        platform=args.platform,
        settings=settings,
    )
    ctx.write_json("social_report.json", result)
    ctx.write_text("social_report.md", result.get("social_report_md") or "")
    ctx.finish("completed")
    print(ctx.root)
    return 0


def cmd_vectorize(args: argparse.Namespace) -> int:
    settings = get_settings()
    thread_id = args.thread_id or slugify_thread_id(args.url)
    ctx = RunContext("vectorize", settings=settings, thread_id=thread_id)
    ctx.manifest.layers = ["L3a"]
    manifest = vectorize_url(
        args.url,
        thread_id=thread_id,
        limit=args.limit,
        source_type=args.source_type,
        settings=settings,
    )
    ctx.write_json("vectorize_manifest.json", manifest)
    ctx.finish("completed")
    print(ctx.root)
    return 0


def cmd_ask(args: argparse.Namespace) -> int:
    settings = get_settings()
    ctx = RunContext("ask", settings=settings, thread_id=args.thread_id)
    ctx.manifest.layers = ["L3a"]
    ans = ask_internal(args.thread_id, args.question, settings=settings)
    ctx.write_json("ask_result.json", ans)
    ctx.finish("completed")
    print(ans.get("answer", ""))
    return 0


def cmd_hybrid(args: argparse.Namespace) -> int:
    settings = get_settings()
    ctx = RunContext("hybrid", settings=settings, thread_id=args.thread_id)
    ctx.manifest.layers = ["L3b"]
    if args.seed:
        seed_internal_chunk(args.thread_id, content=args.seed, settings=settings)
    result = hybrid_research(args.thread_id, args.question, settings=settings)
    ctx.write_json("hybrid_report.json", result)
    if result.get("answer"):
        ctx.write_text("hybrid_report.md", result["answer"])
    if result.get("web_sources"):
        ctx.write_json("web_sources.json", result["web_sources"])
    if result.get("kb_enrichment"):
        ctx.write_json("kb_enrichment.json", result["kb_enrichment"])
    ctx.finish("completed")
    print(ctx.root)
    return 0


def cmd_research(args: argparse.Namespace) -> int:
    settings = get_settings()
    ctx = RunContext("research", settings=settings)
    ctx.manifest.layers = ["L3b"]
    if args.stream:
        final: dict = {}
        for event in stream_research_events(args.query, model=args.model, settings=settings):
            print(json.dumps({"status": event.get("status")}))
            if (event.get("status") or "").lower() in ("completed", "failed", "error", "timeout"):
                final = event
                ctx.write_json("research_result.json", event)
                break
        if not final:
            ctx.finish("failed", "stream ended without terminal status")
            return 1
    else:
        result = research_and_wait(args.query, model=args.model, settings=settings)
        ctx.write_json("research_result.json", result)
        final = result
    ctx.finish("completed")
    print(ctx.root)
    return 0


def cmd_humanize_check(args: argparse.Namespace) -> int:
    text = open(args.file, encoding="utf-8").read()
    density = ai_tell_density(text)
    print(f"ai_tell_density={density:.2f}")
    return 0 if density <= args.max_density else 1


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="market-intel")
    p.add_argument("--no-ai-visibility", action="store_true", help="Skip GEO/AIO/E-E-A-T enrichment")
    p.add_argument("--no-humanize", action="store_true", help="Skip humanize postprocess on markdown exports")

    sub = p.add_subparsers(dest="command", required=True)

    cb = sub.add_parser("company-brief")
    cb.add_argument("--company", required=True)
    cb.add_argument("--domain")
    cb.add_argument("--industry")
    cb.set_defaults(func=cmd_company_brief)

    cs = sub.add_parser("competitor-scan")
    cs.add_argument("--company", required=True)
    cs.add_argument("--competitors", required=True, help="Comma-separated names")
    cs.add_argument("--domain")
    cs.set_defaults(func=cmd_competitor_scan)

    mm = sub.add_parser("market-map")
    mm.add_argument("--industry", required=True)
    mm.add_argument("--region")
    mm.add_argument("--companies", help="Comma-separated seed companies")
    mm.set_defaults(func=cmd_market_map)

    mt = sub.add_parser("market-trends")
    mt.add_argument("--query", required=True)
    mt.add_argument("--facets")
    mt.set_defaults(func=cmd_market_trends)

    soc = sub.add_parser("social")
    soc.add_argument("--topic", required=True)
    soc.add_argument("--company")
    soc.add_argument("--platform", default="combined", choices=["linkedin", "reddit", "x", "combined"])
    soc.set_defaults(func=cmd_social)

    vz = sub.add_parser("vectorize")
    vz.add_argument("--url", required=True)
    vz.add_argument("--thread-id")
    vz.add_argument("--limit", type=int, default=5)
    vz.add_argument("--source-type", choices=("crawl", "extract"), default="crawl")
    vz.set_defaults(func=cmd_vectorize)

    ask = sub.add_parser("ask")
    ask.add_argument("--thread-id", required=True)
    ask.add_argument("--question", required=True)
    ask.set_defaults(func=cmd_ask)

    hy = sub.add_parser("hybrid")
    hy.add_argument("--thread-id", required=True)
    hy.add_argument("--question", required=True)
    hy.add_argument("--seed", help="Optional internal seed paragraph for prove path")
    hy.set_defaults(func=cmd_hybrid)

    rs = sub.add_parser("research")
    rs.add_argument("--query", required=True)
    rs.add_argument("--model", default="mini")
    rs.add_argument("--stream", action="store_true")
    rs.set_defaults(func=cmd_research)

    hc = sub.add_parser("humanize-check")
    hc.add_argument("--file", required=True)
    hc.add_argument("--max-density", type=float, default=12.0)
    hc.set_defaults(func=cmd_humanize_check)

    return p


def main(argv: list[str] | None = None) -> None:
    argv = argv if argv is not None else sys.argv[1:]
    parser = build_parser()
    args = parser.parse_args(argv)
    code = args.func(args)
    if code:
        sys.exit(code)


if __name__ == "__main__":
    main()
