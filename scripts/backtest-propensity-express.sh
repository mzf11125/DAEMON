#!/usr/bin/env bash
# Compare z-score vs ML propensity rule coverage on demo tenant (integration harness).
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

echo "backtest-propensity-express: running TestExpressCargoRulesEvaluate (z-score + volume + ML)"
go test -tags=integration -count=1 ./tests/integration/ -run TestExpressCargoRulesEvaluate -v
echo "backtest-propensity-express: ok — see rule_runs / Signal provenance in test logs"
