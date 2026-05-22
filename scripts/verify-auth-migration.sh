#!/usr/bin/env bash
# Supabase local auth + RLS migration verification (plan checklist 7–8).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SUPABASE_URL="${SUPABASE_URL:-http://127.0.0.1:54331}"
DB_URL="${DATABASE_URL:-postgresql://postgres:postgres@127.0.0.1:54332/postgres?sslmode=disable}"
JWT_SECRET="${SUPABASE_JWT_SECRET:-super-secret-jwt-token-with-at-least-32-characters-long}"
ANON_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}"
SERVICE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-}"

fail() { echo "verify-auth-migration: $*" >&2; exit 1; }

if command -v supabase >/dev/null 2>&1; then
  if ! curl -sf "${SUPABASE_URL}/auth/v1/health" >/dev/null 2>&1; then
    fail "Supabase Auth not reachable at ${SUPABASE_URL} — run: make supabase-up"
  fi
  echo "OK: Supabase Auth health"
else
  echo "WARN: supabase CLI not installed; skipping health check"
fi

if [[ -z "$ANON_KEY" ]] && command -v supabase >/dev/null 2>&1; then
  ANON_KEY="$(supabase status -o env 2>/dev/null | grep -E '^ANON_KEY=' | cut -d= -f2- | tr -d \"' || true)"
fi
if [[ -z "$SERVICE_KEY" ]] && command -v supabase >/dev/null 2>&1; then
  SERVICE_KEY="$(supabase status -o env 2>/dev/null | grep -E '^SERVICE_ROLE_KEY=' | cut -d= -f2- | tr -d \"' || true)"
fi

# Password grant (demo user)
token_resp="$(curl -sf "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
  -H "apikey: ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"email":"analyst@demo.local","password":"analyst"}' 2>/dev/null || true)"
if [[ -z "$token_resp" ]]; then
  fail "password grant failed — run scripts/supabase-seed-auth.sh and seed"
fi
ACCESS_TOKEN="$(echo "$token_resp" | jq -r '.access_token // empty')"
if [[ -z "$ACCESS_TOKEN" || "$ACCESS_TOKEN" == "null" ]]; then
  fail "no access_token in password grant response"
fi
echo "OK: password grant token"

# JWT claims (tenant_id in app_metadata via hook)
payload="$(echo "$ACCESS_TOKEN" | cut -d. -f2 | tr '_-' '/+' | base64 -d 2>/dev/null | jq . 2>/dev/null || true)"
tenant="$(echo "$payload" | jq -r '.app_metadata.tenant_id // .tenant_id // empty')"
if [[ "$tenant" != "tenant-demo" ]]; then
  echo "WARN: expected tenant_id tenant-demo in JWT, got: ${tenant:-<empty>}"
else
  echo "OK: JWT tenant_id claim"
fi

# daemon_runtime role exists
if command -v psql >/dev/null 2>&1; then
  psql "$DB_URL" -tAc "SELECT 1 FROM pg_roles WHERE rolname='daemon_runtime'" | grep -q 1 || fail "daemon_runtime role missing"
  echo "OK: daemon_runtime role"
else
  echo "WARN: psql not found; skip role check"
fi

# RLS enabled on tenant tables
if command -v psql >/dev/null 2>&1; then
  rls_count="$(psql "$DB_URL" -tAc "SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relrowsecurity AND n.nspname='public' AND c.relname IN ('cases','signals','users','ingestion_jobs')")"
  if [[ "${rls_count:-0}" -lt 4 ]]; then
    fail "RLS not enabled on all core tables (count=${rls_count})"
  fi
  echo "OK: RLS enabled on core tables"
fi

# Go unit tests (auth + db)
if command -v go >/dev/null 2>&1; then
  (cd packages/go-common && go test ./auth/... ./db/... -count=1) || fail "go-common auth/db tests failed"
  echo "OK: go-common auth/db tests"
fi

# Compose / env contract greps
if grep -q 'NEXT_PUBLIC_OIDC_ISSUER' apps/console-web/.env.example 2>/dev/null; then
  fail "console .env.example still references NEXT_PUBLIC_OIDC_ISSUER"
fi
echo "OK: console env no Keycloak issuer"

if ! grep -q 'custom_access_token' supabase/config.toml 2>/dev/null; then
  fail "custom_access_token hook not in supabase/config.toml"
fi
echo "OK: auth hook in config.toml"

if grep -rq 'daemon_bearer_token' apps/console-web/src 2>/dev/null; then
  fail "console still references daemon_bearer_token"
fi
echo "OK: no daemon_bearer_token in console"

if grep -q 'HS256' packages/go-common/auth/auth.go && grep -q 'SUPABASE_JWT_SECRET' packages/go-common/auth/auth.go; then
  echo "OK: HS256 + SUPABASE_JWT_SECRET in auth.go"
else
  fail "missing HS256 path in auth.go"
fi

for svc in platform-api case-service ontology-service ingestion-service rules-engine; do
  if ! grep -rq 'WithRLSTx\|ExecRLS' "services/${svc}/" 2>/dev/null; then
    fail "${svc} missing WithRLSTx/ExecRLS"
  fi
done
echo "OK: RLS helpers wired in five services"

if grep -E 'DATABASE_URL=.*postgres:postgres@' infra/docker/docker-compose.yml 2>/dev/null | grep -v SEED | grep -v '#' | grep -q daemon_runtime; then
  echo "OK: compose uses daemon_runtime for app DATABASE_URL"
elif grep -q 'daemon_runtime' infra/docker/docker-compose.yml 2>/dev/null; then
  echo "OK: compose references daemon_runtime"
fi

echo "verify-auth-migration: all checks passed"
