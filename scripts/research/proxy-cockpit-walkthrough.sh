#!/usr/bin/env bash
# Proxy operator walkthrough (A-RES-01) — no live user sessions required for v1 merge gates.
# Run after stack is up: make demo or E2E_FULL=1 ./scripts/e2e-smoke.sh
set -euo pipefail

root="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$root"

echo "=== Proxy cockpit walkthrough (30 min checklist) ==="
echo ""
echo "1. Sign in as analyst@demo.local (console or token grant)"
echo "2. / — confirm signals visible; open case from highest severity"
echo "3. /cases/{id} — linked signals, summary, audit strip (empty then populated)"
echo "4. Record decision — audit shows OpenCase + RecordDecision"
echo "5. Optional: MCP investigate_case (read-only) before human OpenCase"
echo ""
echo "Automated proof (optional):"
echo "  E2E_FULL=1 ./scripts/e2e-smoke.sh"
echo "  ./scripts/prove-operational-loop.sh"
echo ""
echo "Log issues in docs/lifecycle/dx-paper-cuts-v1.md or assumption register change log."
