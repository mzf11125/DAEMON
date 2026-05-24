#!/usr/bin/env bash
# Stop-the-line: synthetic sector registry, fixtures, gate packets, and integration test table must match.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

expected=(
  traffic-engineering healthcare-ops logistics-nvocc humanitarian-logistics
  public-health manufacturing-ops intelligence-ops finance-risk
  life-sciences-ops aml-fintech web3-intel banking-core
  federal-health government-finance agri-food insurance
  energy-utilities retail-ops rail-network telecom-ops
  construction-ops mission-tasking logistics-express-cargo
)

fail=0

for pack in "${expected[@]}"; do
  if [[ ! -f "connectors/synthetic/${pack}/manifest.json" ]]; then
    echo "drift: missing connector manifest for ${pack}" >&2
    fail=1
  fi
  if [[ ! -f "docs/governance/sandbox-gates/${pack}-v1.md" ]]; then
    echo "drift: missing gate packet docs/governance/sandbox-gates/${pack}-v1.md" >&2
    fail=1
  fi
  if ! grep -q "\"${pack}\"" tests/integration/sandbox_sectors_test.go; then
    echo "drift: packId ${pack} missing from sandbox_sectors_test.go" >&2
    fail=1
  fi
done

# Gate packets must include Tier-1 sections.
for pack in "${expected[@]}"; do
  gate="docs/governance/sandbox-gates/${pack}-v1.md"
  for section in "Entry criteria" "Exit criteria" "FMEA-lite" "Evidence" "Owner"; do
    if ! grep -q "$section" "$gate" 2>/dev/null; then
      echo "drift: gate packet ${gate} missing section: ${section}" >&2
      fail=1
    fi
  done
done

found=$(find connectors/synthetic -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')
if [[ "$found" -ne "${#expected[@]}" ]]; then
  echo "drift: expected ${#expected[@]} synthetic connector dirs, found ${found}" >&2
  fail=1
fi

if [[ "$fail" -ne 0 ]]; then
  exit 1
fi

echo "sandbox registry drift check: ok (${#expected[@]} sectors)"
