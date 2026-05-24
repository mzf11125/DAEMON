#!/usr/bin/env bash
# Prove express-cargo simulation: seed, SLA signal→case, geo pins, dual hierarchy objects.
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

if [[ "${INTEGRATION_USE_LOCAL:-}" == "1" ]] || [[ "${INTEGRATION_USE_LOCAL:-}" == "true" ]]; then
  ./scripts/check-integration-local-stack.sh
elif docker info >/dev/null 2>&1; then
  unset INTEGRATION_USE_LOCAL
else
  echo "prove-express-cargo-sim: Docker unavailable." >&2
  echo "  ./scripts/bootstrap-integration-local.sh && INTEGRATION_USE_LOCAL=1 $0" >&2
  exit 1
fi

./scripts/check-express-cargo-catalog.sh

echo "prove-express-cargo-sim: running express cargo integration tests"
go test -tags=integration -count=1 ./tests/integration/ -run 'TestExpressCargoSim|TestExpressCargoHITL|TestExpressCargoRulesEvaluate|TestSandboxSectorsSeeded/logistics-express-cargo'
echo "prove-express-cargo-sim: ok"
