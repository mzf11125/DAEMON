#!/usr/bin/env bash
# Company brief — L1 Tavily company research
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT/pipelines/market-intel"
exec python3 -m market_intel company-brief "$@"
