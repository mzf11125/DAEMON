#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

violations=0
while IFS= read -r -d '' f; do
  if grep -qE 'return.*mock|noop handler|fixture-only|hardcoded fake' "$f" 2>/dev/null; then
    echo "stub-ban: $f"
    violations=$((violations + 1))
  fi
done < <(find services -name '*.go' ! -name '*_test.go' -print0)

if grep -qE 'time\.Sleep' services/ingestion-service/cmd/main.go 2>/dev/null; then
  echo "stub-ban: services/ingestion-service/cmd/main.go uses time.Sleep for job completion"
  violations=$((violations + 1))
fi

if [ "$violations" -gt 0 ]; then
  echo "check-no-stub-handlers: $violations violation(s)"
  exit 1
fi
echo "check-no-stub-handlers: ok"
