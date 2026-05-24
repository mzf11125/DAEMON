#!/usr/bin/env bash
# Runtime proof for plugin remap: ClickHouse observations + rules-engine evaluate (P3 maturation).
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

if [[ "${INTEGRATION_USE_LOCAL:-}" == "1" ]] || [[ "${INTEGRATION_USE_LOCAL:-}" == "true" ]]; then
  ./scripts/check-integration-local-stack.sh
elif docker info >/dev/null 2>&1; then
  unset INTEGRATION_USE_LOCAL
else
  echo "prove-plugin-remap: Docker unavailable." >&2
  echo "  ./scripts/bootstrap-integration-local.sh && INTEGRATION_USE_LOCAL=1 $0" >&2
  exit 1
fi

make ontology-sync

echo "prove-plugin-remap: rules-engine express evaluate path"
go test -tags=integration -count=1 ./tests/integration/ -run TestExpressCargoRulesEvaluate

echo "prove-plugin-remap: ok (analytics→CH seed + monitoring→rules-engine evaluate)"
