#!/usr/bin/env bash
# Prove Signal → Case → Decision → audit read path (local).
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"
export E2E_FULL=1
echo "prove-operational-loop: running e2e-smoke with E2E_FULL=1"
./scripts/e2e-smoke.sh
echo "prove-operational-loop: running integration operational loop test"
export ONTOLOGY_SERVICE_URL="${ONTOLOGY_SERVICE_URL:-http://127.0.0.1:8081}"
export PLATFORM_API_URL="${PLATFORM_API_URL:-http://127.0.0.1:8080}"
export CASE_SERVICE_URL="${CASE_SERVICE_URL:-http://127.0.0.1:8084}"
go test -tags=integration -count=1 ./tests/integration/ -run TestOperationalLoopHTTP
echo "prove-operational-loop: ok"
