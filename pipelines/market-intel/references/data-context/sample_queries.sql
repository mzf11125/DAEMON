-- Freshness by thread
SELECT thread_id, max(created_at) AS last_ingested, count(*) AS chunks
FROM market_intel_chunks
WHERE tenant_id = 'tenant-demo'
  AND coalesce(metadata->>'is_test', 'false') <> 'true'
GROUP BY thread_id
ORDER BY last_ingested DESC;

-- Chunk count for prove thread
SELECT count(*) FROM market_intel_chunks
WHERE thread_id = 'example-corp' AND tenant_id = 'tenant-demo';

-- Recent crawl sources
SELECT url, source_type, created_at
FROM market_intel_chunks
WHERE thread_id = $1
ORDER BY created_at DESC
LIMIT 20;
