#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ONTOLOGY_URL="${ONTOLOGY_SERVICE_URL:-http://localhost:8081}"

echo "== AIP eval proof =="
make aip-build

echo "== eval stack =="
./scripts/ensure-aip-eval-stack.sh

echo "== ontology health =="
curl -sf "${ONTOLOGY_URL}/health" >/dev/null
curl -sf "${ONTOLOGY_URL}/internal/health" >/dev/null 2>/dev/null || curl -sf "${ONTOLOGY_URL}/health" >/dev/null

echo "== golden eval =="
export ONTOLOGY_SERVICE_URL="$ONTOLOGY_URL"
export TENANT_ID="${TENANT_ID:-tenant-demo}"
export EVAL_DETERMINISTIC="${EVAL_DETERMINISTIC:-true}"
make aip-eval

if [[ "${RUN_ORCHESTRATOR_SMOKE:-false}" == "true" ]]; then
  echo "== orchestrator smoke =="
  pnpm --filter @daemon/aip-agent exec node dist/orchestrator.js --case triage-list-signals
fi

echo "prove-aip-eval: OK"
