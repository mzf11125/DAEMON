#!/usr/bin/env bash
# Pilot: validate DAEMON ontology/v2 artifacts; future hook for packages/ontology-language YAML compile.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "ontology-sync: validate ontology/v2"
./scripts/validate-ontology.sh

if [[ -d external/daemon-system-ontology ]]; then
  echo "ontology-sync: upstream pin present at external/daemon-system-ontology"
else
  echo "ontology-sync: no upstream submodule yet (see docs/architecture/ontology-merge-research-v1.md)"
fi

echo "ontology-sync: OK"
