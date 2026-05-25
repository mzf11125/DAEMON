#!/usr/bin/env bash
# Phase 0 exit gates: prove-* chain against staging URLs (non-localhost).
# Usage: set -a && source .env.staging && set +a && ./scripts/run-phase0-staging-proof.sh
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

is_localhost() {
  case "$1" in
    http://localhost*|http://127.0.0.1*|https://localhost*|https://127.0.0.1*) return 0 ;;
    *) return 1 ;;
  esac
}

require_url() {
  local name="$1" val="${2:-}"
  if [ -z "$val" ]; then
    echo "run-phase0-staging-proof: missing $name (set in .env.staging)" >&2
    exit 1
  fi
  if [ "${PHASE0_STRICT:-}" = "1" ] && is_localhost "$val"; then
    echo "run-phase0-staging-proof: $name=$val is localhost; PHASE0_STRICT=1 requires staging hostnames" >&2
    exit 1
  fi
}

require_url PLATFORM_API_URL "${PLATFORM_API_URL:-}"
require_url ONTOLOGY_SERVICE_URL "${ONTOLOGY_SERVICE_URL:-}"
require_url RULES_ENGINE_URL "${RULES_ENGINE_URL:-}"

echo "run-phase0-staging-proof: PLATFORM_API_URL=$PLATFORM_API_URL"
echo "run-phase0-staging-proof: ONTOLOGY_SERVICE_URL=$ONTOLOGY_SERVICE_URL"
echo "run-phase0-staging-proof: RULES_ENGINE_URL=$RULES_ENGINE_URL"

# prove-staging-smoke.sh already runs e2e, prove-operational-loop, prove-aip-eval, express/plugin proofs.
./scripts/prove-staging-smoke.sh

if [ -n "${AGENT_BRIDGE_URL:-}" ] && ! is_localhost "${AGENT_BRIDGE_URL:-http://localhost:3001}"; then
  AGENT_BRIDGE_URL="$AGENT_BRIDGE_URL" ./scripts/smoke-agent-bridge.sh
elif docker compose -f infra/docker/docker-compose.yml --profile merge-track ps agent-bridge 2>/dev/null | grep -qE 'running|Up'; then
  ./scripts/smoke-agent-bridge.sh
else
  echo "run-phase0-staging-proof: skip smoke-agent-bridge (set AGENT_BRIDGE_URL or start merge-track locally)"
fi

echo "run-phase0-staging-proof: ok — record transcripts in docs/operations/oidc-rls-verification-v1.md"
