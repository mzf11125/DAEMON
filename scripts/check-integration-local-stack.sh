#!/usr/bin/env bash
# Preflight for INTEGRATION_USE_LOCAL=1 — Postgres (:54332) and ClickHouse (:9000) must be up.
set -euo pipefail

pg_host="${INTEGRATION_PG_HOST:-127.0.0.1}"
pg_port="${INTEGRATION_PG_PORT:-54332}"
ch_host="${INTEGRATION_CH_HOST:-127.0.0.1}"
ch_port="${INTEGRATION_CH_PORT:-9000}"

tcp_open() {
  local host="$1" port="$2"
  if command -v nc >/dev/null 2>&1; then
    nc -z "$host" "$port" >/dev/null 2>&1
    return
  fi
  (echo >/dev/tcp/"$host"/"$port") >/dev/null 2>&1
}

missing=()
if ! tcp_open "$pg_host" "$pg_port"; then
  missing+=("Postgres ${pg_host}:${pg_port} (Supabase — run: make supabase-up)")
fi
if ! tcp_open "$ch_host" "$ch_port"; then
  missing+=("ClickHouse ${ch_host}:${ch_port} (run: make up)")
fi

if ((${#missing[@]} > 0)); then
  echo "integration local stack: not ready" >&2
  if ! docker info >/dev/null 2>&1; then
    echo "  Docker Desktop is not running — start it first (compose + Supabase both use Docker)." >&2
  fi
  for line in "${missing[@]}"; do
    echo "  missing: $line" >&2
  done
  echo "  bootstrap:" >&2
  echo "    make up supabase-up migrate" >&2
  echo "    INTEGRATION_USE_LOCAL=1 ./scripts/prove-p3-geo.sh" >&2
  exit 1
fi

echo "integration local stack: ok (${pg_host}:${pg_port}, ${ch_host}:${ch_port})"
