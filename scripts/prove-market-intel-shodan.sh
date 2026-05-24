#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# shellcheck source=lib/market-intel-env.sh
source "$ROOT/scripts/lib/market-intel-env.sh"

if [[ -z "${SHODAN_API_KEY:-}" ]]; then
  echo "prove-market-intel-shodan: SKIP (SHODAN_API_KEY not set)"
  exit 0
fi

"$MI_PYTHON" - <<PY
import json, subprocess, os, sys
env = {**os.environ, "PYTHONPATH": os.environ.get("PYTHONPATH", "")}
r = subprocess.run(
    [sys.executable, "-m", "market_intel", "market-trends", "--query", "product:nginx"],
    capture_output=True,
    text=True,
    env=env,
)
if r.returncode != 0:
    print(r.stderr, file=sys.stderr)
    sys.exit(r.returncode)
data = json.loads(r.stdout)
if data.get("skipped"):
    print("prove-market-intel-shodan: SKIP")
    sys.exit(0)
matches = data.get("matches") or []
if not matches:
    print("expected monthly matches", data, file=sys.stderr)
    sys.exit(1)
print("prove-market-intel-shodan: OK")
PY
