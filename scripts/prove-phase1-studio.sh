#!/usr/bin/env bash
# prove-phase1-studio.sh — Phase 1: Ontology Studio Foundation
# Verifies: DB migrations, type system, ontology-builder service, CRUD, UI pages
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'
PASS=0; FAIL=0

ok()  { echo -e "${GREEN}PASS${NC}  $1"; PASS=$((PASS + 1)); }
fail(){ echo -e "${RED}FAIL${NC}  $1 — $2"; FAIL=$((FAIL + 1)); }
log() { echo -e "${CYAN}----${NC}  $1"; }

BASE="${BASE_URL:-http://localhost:8085}"
TENANT="tenant-studio-test"
WORKSPACE_ID=""

cleanup() {
  if [ -n "${WORKSPACE_ID:-}" ]; then
    curl -sf -X DELETE "$BASE/v1/workspaces/$WORKSPACE_ID" \
      -H "X-Tenant-Id: $TENANT" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

echo "=== Phase 1: Ontology Studio Foundation ==="

# ── 1. Service Health ───────────────────────────────────────
log "1. Service health check"
if curl -sf "$BASE/health" | grep -q "ontology-builder"; then
  ok "ontology-builder healthy"
else
  fail "ontology-builder not reachable at $BASE/health" "Start: make run-ontology-builder"
fi

# ── 2. Database Migrations ──────────────────────────────────
log "2. Database migrations"
for table in ontology_workspaces ontology_object_types ontology_properties \
  ontology_link_types ontology_action_types ontology_action_params \
  ontology_versions ontology_templates; do
  if curl -sf "$BASE/v1/health/db?table=$table" -H "X-Tenant-Id: $TENANT" | grep -q "exists"; then
    ok "table $table exists"
  else
    fail "table $table" "Run: make migrate-ontology-builder"
  fi
done

# ── 3. Extended Type System ─────────────────────────────────
log "3. Extended property types (Zod schemas)"
cd "$ROOT/packages/ontology-language"
TYPES=$(pnpm --filter @daemon/ontology-language exec tsx -e "
  const { Property, ActionParameter } = require('./dist/types/object-type.js');
  const types = ['string','number','boolean','date','timestamp','enum','geo_point','reference','array','json'];
  types.forEach(t => console.log(t));
" 2>/dev/null || echo "")
if echo "$TYPES" | grep -q "geo_point"; then ok "geo_point property type"; else fail "geo_point" "Check object-type.ts"; fi
if echo "$TYPES" | grep -q "reference"; then ok "reference property type"; else fail "reference" "Check object-type.ts"; fi
if echo "$TYPES" | grep -q "array"; then ok "array property type"; else fail "array" "Check object-type.ts"; fi
if echo "$TYPES" | grep -q "json"; then ok "json property type"; else fail "json" "Check object-type.ts"; fi

# ── 4. Workspace CRUD ───────────────────────────────────────
log "4. Workspace CRUD endpoints"

# Create
RESP=$(curl -sf -X POST "$BASE/v1/workspaces" \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: $TENANT" \
  -d '{"name":"Phase1 Test Workspace","description":"Auto-created by prove script"}')
WORKSPACE_ID=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['workspaceId'])" 2>/dev/null || echo "")
if [ -n "$WORKSPACE_ID" ]; then ok "POST workspace → $WORKSPACE_ID"; else fail "POST workspace" "$RESP"; fi

# List
LIST=$(curl -sf "$BASE/v1/workspaces" -H "X-Tenant-Id: $TENANT")
if echo "$LIST" | python3 -c "import sys,json; d=json.load(sys.stdin); assert len(d['workspaces'])>0" 2>/dev/null; then
  ok "GET workspaces list"
else
  fail "GET workspaces" "$LIST"
fi

# Get
WS=$(curl -sf "$BASE/v1/workspaces/$WORKSPACE_ID" -H "X-Tenant-Id: $TENANT")
if echo "$WS" | grep -q "Phase1"; then ok "GET workspace detail"; else fail "GET workspace" "$WS"; fi

# Update
curl -sf -X PUT "$BASE/v1/workspaces/$WORKSPACE_ID" \
  -H "Content-Type: application/json" -H "X-Tenant-Id: $TENANT" \
  -d '{"description":"Updated description"}' >/dev/null
ok "PUT workspace update"

# ── 5. Object Type CRUD ─────────────────────────────────────
log "5. Object type CRUD + properties"

OBJ_RESP=$(curl -sf -X POST "$BASE/v1/workspaces/$WORKSPACE_ID/objects" \
  -H "Content-Type: application/json" -H "X-Tenant-Id: $TENANT" \
  -d '{"apiName":"TestAsset","displayName":"Test Asset","primaryKey":"asset_id","titleProperty":"name","properties":[{"name":"asset_id","type":"string","required":true},{"name":"name","type":"string","required":true},{"name":"location","type":"geo_point","required":false},{"name":"tags","type":"array","required":false,"config":{"items":{"type":"string"}}}]}')
OBJ_ID=$(echo "$OBJ_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])" 2>/dev/null || echo "")
if [ -n "$OBJ_ID" ]; then ok "POST object type → $OBJ_ID"; else fail "POST object type" "$OBJ_RESP"; fi

# Add property
curl -sf -X POST "$BASE/v1/workspaces/$WORKSPACE_ID/objects/$OBJ_ID/properties" \
  -H "Content-Type: application/json" -H "X-Tenant-Id: $TENANT" \
  -d '{"name":"owner","type":"reference","required":false,"config":{"targetObjectType":"Organization"}}' >/dev/null
ok "POST property (reference type)"

# List objects
OBJS=$(curl -sf "$BASE/v1/workspaces/$WORKSPACE_ID/objects" -H "X-Tenant-Id: $TENANT")
if echo "$OBJS" | grep -q "TestAsset"; then ok "GET object types list"; else fail "GET objects" "$OBJS"; fi

# ── 6. Link Type CRUD ───────────────────────────────────────
log "6. Link type CRUD"

LINK_RESP=$(curl -sf -X POST "$BASE/v1/workspaces/$WORKSPACE_ID/links" \
  -H "Content-Type: application/json" -H "X-Tenant-Id: $TENANT" \
  -d '{"apiName":"TestAssetToOrg","displayName":"Asset to Org","fromObjectType":"TestAsset","toObjectType":"Organization","cardinality":"MANY_TO_ONE"}')
LINK_ID=$(echo "$LINK_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])" 2>/dev/null || echo "")
if [ -n "$LINK_ID" ]; then ok "POST link type → $LINK_ID"; else fail "POST link type" "$LINK_RESP"; fi

# ── 7. Action Type CRUD ─────────────────────────────────────
log "7. Action type CRUD"

ACT_RESP=$(curl -sf -X POST "$BASE/v1/workspaces/$WORKSPACE_ID/actions" \
  -H "Content-Type: application/json" -H "X-Tenant-Id: $TENANT" \
  -d '{"apiName":"TagAsset","displayName":"Tag Asset","targetObjectType":"TestAsset","requiresApproval":false,"parameters":[{"name":"tag","type":"string","required":true}]}')
ACT_ID=$(echo "$ACT_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])" 2>/dev/null || echo "")
if [ -n "$ACT_ID" ]; then ok "POST action type → $ACT_ID"; else fail "POST action type" "$ACT_RESP"; fi

# ── 8. Validation ───────────────────────────────────────────
log "8. Workspace validation"

VAL=$(curl -sf -X POST "$BASE/v1/workspaces/$WORKSPACE_ID/validate" \
  -H "Content-Type: application/json" -H "X-Tenant-Id: $TENANT")
if echo "$VAL" | python3 -c "import sys,json; d=json.load(sys.stdin); assert d['valid']==True" 2>/dev/null; then
  ok "validate workspace → valid"
else
  fail "validate workspace" "$VAL"
fi

# ── 9. Compile Preview ──────────────────────────────────────
log "9. Compile preview"

PREVIEW=$(curl -sf -X POST "$BASE/v1/workspaces/$WORKSPACE_ID/compile/preview" \
  -H "Content-Type: application/json" -H "X-Tenant-Id: $TENANT")
if echo "$PREVIEW" | python3 -c "import sys,json; d=json.load(sys.stdin); assert 'compiledManifest' in d" 2>/dev/null; then
  ok "compile preview → manifest generated"
else
  fail "compile preview" "$PREVIEW"
fi

# ── 10. Template List ───────────────────────────────────────
log "10. Template gallery"

TMPS=$(curl -sf "$BASE/v1/templates" -H "X-Tenant-Id: $TENANT")
TMP_COUNT=$(echo "$TMPS" | python3 -c "import sys,json; print(len(json.load(sys.stdin)['templates']))" 2>/dev/null || echo "0")
if [ "$TMP_COUNT" -gt 0 ]; then ok "templates available: $TMP_COUNT"; else fail "templates empty" "Run: make seed-ontology-templates"; fi

# ── 11. Clone from Template ─────────────────────────────────
log "11. Clone workspace from template"

if [ "$TMP_COUNT" -gt 0 ]; then
  TMP_ID=$(echo "$TMPS" | python3 -c "import sys,json; print(json.load(sys.stdin)['templates'][0]['id'])" 2>/dev/null)
  CLONE=$(curl -sf -X POST "$BASE/v1/workspaces" \
    -H "Content-Type: application/json" -H "X-Tenant-Id: $TENANT" \
    -d "{\"name\":\"Cloned from template\",\"baseTemplateId\":\"$TMP_ID\"}")
  if echo "$CLONE" | grep -q "workspaceId"; then
    CLONE_ID=$(echo "$CLONE" | python3 -c "import sys,json; print(json.load(sys.stdin)['workspaceId'])" 2>/dev/null)
    # Verify it has objects from template
    CLONE_OBJS=$(curl -sf "$BASE/v1/workspaces/$CLONE_ID/objects" -H "X-Tenant-Id: $TENANT")
    CLONE_O_COUNT=$(echo "$CLONE_OBJS" | python3 -c "import sys,json; print(len(json.load(sys.stdin)['objectTypes']))" 2>/dev/null || echo "0")
    ok "clone template → $CLONE_ID ($CLONE_O_COUNT objects)"
    # cleanup clone
    curl -sf -X DELETE "$BASE/v1/workspaces/$CLONE_ID" -H "X-Tenant-Id: $TENANT" >/dev/null 2>&1 || true
  else
    fail "clone template" "$CLONE"
  fi
fi

# ── 12. Studio UI Pages ─────────────────────────────────────
log "12. Studio UI pages"

UI_BASE="${UI_BASE_URL:-http://localhost:3000}"
STUDIO_PAGES=(
  "/studio"
  "/studio/objects"
  "/studio/links"
  "/studio/actions"
  "/studio/compile"
)
for path in "${STUDIO_PAGES[@]}"; do
  if curl -sf -o /dev/null "$UI_BASE$path" 2>/dev/null; then
    ok "UI page $path"
  else
    fail "UI page $path" "Start: make dev (console-web)"
  fi
done

# ── Summary ─────────────────────────────────────────────────
echo ""
echo "Phase 1: $PASS passed, $FAIL failed"
if [ $FAIL -gt 0 ]; then
  echo "Some checks failed — review output above."
  exit 1
else
  echo "Phase 1 foundation complete."
fi
