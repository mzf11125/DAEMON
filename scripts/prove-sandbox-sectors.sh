#!/usr/bin/env bash
# Prove all 23 sandbox sector packs seed at least one Site (integration test; Docker or local stack).
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

if [[ "${INTEGRATION_USE_LOCAL:-}" == "1" ]] || [[ "${INTEGRATION_USE_LOCAL:-}" == "true" ]]; then
  ./scripts/check-integration-local-stack.sh
elif docker info >/dev/null 2>&1; then
  unset INTEGRATION_USE_LOCAL
else
  echo "prove-sandbox-sectors: Docker unavailable." >&2
  echo "  Start Docker Desktop and re-run (uses ephemeral testcontainers), or:" >&2
  echo "  ./scripts/bootstrap-integration-local.sh" >&2
  echo "  INTEGRATION_USE_LOCAL=1 $0" >&2
  exit 1
fi

echo "prove-sandbox-sectors: running TestSandboxSectorsSeeded and TestSandboxGeoMapGeoEnabledPacks"
go test -tags=integration -count=1 ./tests/integration/ -run 'TestSandboxSectorsSeeded|TestSandboxGeoMapGeoEnabledPacks'
echo "prove-sandbox-sectors: ok"
