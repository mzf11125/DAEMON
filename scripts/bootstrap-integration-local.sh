#!/usr/bin/env bash
# Start compose ClickHouse/Neo4j + Supabase and apply migrations for INTEGRATION_USE_LOCAL=1.
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

if ! docker info >/dev/null 2>&1; then
  echo "bootstrap-integration-local: Docker unavailable — start Docker Desktop, then re-run." >&2
  exit 1
fi

make up
make supabase-up
make migrate
./scripts/check-integration-local-stack.sh
echo "bootstrap-integration-local: ok — run proofs with INTEGRATION_USE_LOCAL=1"
