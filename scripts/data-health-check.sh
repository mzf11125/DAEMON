#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

fail() { echo "data-health-check: $*" >&2; exit 1; }

CH_URL="${CLICKHOUSE_HTTP:-http://localhost:8123}"
PG_URL="${DATABASE_URL:-postgresql://daemon:daemon@localhost:5432/daemon}"

if command -v curl >/dev/null 2>&1; then
  for port in 8080 8081 8082 8083 8084; do
    if curl -sf "http://localhost:${port}/health" >/dev/null 2>&1; then
      echo "ok: service :${port}"
    fi
  done
fi

if command -v clickhouse-client >/dev/null 2>&1; then
  cnt="$(clickhouse-client --host localhost --user daemon --password daemon --query "SELECT count() FROM daemon.dataset_observations" 2>/dev/null || echo 0)"
  if [[ "${cnt}" -lt 1 ]]; then
    fail "dataset_observations empty — run make pipeline-all or POST /v1/jobs"
  fi
  echo "ok: clickhouse dataset_observations count=${cnt}"
elif curl -sf "${CH_URL}/?query=SELECT%20count()%20FROM%20daemon.dataset_observations" --user daemon:daemon | grep -qv '^0$'; then
  echo "ok: clickhouse via HTTP"
else
  echo "warn: could not verify ClickHouse row count (skip if stack down)"
fi

if command -v psql >/dev/null 2>&1 && psql "$PG_URL" -tAc "SELECT 1" >/dev/null 2>&1; then
  failed="$(psql "$PG_URL" -tAc "SELECT count(*) FROM ingestion_jobs WHERE status='failed' AND created_at > now() - interval '24 hours'" 2>/dev/null || echo 0)"
  if [[ "${failed}" -gt 0 ]]; then
    fail "${failed} ingestion job(s) failed in last 24h"
  fi
  dune_failed="$(psql "$PG_URL" -tAc "SELECT count(*) FROM ingestion_jobs WHERE status='failed' AND connector IN ('sim-dune','dune-sql') AND created_at > now() - interval '24 hours'" 2>/dev/null || echo 0)"
  if [[ "${dune_failed}" -gt 0 ]]; then
    fail "${dune_failed} sim-dune/dune-sql job(s) failed in last 24h — see RB-DUNE-01 / RB-DUNE-02"
  fi
  echo "ok: postgres ingestion_jobs"
fi

echo "data-health-check: passed"
