#!/usr/bin/env bash
# Seed control-plane tenant registry row for tenant-demo (D-TENANT-01 demo mapping).
set -euo pipefail

CP_DATABASE_URL="${CP_DATABASE_URL:-postgresql://daemon:daemon@127.0.0.1:5433/control_plane?sslmode=disable}"
API_URL="${API_URL:-http://host.docker.internal:8080}"
AGENT_URL="${AGENT_URL:-http://host.docker.internal:3001}"
ONTOLOGY_URL="${ONTOLOGY_URL:-http://host.docker.internal:8081}"

psql "$CP_DATABASE_URL" -v ON_ERROR_STOP=1 <<SQL
INSERT INTO tenants (slug, display_name, plan, status, api_url, agent_url, notes)
VALUES (
  'tenant-demo',
  'Demo tenant',
  'standard',
  'active',
  '${API_URL}',
  '${AGENT_URL}',
  'legalEntityId maps to tenant_id per ADR D-TENANT-01; ontology at ${ONTOLOGY_URL}'
)
ON CONFLICT (slug) DO UPDATE SET
  api_url = EXCLUDED.api_url,
  agent_url = EXCLUDED.agent_url,
  updated_at = now();
SQL

echo "seed-control-plane-demo-tenant: OK (slug=tenant-demo)"
