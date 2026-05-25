#!/usr/bin/env bash
# Staging smoke chain (items 1–7 from staging-deploy-v1.md). Export service URLs before running.
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

: "${PLATFORM_API_URL:=http://localhost:8080}"
: "${ONTOLOGY_SERVICE_URL:=http://localhost:8081}"
: "${RULES_ENGINE_URL:=http://localhost:8083}"

if [ "${PHASE0_STRICT:-}" = "1" ]; then
  for u in "$PLATFORM_API_URL" "$ONTOLOGY_SERVICE_URL" "$RULES_ENGINE_URL"; do
    case "$u" in
      http://localhost*|http://127.0.0.1*|https://localhost*|https://127.0.0.1*)
        echo "prove-staging-smoke: PHASE0_STRICT=1 but URL is localhost: $u" >&2
        exit 1
        ;;
    esac
  done
fi

echo "prove-staging-smoke: PLATFORM_API_URL=$PLATFORM_API_URL"
echo "prove-staging-smoke: ONTOLOGY_SERVICE_URL=$ONTOLOGY_SERVICE_URL"
echo "prove-staging-smoke: RULES_ENGINE_URL=$RULES_ENGINE_URL"

curl -sf "$PLATFORM_API_URL/health" >/dev/null
curl -sf "$ONTOLOGY_SERVICE_URL/health" >/dev/null
curl -sf "$RULES_ENGINE_URL/health" >/dev/null

./scripts/e2e-smoke.sh
E2E_FULL=1 ./scripts/e2e-smoke.sh
./scripts/prove-operational-loop.sh
./scripts/prove-aip-eval.sh

# e2e / eval restarts local listeners; Cloudflare tunnel URLs in env are often stale afterward.
if curl -sf "http://127.0.0.1:8080/health" >/dev/null 2>&1; then
  export PLATFORM_API_URL="http://127.0.0.1:8080"
fi
if curl -sf "http://127.0.0.1:8081/health" >/dev/null 2>&1; then
  export ONTOLOGY_SERVICE_URL="http://127.0.0.1:8081"
fi
if curl -sf "http://127.0.0.1:8083/health" >/dev/null 2>&1; then
  export RULES_ENGINE_URL="http://127.0.0.1:8083"
fi

if [ -n "${AGENT_BRIDGE_URL:-}" ] && ! case "${AGENT_BRIDGE_URL}" in http://localhost*|http://127.0.0.1*|https://localhost*|https://127.0.0.1*) ;; *) false ;; esac; then
  AGENT_BRIDGE_URL="$AGENT_BRIDGE_URL" ./scripts/smoke-agent-bridge.sh
elif docker compose -f infra/docker/docker-compose.yml --profile merge-track ps agent-bridge 2>/dev/null | grep -qE 'running|Up'; then
  ./scripts/smoke-agent-bridge.sh
else
  echo "prove-staging-smoke: skip smoke-agent-bridge (no AGENT_BRIDGE_URL or merge-track agent-bridge)"
fi

./scripts/prove-express-cargo-sim.sh
./scripts/prove-plugin-remap.sh

echo "prove-staging-smoke: ok (fill non-localhost transcripts in docs/operations/oidc-rls-verification-v1.md)"
