#!/usr/bin/env bash
set -euo pipefail

if ! command -v dune >/dev/null 2>&1; then
  echo "dune CLI not installed — see docs/integrations/dune-connectors-v1.md (Layer A)" >&2
  exit 1
fi

if [[ -z "${DUNE_API_KEY:-}" ]]; then
  echo "DUNE_API_KEY not set" >&2
  exit 1
fi

dune query run-sql --sql "SELECT 1 AS ok" -o json
echo "dune-smoke-cli: ok"
