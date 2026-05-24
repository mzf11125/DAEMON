#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# shellcheck source=lib/market-intel-env.sh
source "$ROOT/scripts/lib/market-intel-env.sh"

for v in TAVILY_API_KEY DATABASE_URL; do
  if [[ -z "${!v:-}" ]]; then
    echo "prove-market-intel-rag: $v required" >&2
    exit 1
  fi
done
if [[ -z "${OPENAI_API_KEY:-}" && -z "${OPENROUTER_API_KEY:-}" ]]; then
  echo "prove-market-intel-rag: OPENAI_API_KEY or OPENROUTER_API_KEY required" >&2
  exit 1
fi

if command -v psql >/dev/null 2>&1; then
  apply_market_intel_migration
fi

THREAD="prove-rag-$(date +%s)"
ART=$("$MI_PYTHON" -m market_intel vectorize --url "https://www.iana.org/domains/reserved" --thread-id "$THREAD" --limit 2 --source-type extract)
test -f "$ART/vectorize_manifest.json"

"$MI_PYTHON" - <<PY
import json, sys
from pathlib import Path
m = json.loads(Path("$ART/vectorize_manifest.json").read_text())
if m.get("ingested", 0) < 1:
    print("expected >=1 chunk ingested", m, file=sys.stderr)
    sys.exit(1)
PY

"$MI_PYTHON" -m market_intel ask --thread-id "$THREAD" --question "What is on this site?" | grep -q .
echo "prove-market-intel-rag: OK"
