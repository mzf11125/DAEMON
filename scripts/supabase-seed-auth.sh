#!/usr/bin/env bash
# Create demo Auth users and print SUPABASE_DEMO_USER_ID for infra/seed.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SUPABASE_URL="${SUPABASE_URL:-http://127.0.0.1:54331}"
SERVICE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-}"

if [[ -z "$SERVICE_KEY" ]] && command -v supabase >/dev/null 2>&1; then
  while IFS= read -r line; do
    case "$line" in
      SERVICE_ROLE_KEY=*) SERVICE_KEY="${line#SERVICE_ROLE_KEY=}" ;;
    esac
  done < <(supabase status -o env 2>/dev/null || true)
  SERVICE_KEY="${SERVICE_KEY//\"/}"
fi

if [[ -z "$SERVICE_KEY" ]]; then
  echo "supabase-seed-auth: set SUPABASE_SERVICE_ROLE_KEY or run 'supabase start' first" >&2
  exit 1
fi

create_user() {
  local email="$1"
  local password="$2"
  local tenant_id="$3"
  local roles_json="$4"
  curl -sf "${SUPABASE_URL}/auth/v1/admin/users" \
    -H "apikey: ${SERVICE_KEY}" \
    -H "Authorization: Bearer ${SERVICE_KEY}" \
    -H "Content-Type: application/json" \
    -d "$(jq -n \
      --arg email "$email" \
      --arg password "$password" \
      --arg tenant "$tenant_id" \
      --argjson roles "$roles_json" \
      '{email: $email, password: $password, email_confirm: true, app_metadata: {tenant_id: $tenant, roles: $roles}}')"
}

roles_json='["analyst","lead"]'
resp="$(create_user "analyst@demo.local" "analyst" "tenant-demo" "$roles_json")" || {
  echo "supabase-seed-auth: failed to create analyst@demo.local (user may already exist)" >&2
  resp="$(curl -sf "${SUPABASE_URL}/auth/v1/admin/users?email=analyst@demo.local" \
    -H "apikey: ${SERVICE_KEY}" \
    -H "Authorization: Bearer ${SERVICE_KEY}")"
}

user_id="$(echo "$resp" | jq -r '.id // .users[0].id // empty')"
if [[ -z "$user_id" || "$user_id" == "null" ]]; then
  echo "supabase-seed-auth: could not resolve user id" >&2
  echo "$resp" >&2
  exit 1
fi

echo "SUPABASE_DEMO_USER_ID=$user_id"
echo "Export before seed: export SUPABASE_DEMO_USER_ID=$user_id"
echo "Login: analyst@demo.local / analyst"
