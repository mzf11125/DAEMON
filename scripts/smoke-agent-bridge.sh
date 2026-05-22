#!/usr/bin/env bash
# Requires Go stack up (ontology :8081, platform :8080). Starts bridge briefly if AGENT not listening.
set -euo pipefail
ONTOLOGY_SERVICE_URL="${ONTOLOGY_SERVICE_URL:-http://localhost:8081}"
PLATFORM_API_URL="${PLATFORM_API_URL:-http://localhost:8080}"
AGENT_PORT="${AGENT_PORT:-3001}"

curl -sf "${ONTOLOGY_SERVICE_URL}/health" >/dev/null
curl -sf "${PLATFORM_API_URL}/health" >/dev/null

if ! curl -sf "http://127.0.0.1:${AGENT_PORT}/health" >/dev/null 2>&1; then
  export AGENT_DAEMON_BRIDGE=true
  pnpm --filter @daemon/agent-service exec tsx src/bridge-main.ts &
  pid=$!
  trap 'kill $pid 2>/dev/null || true' EXIT
  for i in $(seq 1 30); do
    curl -sf "http://127.0.0.1:${AGENT_PORT}/health" >/dev/null && break
    sleep 1
  done
fi

curl -sf "http://127.0.0.1:${AGENT_PORT}/health" | head -c 200
echo
curl -sf "http://127.0.0.1:${AGENT_PORT}/v1/bridge/manifest" | head -c 200
echo
echo "agent-bridge-smoke: OK"
