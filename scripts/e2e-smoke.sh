#!/usr/bin/env bash
# End-to-end smoke test for the Daemon platform scaffold.
# Requires: Docker (data stores), curl, psql, clickhouse-client (optional), Go toolchain.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

export DATABASE_URL="${DATABASE_URL:-postgresql://daemon_runtime:daemon_runtime_local@127.0.0.1:54332/postgres?sslmode=disable}"
export SEED_DATABASE_URL="${SEED_DATABASE_URL:-postgresql://postgres:postgres@127.0.0.1:54332/postgres?sslmode=disable}"
export SUPABASE_URL="${SUPABASE_URL:-http://127.0.0.1:54331}"
export SUPABASE_JWT_SECRET="${SUPABASE_JWT_SECRET:-super-secret-jwt-token-with-at-least-32-characters-long}"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}"
export CLICKHOUSE_DSN="${CLICKHOUSE_DSN:-clickhouse://daemon:daemon@localhost:9000/daemon}"
export NEO4J_URI="${NEO4J_URI:-neo4j://localhost:7687}"
export NEO4J_USER="${NEO4J_USER:-neo4j}"
export NEO4J_PASSWORD="${NEO4J_PASSWORD:-daemonneo4j}"
export ONTOLOGY_ROOT="${ONTOLOGY_ROOT:-$root/ontology/v2-compiled}"
export REPO_ROOT="$root"
TENANT="${TENANT:-tenant-demo}"

PIDS=()
cleanup() {
  if ((${#PIDS[@]} > 0)); then
    for pid in "${PIDS[@]}"; do
      kill "$pid" 2>/dev/null || true
    done
  fi
}
trap cleanup EXIT

compose_file="infra/docker/docker-compose.yml"
compose_up_datastores() {
  docker compose -f "$compose_file" up -d clickhouse neo4j
}

load_supabase_env() {
  if ! command -v supabase >/dev/null 2>&1; then
    return 1
  fi
  while IFS= read -r line; do
    case "$line" in
      ANON_KEY=*)
        export NEXT_PUBLIC_SUPABASE_ANON_KEY="${line#ANON_KEY=}"
        ;;
      JWT_SECRET=*) export SUPABASE_JWT_SECRET="${line#JWT_SECRET=}" ;;
      API_URL=*)
        export SUPABASE_URL="${line#API_URL=}"
        export OIDC_ISSUER="${SUPABASE_URL}/auth/v1"
        ;;
    esac
  done < <(supabase status -o env 2>/dev/null | tr -d '"')
}

wait_http() {
  local url="$1"
  local n=0
  until curl -sf "$url" >/dev/null; do
    n=$((n + 1))
    if [ "$n" -gt 60 ]; then
      echo "e2e-smoke: timeout waiting for $url"
      exit 1
    fi
    sleep 1
  done
}

start_if_down() {
  local port="$1"
  local dir="$2"
  if [ "${E2E_FORCE_RESTART:-0}" = "1" ] && curl -sf "http://localhost:${port}/health" >/dev/null 2>&1; then
    echo "e2e-smoke: restarting stale service on :$port"
    if command -v lsof >/dev/null 2>&1; then
      lsof -ti ":${port}" 2>/dev/null | xargs kill 2>/dev/null || true
      sleep 1
    fi
  elif curl -sf "http://localhost:${port}/health" >/dev/null 2>&1; then
    echo "e2e-smoke: port $port already healthy"
    return
  fi
  echo "e2e-smoke: starting service on :$port"
  (cd "$dir" && ONTOLOGY_ROOT="$root/ontology/v2-compiled" DATABASE_URL="${DATABASE_URL:-postgresql://daemon_runtime:daemon_runtime_local@127.0.0.1:54332/postgres?sslmode=disable}" go run ./cmd) &
  PIDS+=($!)
  wait_http "http://localhost:${port}/health"
}

echo "e2e-smoke: bringing up data stores (clickhouse + neo4j only)"
if ! compose_up_datastores; then
  echo "e2e-smoke: compose up failed — is port 5432 in use by legacy docker-postgres?" >&2
  echo "e2e-smoke: run: make down  (removes legacy postgres/keycloak); or stop other postgres on :5432" >&2
  exit 1
fi

echo "e2e-smoke: waiting for Neo4j Bolt auth (:7687)"
sleep 3
n=0
until docker exec docker-neo4j-1 bin/cypher-shell -u "${NEO4J_USER}" -p "${NEO4J_PASSWORD}" "RETURN 1" >/dev/null 2>&1; do
  n=$((n + 1))
  if [ "$n" -gt 30 ]; then
    echo "e2e-smoke: timeout waiting for Neo4j Bolt auth" >&2
    exit 1
  fi
  sleep 2
