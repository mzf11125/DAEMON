#!/usr/bin/env bash
# Generate synthetic connector manifests and sandbox gate packets for all vertical packIds.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PACKS=(
  traffic-engineering healthcare-ops logistics-nvocc humanitarian-logistics public-health
  manufacturing-ops intelligence-ops finance-risk life-sciences-ops aml-fintech web3-intel
  banking-core federal-health government-finance agri-food insurance energy-utilities
  retail-ops rail-network telecom-ops construction-ops mission-tasking logistics-express-cargo
)

# Non-geo sectors: no map pin requirement in sandbox smoke.
NON_GEO=(finance-risk aml-fintech web3-intel banking-core government-finance insurance)

geo_enabled() {
  local pack=$1
  for ng in "${NON_GEO[@]}"; do
    [[ "$ng" == "$pack" ]] && return 1
  done
  return 0
}

for pack in "${PACKS[@]}"; do
  dir="$ROOT/connectors/synthetic/$pack"
  mkdir -p "$dir/fixtures"
  geo="true"
  geo_enabled "$pack" || geo="false"

  cat >"$dir/manifest.json" <<EOF
{
  "connectorId": "synthetic-$pack",
  "packId": "$pack",
  "displayName": "Synthetic sandbox — $pack",
  "description": "Developer-local fixture connector; replay-only JSON under connectors/synthetic/$pack/",
  "version": "1.0.0",
  "geoEnabled": $geo,
  "fixtureVersion": "1",
  "objectTypes": ["Site", "Asset", "Observation", "Signal", "Case"],
  "paramsSchema": {
    "type": "object",
    "properties": {
      "fixturePath": { "type": "string", "default": "fixtures/sample.json" }
    }
  }
}
EOF

  if [[ ! -f "$dir/fixtures/sample.json" ]]; then
    cat >"$dir/fixtures/sample.json" <<EOF
{"packId":"$pack","geoEnabled":$geo,"records":[{"kind":"Site","name":"Sandbox site","latitude":0,"longitude":0}]}
EOF
  fi

  gate="$ROOT/docs/governance/sandbox-gates/${pack}-v1.md"
  mkdir -p "$(dirname "$gate")"
  cat >"$gate" <<EOF
# Sandbox gate — $pack v1

| Check | Command / artifact | Expected |
|-------|-------------------|----------|
| Pack manifest | \`ontology/v2/examples/packs/$pack/manifest.json\` | valid JSON |
| Synthetic connector | \`connectors/synthetic/$pack/manifest.json\` | present |
| Seed objects | \`make seed-sandbox\` then query \`ontology_objects\` where properties->>'vertical' = '$pack' | ≥1 Site |
| Integration | \`go test -tags=integration ./tests/integration/ -run TestSandboxSectorsSeeded/$pack\` | PASS |
| Traceability | \`docs/traceability/matrix-v1.md\` row for $pack | linked |

Stop-the-line: seed drift without updating this gate packet and integration test.
EOF
done

echo "generated ${#PACKS[@]} synthetic connectors and gate packets"
