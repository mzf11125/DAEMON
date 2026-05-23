#!/usr/bin/env bash
# Apply ClickHouse SQL migrations (001 + 002) via local clickhouse-client or docker compose.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
compose_file="${COMPOSE_FILE:-$root/infra/docker/docker-compose.yml}"

apply_file() {
  local f="$1"
  if command -v clickhouse-client >/dev/null 2>&1; then
    clickhouse-client --host localhost --user daemon --password daemon --multiquery <"$f"
    return
  fi
  if docker compose -f "$compose_file" ps clickhouse 2>/dev/null | grep -qE 'running|Up'; then
    docker compose -f "$compose_file" exec -T clickhouse \
      clickhouse-client --user daemon --password daemon --multiquery <"$f"
    return
  fi
  echo "apply-clickhouse-migrations: no clickhouse-client and clickhouse container not running" >&2
  exit 1
}

apply_file "$root/infra/migrations/clickhouse/001_init.sql"
apply_file "$root/infra/migrations/clickhouse/002_tenant_observations.sql"
echo "apply-clickhouse-migrations: OK"