done
echo "e2e-smoke: Neo4j Bolt ready"

load_supabase_env || true
if command -v supabase >/dev/null 2>&1; then
  if ! curl -sf "${SUPABASE_URL}/auth/v1/health" >/dev/null 2>&1; then
    echo "e2e-smoke: starting Supabase (DAEMON DB :54332; other projects may use default :54322)"
    make supabase-up 2>/dev/null || {
      echo "e2e-smoke: supabase start failed — check supabase/config.toml ports (DB 54332) or: supabase stop --project-id <other>" >&2
      exit 1
    }
  fi
fi

echo "e2e-smoke: waiting for Supabase postgres (:54332)"
n=0
until pg_isready -h 127.0.0.1 -p 54332 -U postgres >/dev/null 2>&1; do
  n=$((n + 1))
  [ "$n" -le 90 ] || { echo "supabase postgres not ready — run: make supabase-up"; exit 1; }
  sleep 1
done

echo "e2e-smoke: migrate + seed auth + seed + pipelines"
supabase db reset 2>/dev/null || {
  echo "e2e-smoke: supabase db reset skipped — schema may already exist; applying raw SQL"
}
psql "$SEED_DATABASE_URL" -f infra/migrations/postgres/001_init.sql 2>/dev/null || true
psql "$SEED_DATABASE_URL" -f infra/migrations/postgres/002_indexes_fk.sql 2>/dev/null || true
psql "$SEED_DATABASE_URL" -f infra/migrations/postgres/003_ingestion_params.sql 2>/dev/null || true
psql "$SEED_DATABASE_URL" -f infra/migrations/postgres/009_audit_event_class_and_archive_batches.sql 2>/dev/null || true
if [ -x ./scripts/supabase-seed-auth.sh ]; then
  eval "$(./scripts/supabase-seed-auth.sh | grep '^SUPABASE_DEMO_USER_ID=')" || true
  export SUPABASE_DEMO_USER_ID
fi
make seed
make ontology-sync
make pipeline-all
if [ -x ./scripts/supabase-seed-auth.sh ]; then
  eval "$(./scripts/supabase-seed-auth.sh | grep '^SUPABASE_DEMO_USER_ID=')" || true
  export SUPABASE_DEMO_USER_ID
fi
make seed
make ontology-sync
make pipeline-all

# After migrate/seed, in-memory Go processes may point at a reset DB — restart listeners.
export E2E_FORCE_RESTART=1

load_supabase_env || true

if [ -x ./scripts/supabase-seed-auth.sh ]; then
  eval "$(./scripts/supabase-seed-auth.sh | grep '^SUPABASE_DEMO_USER_ID=')" || true
  export SUPABASE_DEMO_USER_ID
fi

BEARER=""
if [ -n "${NEXT_PUBLIC_SUPABASE_ANON_KEY}" ]; then
  tok=$(curl -sf "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
    -H "apikey: ${NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
    -H "Content-Type: application/json" \
    -d '{"email":"analyst@demo.local","password":"analyst"}' | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null || true)
  if [ -n "$tok" ]; then
    BEARER="$tok"
    echo "e2e-smoke: using Supabase access token"
  else
    echo "e2e-smoke: password grant failed — run ./scripts/supabase-seed-auth.sh" >&2
    exit 1
  fi
fi

echo "e2e-smoke: starting Go services"
start_if_down 8080 "$root/services/platform-api"
start_if_down 8081 "$root/services/ontology-service"
start_if_down 8082 "$root/services/ingestion-service"
start_if_down 8083 "$root/services/rules-engine"
start_if_down 8084 "$root/services/case-service"

hdr=(-H "Content-Type: application/json")
if [ -n "$BEARER" ]; then
  hdr+=(-H "Authorization: Bearer $BEARER")
else
  hdr+=(-H "X-Tenant-Id: $TENANT")
  echo "e2e-smoke: warn — no Supabase token; using X-Tenant-Id (OIDC_REQUIRED=false path)"
fi

echo "e2e-smoke: manifest"
manifest_json=$(curl -sf "${hdr[@]}" "http://localhost:8081/v1/ontology/v2/manifest") || {
  echo "e2e-smoke: manifest request failed (is ontology-service on :8081? run make ontology-sync)"
  exit 1
}
domain=$(echo "$manifest_json" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('domain') or d.get('data',{}).get('domain',''))")
if [ "$domain" != "enterprise-operations" ]; then
  echo "e2e-smoke: expected domain enterprise-operations, got '$domain' body=$(echo "$manifest_json" | head -c 200)"
  exit 1
fi

echo "e2e-smoke: ontology objects"
obj_resp=$(curl -sf "${hdr[@]}" "http://localhost:8081/v1/objects/Signal")
if [ -z "$obj_resp" ]; then
  echo "e2e-smoke: empty Signal response (token expired?)" >&2
  exit 1
