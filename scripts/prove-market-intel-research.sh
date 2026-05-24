#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# shellcheck source=lib/market-intel-env.sh
source "$ROOT/scripts/lib/market-intel-env.sh"

if [[ -z "${TAVILY_API_KEY:-}" ]]; then
  echo "prove-market-intel-research: TAVILY_API_KEY required" >&2
  exit 1
fi

ART=$("$MI_PYTHON" -m market_intel research --query "Overview of B2B payments infrastructure market" --model mini)
test -f "$ART/research_result.json"

"$MI_PYTHON" - <<PY
import json, sys
from pathlib import Path
r = json.loads(Path("$ART/research_result.json").read_text())
status = (r.get("status") or "").lower()
if status not in ("completed", "success"):
    print("unexpected status", status, file=sys.stderr)
    sys.exit(1)
sources = r.get("sources") or r.get("results") or []
content = r.get("content") or r.get("report") or ""
if len(sources) < 1 and not content:
    print("expected research output", file=sys.stderr)
    sys.exit(1)
print("prove-market-intel-research: OK")
PY
