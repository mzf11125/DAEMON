-- Market intelligence pgvector (mirrors infra/migrations/postgres/007_market_intel_pgvector.sql)

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS market_intel_chunks (
    chunk_id TEXT PRIMARY KEY,
    thread_id TEXT NOT NULL,
    tenant_id TEXT NOT NULL DEFAULT 'tenant-demo',
    url TEXT,
    content TEXT NOT NULL,
    embedding vector(3072) NOT NULL,
    source_type TEXT NOT NULL DEFAULT 'crawl',
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_market_intel_chunks_thread
    ON market_intel_chunks (tenant_id, thread_id);

-- pgvector HNSW/IVFFlat indexes support at most 2000 dimensions; 3072-d embeddings use sequential scan at L3 scale.

GRANT SELECT, INSERT, UPDATE, DELETE ON market_intel_chunks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON market_intel_chunks TO daemon_runtime;
