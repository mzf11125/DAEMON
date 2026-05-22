#!/usr/bin/env bash
# R0: compile ontology/v3 YAML → ontology/v2-compiled JSON, then validate runtime artifacts.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -d ontology/v3 ]]; then
  echo "ontology-sync: missing ontology/v3 — run: pnpm ontology:port-v3" >&2
  exit 1
fi

pnpm --filter @daemon/ontology-language build
pnpm ontology:compile

export ONTOLOGY_ROOT="${ONTOLOGY_ROOT:-ontology/v2-compiled}"
./scripts/validate-ontology.sh

if [[ -d external/daemon-system-ontology ]]; then
  echo "ontology-sync: upstream pin present at external/daemon-system-ontology"
else
  echo "ontology-sync: no upstream pin at external/daemon-system-ontology (see docs/architecture/ontology-merge-research-v1.md)"
fi

echo "ontology-sync: OK (${ONTOLOGY_ROOT})"
