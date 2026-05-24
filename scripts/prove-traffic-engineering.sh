#!/usr/bin/env bash
# Prove traffic-engineering sandbox pack seeds and integration gate.
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

if [[ "${INTEGRATION_USE_LOCAL:-}" == "1" ]] || [[ "${INTEGRATION_USE_LOCAL:-}" == "true" ]]; then
  ./scripts/check-integration-local-stack.sh
elif docker info >/dev/null 2>&1; then
  unset INTEGRATION_USE_LOCAL
else
  echo "prove-traffic-engineering: Docker unavailable." >&2
  echo "  INTEGRATION_USE_LOCAL=1 $0" >&2
  exit 1
fi

echo "prove-traffic-engineering: TestSandboxSectorsSeeded/traffic-engineering"
go test -tags=integration -count=1 ./tests/integration/ -run 'TestSandboxSectorsSeeded/traffic-engineering'
echo "prove-traffic-engineering: ok"
