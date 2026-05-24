#!/usr/bin/env bash
# Prove all 22 sandbox sector packs seed at least one Site (integration test; requires Docker).
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"
echo "prove-sandbox-sectors: running TestSandboxSectorsSeeded"
go test -tags=integration -count=1 ./tests/integration/ -run TestSandboxSectorsSeeded
echo "prove-sandbox-sectors: ok"
