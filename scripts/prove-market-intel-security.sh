#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# shellcheck source=lib/market-intel-env.sh
source "$ROOT/scripts/lib/market-intel-env.sh"

"$MI_PYTHON" - <<'PY'
import json
import sys
from pathlib import Path

from market_intel.security import sanitize_user_query

probes_path = Path("aip/evals/market-intel/injection-probes.json")
data = json.loads(probes_path.read_text())

for p in data.get("probes") or []:
    q = p["query"]
    if p["id"] == "long-padding":
        q = q + (" detail" * 400)
    expect = p.get("expect", "block")
    try:
        sanitize_user_query(q)
        ok = expect == "allow"
    except ValueError:
        ok = expect == "block"
    if not ok:
        print(f"probe failed: {p['id']} expected {expect}", file=sys.stderr)
        sys.exit(1)

print("injection probes: OK")
PY

"$ROOT/scripts/market-intel-citation-eval.sh"

if compgen -G "$ROOT/artifacts/market-intel/*/*" > /dev/null; then
  if rg -l 'sk-[A-Za-z0-9]{10,}|tvly-[A-Za-z0-9]{10,}' "$ROOT/artifacts/market-intel" 2>/dev/null; then
    echo "prove-market-intel-security: secret pattern in artifacts" >&2
    exit 1
  fi
fi

echo "prove-market-intel-security: OK"
