-- Add tenant_id to observation tables (dev rebuild OK).

ALTER TABLE daemon.raw_observations
  ADD COLUMN IF NOT EXISTS tenant_id String DEFAULT 'tenant-demo';

ALTER TABLE daemon.dataset_observations
  ADD COLUMN IF NOT EXISTS tenant_id String DEFAULT 'tenant-demo';
