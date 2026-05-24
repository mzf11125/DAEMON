# Market intelligence runbook v1

Operational guide for `pipelines/market-intel` and prove targets.

## Severity

| Sev | Example | Response |
|-----|---------|----------|
| P2 | All L1 prove red; Tavily/Research API 5xx blocking market-map | 1h; escalate platform |
| P3 | Single competitor crawl partial failure | Log + continue; re-run vectorize |
| P4 | Humanize pass skipped | Next business day |

## Common failures

### Tavily 429 / rate limit

- Reduce `max_results` / `limit` on crawl and search.
- Back off exponentially (client retries in toolkit).
- Throttle batch ICP runs (sleep between companies).

### Zero pages after crawl

- Inspect `vectorize_manifest.json` → `failed_results`.
- Try map-first discovery; lower `max_depth`; verify URL reachability.

### Extract batch all failed

- Switch `extract_depth=advanced` for pricing/product pages.
- Check firewall/geo blocking from CI runner.

### Research stuck `in_progress`

- Poll timeout (default 600s); cancel and retry with `--model mini`.

### pgvector empty for `thread_id`

- Confirm migration `007_market_intel_pgvector.sql` applied.
- Re-run `market-intel vectorize --url ... --thread-id ...`.
- Verify `DATABASE_URL` points at Postgres with `vector` extension (Supabase local includes it).

### Cross-tenant leakage suspicion

- All queries must filter `tenant_id` + `thread_id`.
- Run `make prove-market-intel-security` after schema changes.

## Debug

Set `MARKET_INTEL_DEBUG=1` for token block logging during L1/L3 synthesis.

| Symptom | Likely fix |
|---------|------------|
| Model ignores citations | Move citation policy to system prompt |
| Context overflow | Compress history; drop lowest-similarity chunks first |
| Hybrid answer ignores internal KB | Seed chunk or re-vectorize site |

## Kill switch

```bash
export MARKET_INTEL_DISABLED=1
```

CLI should exit early with a clear message (config guard).

## Rollback (AIP phase 2)

- Pin prior `MARKET_INTEL_MODEL` and prompt hash in `run_manifest.json`.
- Revert prompt files under `pipelines/market-intel/src/market_intel/prompts.py`.
- Re-run golden eval + `make prove-market-intel-security` before promotion.

## Shift handoff template

- Active prove failures (last 24h):
- Open P2 incidents:
- Tavily credit usage vs budget:
- KB stale `thread_id` list (>7d without re-crawl):

## Full prove matrix (Wave 4b)

Run from repo root after `pipelines/market-intel` deps install and `007_market_intel_pgvector.sql` applied:

| Target | Command | Requires |
|--------|---------|----------|
| L1 core | `make prove-market-intel` | `TAVILY_API_KEY` |
| Social | `make prove-market-intel-social` | Tavily |
| RAG | `make prove-market-intel-rag` | Postgres + pgvector |
| Hybrid | `make prove-market-intel-hybrid` | Tavily + pgvector |
| Research | `make prove-market-intel-research` | Tavily Research API |
| Shodan | `make prove-market-intel-shodan` | Optional `SHODAN_API_KEY` |
| Security | `make prove-market-intel-security` | Local Postgres |

Staging: set `DATABASE_URL` to staging Postgres with migration `007` before RAG/hybrid/security proves. Document `MARKET_INTEL_*` vars per [`.env.example`](../../.env.example).