fi
signals=$(echo "$obj_resp" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('data',d).get('items',[])))")
assets=$(curl -sf "${hdr[@]}" "http://localhost:8081/v1/objects/Asset" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('data',d).get('items',[])))")
if [ "${signals:-0}" -lt 1 ] || [ "${assets:-0}" -lt 1 ]; then
  echo "e2e-smoke: expected seeded Signal and Asset objects"
  exit 1
fi

echo "e2e-smoke: rules evaluate"
curl -sf -X POST "${hdr[@]}" "http://localhost:8083/v1/evaluate" -d '{}' >/dev/null

if [ "${E2E_FULL:-0}" = "1" ]; then
  echo "e2e-smoke: operational loop (full)"
  signal_pk=$(curl -sf "${hdr[@]}" "http://localhost:8081/v1/objects/Signal" | python3 -c "
import sys,json
d=json.load(sys.stdin)
items=d.get('data',d).get('items',[])
print(items[0]['primaryKey'] if items else '')
")
  if [ -z "$signal_pk" ]; then
    echo "e2e-smoke: no signals for full loop"
    exit 1
  fi
  open_resp=$(curl -sf -X POST "${hdr[@]}" "http://localhost:8081/v1/actions/OpenCase" \
    -d "{\"title\":\"e2e-smoke case\",\"signalIds\":[\"$signal_pk\"]}")
  case_id=$(echo "$open_resp" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',d).get('caseId',''))")
  if [ -z "$case_id" ]; then
    echo "e2e-smoke: OpenCase missing caseId"
    exit 1
  fi
  linked=$(curl -sf "${hdr[@]}" "http://localhost:8084/v1/cases/$case_id" | python3 -c "
import sys,json
d=json.load(sys.stdin)
data=d.get('data',d)
sids=data.get('signalIds',[])
print('1' if '$signal_pk' in sids else '0')
")
  if [ "$linked" != "1" ]; then
    echo "e2e-smoke: expected case_signals link for signal=$signal_pk case=$case_id"
    exit 1
  fi
  curl -sf -X POST "${hdr[@]}" "http://localhost:8081/v1/actions/RecordDecision" \
    -d "{\"caseId\":\"$case_id\",\"outcome\":\"reviewed\",\"rationale\":\"e2e-smoke\"}" >/dev/null
  audit_n=$(curl -sf "${hdr[@]}" "http://localhost:8080/v1/audit/events?resourceType=Case&resourceId=$case_id" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('data',d).get('items',[])))")
  if [ "${audit_n:-0}" -lt 2 ]; then
    echo "e2e-smoke: expected >=2 audit events for case, got $audit_n"
    exit 1
  fi
  sum=$(curl -sf -X POST "${hdr[@]}" "http://localhost:8081/v1/functions/summarizeCaseContext" \
    -d "{\"caseId\":\"$case_id\"}" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',d).get('summary',''))")
  if [ -z "$sum" ]; then
    echo "e2e-smoke: summarizeCaseContext empty"
    exit 1
  fi
  echo "e2e-smoke: loop ok case=$case_id signal=$signal_pk audit=$audit_n"
  echo "e2e-smoke: ingestion job (full)"
  job=$(curl -sf -X POST "${hdr[@]}" "http://localhost:8082/v1/jobs" -d '{"connector":"seed-csv"}' | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',d).get('jobId',''))")
  if [ -n "$job" ]; then
    n=0
    while [ "$n" -lt 30 ]; do
      st=$(curl -sf "${hdr[@]}" "http://localhost:8082/v1/jobs/$job" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',d).get('status',''))")
      if [ "$st" = "completed" ] || [ "$st" = "failed" ]; then
        echo "e2e-smoke: job $job status=$st"
        break
      fi
      n=$((n + 1))
      sleep 2
    done
  fi
fi

echo "e2e-smoke: cases"
cases=$(curl -sf "${hdr[@]}" "http://localhost:8084/v1/cases" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('data',d).get('items',[])))")
if [ "${cases:-0}" -lt 1 ]; then
  echo "e2e-smoke: expected at least one case"
  exit 1
fi

if command -v clickhouse-client >/dev/null 2>&1; then
  obs_count=$(clickhouse-client --host localhost --user daemon --password daemon --query "SELECT count() FROM daemon.dataset_observations" 2>/dev/null || echo 0)
  if [ "${obs_count:-0}" -lt 1 ]; then
    echo "e2e-smoke: expected rows in dataset_observations"
    exit 1
  fi
  echo "e2e-smoke: clickhouse dataset_observations count=$obs_count"
else
  echo "e2e-smoke: skip clickhouse-client check (not installed)"
fi

echo "e2e-smoke: ok"
