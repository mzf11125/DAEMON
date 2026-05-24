# Market intel data context

## Entities

| Term | Meaning |
|------|---------|
| `run_id` | One CLI invocation; owns `artifacts/market-intel/{run_id}/` |
| `workflow_run_id` | Same as `run_id` for cross-layer correlation |
| `thread_id` | Stable KB key for L3 (`market_intel_chunks`) |
| `account` / `competitor` | Business entity under research |
| `source_type` | `crawl` \| `web_enrichment` \| `csv_import` |

## Filters (always apply)

- Exclude `metadata->>'is_test' = 'true'` in production analytics
- Scope queries by `tenant_id` and `thread_id`
- Licensed CSV rows are confidential (`source_type = csv_import`)
