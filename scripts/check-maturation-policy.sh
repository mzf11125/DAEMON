#!/usr/bin/env bash
# Fail CI if public docs claim production-ready agent before maturation gates allow it.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

FORBIDDEN='production-ready agent|production grade agent|GA production agent'
if rg -i "$FORBIDDEN" README.md CONTRIBUTING.md docs/aip docs/governance apps/daemon-cli/README.md aip/agent-service/README.md 2>/dev/null; then
  echo "maturation-policy: forbidden production-agent claim in docs" >&2
  exit 1
fi

if rg -i 'production.agent' apps/daemon-cli/README.md 2>/dev/null | rg -v 'require|not|until|no production'; then
  echo "maturation-policy: check daemon-cli README" >&2
  exit 1
fi

echo "maturation-policy: OK"
