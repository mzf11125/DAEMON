#!/usr/bin/env bash
# Prove geo map read model (integration test; requires Docker).
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"
echo "prove-p3-geo: running TestGeoMapHTTP"
go test -tags=integration -count=1 ./tests/integration/ -run 'TestGeoMapHTTP|TestGeoMapDisabledWithoutFeature'
echo "prove-p3-geo: ok"
