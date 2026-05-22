#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -x scripts/data-health-check.sh ]]; then
  scripts/data-health-check.sh || true
fi

if curl -sf "http://127.0.0.1:54331/auth/v1/health" >/dev/null 2>&1; then
  echo "platform-check: Supabase Auth OK (:54331)"
else
  echo "platform-check: Supabase Auth not reachable (run: make supabase-up)" >&2
fi

if [[ -x scripts/verify-auth-migration.sh ]] && curl -sf "http://127.0.0.1:54331/auth/v1/health" >/dev/null 2>&1; then
  scripts/verify-auth-migration.sh || true
fi

missing=0
for port in 8080 8081 8082 8083 8084; do
  if ! curl -sf "http://localhost:${port}/health" >/dev/null 2>&1; then
    echo "platform-check: :${port} not healthy (start make run-*)" >&2
    missing=1
  fi
done

./scripts/validate-ontology.sh

if [[ "${missing}" -ne 0 ]]; then
  exit 1
fi

echo "platform-check: passed"
