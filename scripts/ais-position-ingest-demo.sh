#!/usr/bin/env bash
# Demo: ingest AIS-style vessel positions into ClickHouse and update Asset geo in Postgres.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export REPO_ROOT="${REPO_ROOT:-$ROOT}"
export CLICKHOUSE_DSN="${CLICKHOUSE_DSN:-clickhouse://daemon:daemon@127.0.0.1:9000/daemon}"
export DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@127.0.0.1:54332/postgres?sslmode=disable}"
export TENANT_ID="${TENANT_ID:-tenant-demo}"

curl -sf -X POST "http://127.0.0.1:8082/v1/jobs" \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: ${TENANT_ID}" \
  -d '{"connector":"ais-demo"}' | jq .

echo "AIS demo job submitted."
