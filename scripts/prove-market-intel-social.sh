#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# shellcheck source=lib/market-intel-env.sh
source "$ROOT/scripts/lib/market-intel-env.sh"

if [[ -z "${TAVILY_API_KEY:-}" ]]; then
  echo "prove-market-intel-social: TAVILY_API_KEY required" >&2
  exit 1
fi
if [[ -z "${OPENAI_API_KEY:-}" && -z "${OPENROUTER_API_KEY:-}" ]]; then
  echo "prove-market-intel-social: OPENAI_API_KEY or OPENROUTER_API_KEY required" >&2
  exit 1
fi

OUT=$("$MI_PYTHON" -m market_intel social --company "Stripe" --topic "brand perception" --platform linkedin)
test -f "$OUT/social_report.md"

"$MI_PYTHON" - <<PY
import json
from pathlib import Path
data = json.loads(Path("$OUT/social_report.json").read_text())
assert (data.get("results") or data.get("sources")), "expected social hits"
print("prove-market-intel-social: OK")
PY
