# Market intelligence v1

Tavily-backed company and market research for sales prep, competitor intel, and grounded Q&A. Implemented in `pipelines/market-intel/` as a Python CLI (`market-intel`).

## Layers

| Layer | Scope | Primary commands |
|-------|--------|------------------|
| **L1** | Company brief (search + extract + LangGraph synthesis) | `company-brief` |
| **L2a** | Social discourse (LinkedIn/Reddit/X via Tavily domain filters — no profile scraping) | `social`, sections in `competitor-scan` |
| **L2b** | Site crawl/extract for competitor profiles | `competitor-scan`, `extended/company_intelligence.py` |
| **L2c** | Infrastructure adoption trends (Shodan Trends, optional) | `market-trends`, auto in `market-map` when `SHODAN_API_KEY` set |
| **L3a** | Crawl → chunk → embed → pgvector Q&A | `vectorize`, `ask` |
| **L3b** | Hybrid internal + web gap-fill; deep research API | `hybrid`, `research` |

## Workflows

### A — ICP company brief (L1)

```bash
market-intel company-brief --company "Acme Corp" --domain acme.com --industry "logistics SaaS"
```

Outputs under `artifacts/market-intel/{run_id}/`: `account_brief.json`, `report.md`, `sources.json`, `run_manifest.json`.

### B — Competitor scan + social (L2)

```bash
market-intel competitor-scan --company "Acme Corp" --competitors "Rival A,Rival B"
market-intel social --company "Acme Corp" --topic "pricing perception" --platform linkedin
```

### C — Account KB (L3a)

```bash
market-intel vectorize --url https://acme.com --thread-id acme-corp
market-intel ask --thread-id acme-corp --question "What pricing tiers do they publish?"
```

Requires Postgres with pgvector (`007_market_intel_pgvector.sql`).

### D — Hybrid research (L3b)

```bash
market-intel hybrid --thread-id acme-corp --question "How does their security posture compare to peers?"
```

Combines retrieved chunks for `thread_id` with Tavily web results.

### E — Deep market scan (Research API)

```bash
market-intel research --query "Cold chain visibility market landscape" --model mini
market-intel research --query "..." --model mini --stream   # AIP live path
```

### F — AI visibility (GEO / AIO / E-E-A-T)

Enabled by default on L1/L2 runs. Populates `ai_visibility` in JSON schemas and an **AI visibility snapshot** section in `report.md`. Opt out:

```bash
market-intel company-brief --company "Acme" --no-ai-visibility
```

Observational intel only — not a GEO optimization product.

### G — Shodan infrastructure trends (L2c)

```bash
market-intel market-trends --query 'product:"nginx"'
```

Runs automatically inside `market-map` when `SHODAN_API_KEY` is present; skipped otherwise.

## Compliance and data handling

- **LinkedIn:** Tavily indexed discourse only (`platform=linkedin`). No mass profile scraping or login-walled extraction.
- **Licensed CSV merge:** Import path tags rows `source_type=csv_import`; treat as confidential; do not export in public prove bundles.
- **NDA:** Avoid counterparty trademarks in public repo artifacts; use generic descriptions in shared docs/commits.
- **Secrets:** Keys via env only (`TAVILY_API_KEY`, `OPENAI_API_KEY`, optional `SHODAN_API_KEY`). Prove targets fail on placeholder keys or `sk-` patterns in artifacts.
- **PII:** Markdown scrubbed before write (`postprocess/normalize.py`).

## Makefile prove targets

| Target | Gate |
|--------|------|
| `make prove-market-intel` | L1: ≥3 sources, `ai_visibility`, schema valid |
| `make prove-market-intel-social` | L2a: social report with hits |
| `make prove-market-intel-rag` | L3a: vectorize + ask |
| `make prove-market-intel-hybrid` | L3b: internal seed + web enrichment |
| `make prove-market-intel-research` | Research API completed |
| `make prove-market-intel-shodan` | Shodan series or skip without key |
| `make prove-market-intel-security` | Injection probe + secret grep |

Install: `make market-intel-install`.

## Operations

- On-call and incident response: [market-intel-runbook-v1.md](./market-intel-runbook-v1.md)
- Data analyst context (entities, metrics, SQL): [`pipelines/market-intel/references/data-context/`](../../pipelines/market-intel/references/data-context/)

## AIP integration (phase 2)

CLI L1 is the immediate sales path. Phase 2 adds an AIP router (quick vs standard vs deep) and MCP tools (`tavily_company_brief`, `tavily_hybrid_research`, etc.) via agent-service sidecar. Eval gates: citation rubric and injection probes in `aip/evals/market-intel/` (see `make prove-market-intel-security`).

## Multi-agent topology (summary)

- **L1:** Parallel analyzer legs → Curator dedupe → Briefing → Editor (fan-in/fan-out).
- **L2a:** ReAct social loop with iteration cap.
- **L3a:** ReAct + vector retrieval tool, strict `thread_id` filter.
- **L3b:** Internal retrieve → web gap-fill → synthesizer.

Each run records `workflow_run_id` / `run_id` in `run_manifest.json` with layers, models, and API call metadata.
