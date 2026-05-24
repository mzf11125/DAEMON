#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# shellcheck source=lib/market-intel-env.sh
source "$ROOT/scripts/lib/market-intel-env.sh"

for v in TAVILY_API_KEY DATABASE_URL; do
  if [[ -z "${!v:-}" ]]; then
    echo "prove-market-intel-hybrid: $v required" >&2
    exit 1
  fi
done
if [[ -z "${OPENAI_API_KEY:-}" && -z "${OPENROUTER_API_KEY:-}" ]]; then
  echo "prove-market-intel-hybrid: OPENAI_API_KEY or OPENROUTER_API_KEY required" >&2
  exit 1
fi

if command -v psql >/dev/null 2>&1; then
  apply_market_intel_migration
fi

THREAD="prove-hybrid-$(date +%s)"
SEED="INTERNAL: Acme Corp ships cold-chain visibility SaaS with SOC2 and API-first integrations."
ART=$("$MI_PYTHON" -m market_intel hybrid --thread-id "$THREAD" --seed "$SEED" \
  --question "What security certifications does Acme have and how do they compare to industry peers?")

test -f "$ART/hybrid_report.json"
"$MI_PYTHON" - <<PY
import json, sys
from pathlib import Path
r = json.loads(Path("$ART/hybrid_report.json").read_text())
if not r.get("answer"):
    sys.exit("missing answer")
if not r.get("web_sources"):
    sys.exit("expected web_sources enrichment")
kb = r.get("kb_enrichment") or {}
if kb.get("ingested", 0) < 1:
    sys.exit("expected kb_enrichment ingested >= 1")
print("prove-market-intel-hybrid: OK")
PY
