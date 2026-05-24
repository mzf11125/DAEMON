#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT/pipelines/market-intel"
exec python3 -m market_intel market-map "$@"
