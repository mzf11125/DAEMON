-- Expand-only: per-job connector parameters (addresses, chain_ids, query_id, column_map, etc.).
-- Secrets (SIM_API_KEY, DUNE_API_KEY) remain in environment only.

ALTER TABLE ingestion_jobs
  ADD COLUMN IF NOT EXISTS params JSONB NOT NULL DEFAULT '{}';
