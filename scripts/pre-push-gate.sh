#!/usr/bin/env bash
# Pre-push gate (Track A1). Run before pushing feature branches to main.
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

echo "pre-push-gate: ontology-sync"
make ontology-sync

echo "pre-push-gate: unit tests (go-common + rules)"
go test ./packages/go-common/... -count=1

echo "pre-push-gate: policy scripts"
./scripts/check-maturation-policy.sh
./scripts/check-no-stub-handlers.sh
./scripts/check-vendor-neutral-language.sh
./scripts/check-sandbox-registry-drift.sh
./scripts/check-express-cargo-catalog.sh

if command -v docker >/dev/null 2>&1; then
  echo "pre-push-gate: integration (express + operational loop subset)"
  go test -tags=integration -count=1 ./tests/integration/ -run 'TestExpressCargoRulesEvaluate|TestOperationalLoopHTTP' -timeout 10m
else
  echo "pre-push-gate: skip integration (docker not available)" >&2
fi

if [[ -x scripts/prove-express-cargo-sim.sh ]]; then
  echo "pre-push-gate: prove-express-cargo-sim"
  ./scripts/prove-express-cargo-sim.sh
fi

if [[ -x scripts/prove-operational-loop.sh ]]; then
  echo "pre-push-gate: prove-operational-loop (requires stack)"
  if curl -sf http://localhost:8081/health >/dev/null 2>&1; then
    ./scripts/prove-operational-loop.sh
  else
    echo "pre-push-gate: skip prove-operational-loop (services not up)" >&2
  fi
fi

if [[ -x scripts/prove-aip-eval.sh ]]; then
  echo "pre-push-gate: prove-aip-eval (requires aip stack)"
  if curl -sf http://localhost:8090/health >/dev/null 2>&1 || curl -sf http://127.0.0.1:8090/health >/dev/null 2>&1; then
    make aip-build
    ./scripts/prove-aip-eval.sh
  else
    echo "pre-push-gate: skip prove-aip-eval (agent-service not up)" >&2
  fi
fi

echo "pre-push-gate: OK"
