#!/usr/bin/env bash
# Prove geo map read model (integration test; Docker testcontainers or local stack).
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

if [[ "${INTEGRATION_USE_LOCAL:-}" == "1" ]] || [[ "${INTEGRATION_USE_LOCAL:-}" == "true" ]]; then
  ./scripts/check-integration-local-stack.sh
elif docker info >/dev/null 2>&1; then
  unset INTEGRATION_USE_LOCAL
else
  echo "prove-p3-geo: Docker unavailable." >&2
  echo "  Start Docker Desktop and re-run (uses ephemeral testcontainers), or:" >&2
  echo "  ./scripts/bootstrap-integration-local.sh" >&2
  echo "  INTEGRATION_USE_LOCAL=1 $0" >&2
  exit 1
fi

echo "prove-p3-geo: running TestGeoMapHTTP"
go test -tags=integration -count=1 ./tests/integration/ -run 'TestGeoMapHTTP|TestGeoMapDisabledWithoutFeature'
echo "prove-p3-geo: ok"
