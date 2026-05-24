# Table: market_intel_chunks

Postgres + pgvector storage for L3a RAG.

## Columns

| Column | Type | Notes |
|--------|------|-------|
| `chunk_id` | TEXT PK | Stable chunk identifier |
| `thread_id` | TEXT | Account/competitor KB key |
| `tenant_id` | TEXT | Default `tenant-demo` |
| `url` | TEXT | Source page |
| `content` | TEXT | Chunk text |
| `embedding` | vector(3072) | `text-embedding-3-large` |
| `source_type` | TEXT | `crawl`, `web_enrichment`, `csv_import` |
| `metadata` | JSONB | Title, crawl params, flags |
| `created_at` / `updated_at` | TIMESTAMPTZ | Freshness analytics |

## Indexes

- `(tenant_id, thread_id)` btree
- HNSW on `embedding` — `m=16`, `ef_construction=128`; tune `ef_search` if P95 retrieval >500ms

## Query patterns

Similarity search (cosine):

```sql
SELECT chunk_id, url, content, 1 - (embedding <=> $query_vec) AS score
FROM market_intel_chunks
WHERE tenant_id = $1 AND thread_id = $2
ORDER BY embedding <=> $query_vec
LIMIT 5;
```

Always bind `tenant_id` and `thread_id`. Never query across threads without explicit admin scope.
