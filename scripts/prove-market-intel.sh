#!/usr/bin/env bash
# L1 smoke: company brief with schema + sources + ai_visibility
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# shellcheck source=lib/market-intel-env.sh
source "$ROOT/scripts/lib/market-intel-env.sh"

if [[ -z "${TAVILY_API_KEY:-}" ]]; then
  echo "prove-market-intel: TAVILY_API_KEY required (set in .env or export)" >&2
  exit 1
fi
if [[ "${TAVILY_API_KEY}" == *placeholder* ]]; then
  echo "prove-market-intel: placeholder TAVILY_API_KEY rejected" >&2
  exit 1
fi
if [[ -z "${OPENAI_API_KEY:-}" && -z "${OPENROUTER_API_KEY:-}" ]]; then
  echo "prove-market-intel: OPENAI_API_KEY or OPENROUTER_API_KEY required for L1 LLM" >&2
  exit 1
fi

OUT=$("$MI_PYTHON" -m market_intel company-brief \
  --company "Stripe" \
  --domain stripe.com \
  --industry "payments")

test -d "$OUT"
test -f "$OUT/account_brief.json"
test -f "$OUT/report.md"
test -f "$OUT/sources.json"
test -f "$OUT/run_manifest.json"

"$MI_PYTHON" - <<PY
import json, sys
from pathlib import Path
root = Path("$OUT")
brief = json.loads((root / "account_brief.json").read_text())
sources = brief.get("sources") or []
if len(sources) < 3:
    print("expected >=3 sources, got", len(sources), file=sys.stderr)
    sys.exit(1)
if not brief.get("ai_visibility"):
    print("ai_visibility block missing", file=sys.stderr)
    sys.exit(1)
report = (root / "report.md").read_text()
if "sk-" in report or "tvly-" in report:
    print("secret pattern in report", file=sys.stderr)
    sys.exit(1)
metrics_path = root / "humanize_metrics.json"
if metrics_path.exists():
    metrics = json.loads(metrics_path.read_text())
    density = float(metrics.get("ai_tell_density", 0))
    if density > 12.0:
        print(f"ai_tell_density too high: {density}", file=sys.stderr)
        sys.exit(1)
manifest = json.loads((root / "run_manifest.json").read_text())
if not manifest.get("workflow_run_id"):
    print("workflow_run_id missing in run_manifest", file=sys.stderr)
    sys.exit(1)
if manifest.get("tavily_calls", 0) < 1:
    print("expected tavily_calls >= 1", file=sys.stderr)
    sys.exit(1)
print("prove-market-intel: OK", root)
PY
