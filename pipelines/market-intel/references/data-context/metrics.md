# Market intel metrics

| Metric | Target / source |
|--------|-----------------|
| Sources per brief | `len(sources.json)` ≥ 3 (L1 prove) |
| Citation coverage | % bullets with `[n]` in `report.md` |
| Crawl/extract success | success URLs / (success + failed) in manifests |
| KB freshness | `max(updated_at)` per `thread_id` |
| Tavily credit proxy | `run_manifest.tavily_calls` |
| AI tell density | `humanize_metrics.ai_tell_density` ≤ 12 (prove) |
| Hybrid enrichment | `kb_enrichment.ingested` > 0 when web gap-fill runs |

Sample SQL:

```sql
SELECT thread_id, source_type, count(*), max(updated_at)
FROM market_intel_chunks
WHERE tenant_id = 'tenant-demo'
GROUP BY 1, 2;
```
