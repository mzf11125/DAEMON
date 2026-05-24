#!/usr/bin/env bash
# Prove logistics-nvocc sandbox pack seeds and integration gate.
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

if [[ "${INTEGRATION_USE_LOCAL:-}" == "1" ]] || [[ "${INTEGRATION_USE_LOCAL:-}" == "true" ]]; then
  ./scripts/check-integration-local-stack.sh
elif docker info >/dev/null 2>&1; then
  unset INTEGRATION_USE_LOCAL
else
  echo "prove-logistics-nvocc: Docker unavailable." >&2
  echo "  INTEGRATION_USE_LOCAL=1 $0" >&2
  exit 1
fi

echo "prove-logistics-nvocc: TestSandboxSectorsSeeded/logistics-nvocc"
go test -tags=integration -count=1 ./tests/integration/ -run 'TestSandboxSectorsSeeded/logistics-nvocc'
echo "prove-logistics-nvocc: ok"
