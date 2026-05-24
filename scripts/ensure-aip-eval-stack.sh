#!/usr/bin/env bash
# Ensure platform-api, ontology-service, and case-service are healthy for make aip-eval.
# Skips when already up. Set EVAL_SKIP_STACK_BOOTSTRAP=1 to fail fast with instructions only.
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

if [ -f "$root/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$root/.env"
  set +a
fi

export DATABASE_URL="${DATABASE_URL:-postgresql://daemon_runtime:daemon_runtime_local@127.0.0.1:54332/postgres?sslmode=disable}"
export SEED_DATABASE_URL="${SEED_DATABASE_URL:-postgresql://postgres:postgres@127.0.0.1:54332/postgres?sslmode=disable}"
# AIP eval always uses compiled ontology; .env may point at ./ontology/v2 for other workflows.
export ONTOLOGY_ROOT="$root/ontology/v2-compiled"
export TENANT_ID="${TENANT_ID:-tenant-demo}"
# Local eval uses X-Tenant-Id only; .env often sets OIDC_REQUIRED=true for console-web.
export OIDC_REQUIRED="false"
export SKIP_NEO4J_SEED="${SKIP_NEO4J_SEED:-1}"
# Match infra/docker/docker-compose.yml neo4j service (ignore cloud/custom .env passwords).
export NEO4J_URI="neo4j://localhost:7687"
export NEO4J_USER="neo4j"
export NEO4J_PASSWORD="daemonneo4j"

ONTOLOGY_URL="${ONTOLOGY_SERVICE_URL:-http://localhost:8081}"
PLATFORM_URL="${PLATFORM_API_URL:-http://localhost:8080}"
CASE_URL="${CASE_SERVICE_URL:-http://localhost:8084}"

stack_healthy() {
  curl -sf "${ONTOLOGY_URL}/health" >/dev/null 2>&1 \
    && curl -sf "${PLATFORM_URL}/health" >/dev/null 2>&1 \
    && curl -sf "${CASE_URL}/health" >/dev/null 2>&1
}

eval_api_ready() {
  curl -sf "${ONTOLOGY_URL}/v1/objects/Signal" -H "X-Tenant-Id: ${TENANT_ID}" 2>/dev/null | grep -q '"items"'
}

if stack_healthy && eval_api_ready; then
  echo "ensure-aip-eval-stack: services already healthy (eval-ready)"
  exit 0
fi

if stack_healthy && ! eval_api_ready; then
  echo "ensure-aip-eval-stack: services up but not eval-ready (likely OIDC_REQUIRED=true); restarting Go services"
  for port in 8080 8081 8084; do
    if command -v lsof >/dev/null 2>&1; then
      lsof -ti ":${port}" 2>/dev/null | xargs kill 2>/dev/null || true
    fi
  done
  sleep 2
fi

if [ "${EVAL_SKIP_STACK_BOOTSTRAP:-}" = "1" ] || [ "${EVAL_SKIP_STACK_BOOTSTRAP:-}" = "true" ]; then
  echo "ensure-aip-eval-stack: ontology/platform/case not reachable." >&2
  echo "  Start stack: ./scripts/ensure-aip-eval-stack.sh" >&2
  echo "  Or: ./scripts/bootstrap-integration-local.sh then run services (see scripts/e2e-smoke.sh)" >&2
  echo "  Or: ./scripts/prove-aip-eval.sh" >&2
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "ensure-aip-eval-stack: Docker required to bootstrap data stores." >&2
  exit 1
fi

echo "ensure-aip-eval-stack: bootstrapping local stack for AIP eval"

PIDS=()
cleanup() {
  if [ "${AIP_EVAL_STOP_AFTER:-}" = "1" ] && ((${#PIDS[@]} > 0)); then
    for pid in "${PIDS[@]}"; do
      kill "$pid" 2>/dev/null || true
    done
  fi
}
trap cleanup EXIT

wait_http() {
  local url="$1"
  local n=0
  until curl -sf "$url" >/dev/null; do
    n=$((n + 1))
    if [ "$n" -gt 90 ]; then
      echo "ensure-aip-eval-stack: timeout waiting for $url" >&2
      exit 1
    fi
    sleep 2
  done
}

start_if_down() {
  local port="$1"
  local dir="$2"
  if curl -sf "http://localhost:${port}/health" >/dev/null 2>&1; then
    echo "ensure-aip-eval-stack: :${port} already healthy"
    return
  fi
  echo "ensure-aip-eval-stack: starting service on :${port}"
  (
    cd "$dir"
    ONTOLOGY_ROOT="$ONTOLOGY_ROOT" \
      DATABASE_URL="$DATABASE_URL" \
      OIDC_REQUIRED="$OIDC_REQUIRED" \
      NEO4J_URI="$NEO4J_URI" \
      NEO4J_USER="$NEO4J_USER" \
      NEO4J_PASSWORD="$NEO4J_PASSWORD" \
      go run ./cmd
  ) &
  PIDS+=($!)
  wait_http "http://localhost:${port}/health"
}

make up

echo "ensure-aip-eval-stack: waiting for Neo4j Bolt auth (:7687)"
sleep 3
n=0
until docker exec docker-neo4j-1 bin/cypher-shell -u "${NEO4J_USER}" -p "${NEO4J_PASSWORD}" "RETURN 1" >/dev/null 2>&1; do
  n=$((n + 1))
  if [ "$n" -gt 30 ]; then
    echo "ensure-aip-eval-stack: Neo4j auth failed (expected user=${NEO4J_USER} password from docker compose)." >&2
    echo "  Reset: docker compose -f infra/docker/docker-compose.yml down neo4j && docker volume rm docker_neo4j_data 2>/dev/null; make up" >&2
    exit 1
  fi
  sleep 2
done

if command -v supabase >/dev/null 2>&1; then
  if ! curl -sf "${SUPABASE_URL:-http://127.0.0.1:54331}/auth/v1/health" >/dev/null 2>&1; then
    echo "ensure-aip-eval-stack: starting Supabase"
    make supabase-up
  fi
  n=0
  until pg_isready -h 127.0.0.1 -p 54332 -U postgres >/dev/null 2>&1; do
    n=$((n + 1))
    [ "$n" -le 90 ] || { echo "ensure-aip-eval-stack: postgres :54332 not ready"; exit 1; }
    sleep 1
  done
fi

echo "ensure-aip-eval-stack: applying migrations + seed"
for f in 001_init.sql 002_indexes_fk.sql 003_ingestion_params.sql 004_supabase_compat_roles.sql 005_authenticated_grants.sql 006_p3_geo_attachments.sql; do
  if [ -f "infra/migrations/postgres/$f" ]; then
    psql "$SEED_DATABASE_URL" -f "infra/migrations/postgres/$f" >/dev/null 2>&1 || true
  fi
done
make ontology-sync
( cd infra/seed && SKIP_NEO4J_SEED="$SKIP_NEO4J_SEED" go run . )

start_if_down 8080 "$root/services/platform-api"
start_if_down 8081 "$root/services/ontology-service"
start_if_down 8084 "$root/services/case-service"

if ! stack_healthy; then
  echo "ensure-aip-eval-stack: stack still unhealthy after bootstrap" >&2
  exit 1
fi

echo "ensure-aip-eval-stack: ok (services left running; set AIP_EVAL_STOP_AFTER=1 to stop on script exit)"
