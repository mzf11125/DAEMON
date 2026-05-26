#!/usr/bin/env bash
# prove-phase3-studio.sh — Phase 3: Rule Designer + Template Marketplace
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'
PASS=0; FAIL=0

ok()  { echo -e "${GREEN}PASS${NC}  $1"; PASS=$((PASS + 1)); }
fail(){ echo -e "${RED}FAIL${NC}  $1 — $2"; FAIL=$((FAIL + 1)); }
log() { echo -e "${CYAN}----${NC}  $1"; }

BUILDER="${BUILDER_URL:-http://localhost:8085}"
TENANT="tenant-phase3-test"
WORKSPACE_ID=""

cleanup() {
  [ -n "${WORKSPACE_ID:-}" ] && curl -sf -X DELETE "$BUILDER/v1/workspaces/$WORKSPACE_ID" -H "X-Tenant-Id: $TENANT" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "=== Phase 3: Rule Designer + Template Marketplace ==="

log "1. Service health"
curl -sf "$BUILDER/health" | grep -q "ontology-builder" && ok "builder up" || fail "builder" "make run-ontology-builder"

log "2. DB: ontology_rules table"
curl -sf "$BUILDER/health/db?table=ontology_rules" -H "X-Tenant-Id: $TENANT" >/dev/null 2>&1 && ok "table exists" || fail "table" "missing ontology_rules"

log "3. Rule CRUD"
WS=$(curl -sf -X POST "$BUILDER/v1/workspaces" -H "Content-Type: application/json" -H "X-Tenant-Id: $TENANT" -d '{"name":"Phase3"}')
WORKSPACE_ID=$(echo "$WS" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])" 2>/dev/null)

# Add object first
curl -sf -X POST "$BUILDER/v1/workspaces/$WORKSPACE_ID/objects" -H "Content-Type: application/json" -H "X-Tenant-Id: $TENANT" \
  -d '{"apiName":"Fleet","displayName":"Fleet","primaryKey":"fleet_id","titleProperty":"fleet_id","properties":[{"name":"fleet_id","type":"string","required":true},{"name":"readiness","type":"enum","required":true,"config":{"values":["GREEN","AMBER","RED"]}},{"name":"drone_count","type":"number"}]}' >/dev/null

# Create rule
RULE=$(curl -sf -X POST "$BUILDER/v1/workspaces/$WORKSPACE_ID/rules" -H "Content-Type: application/json" -H "X-Tenant-Id: $TENANT" \
  -d '{"apiName":"FleetNotReady","displayName":"Fleet Not Ready","sourceObjectType":"Fleet","schedule":"*/15 * * * *","conditionLogic":"AND","conditions":[{"field":"readiness","op":"eq","value":"RED"},{"field":"drone_count","op":"lt","value":3}],"signal":{"severity":"HIGH","titleTemplate":"Fleet {{fleet_id}} not ready"}}')
RULE_ID=$(echo "$RULE" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])" 2>/dev/null)
[ -n "$RULE_ID" ] && ok "rule created: $RULE_ID" || fail "rule create" "$RULE"

# List rules
RULES=$(curl -sf "$BUILDER/v1/workspaces/$WORKSPACE_ID/rules" -H "X-Tenant-Id: $TENANT")
echo "$RULES" | grep -q "FleetNotReady" && ok "rule listed" || fail "rule list" "$RULES"

# Compile rule → JSON
COMPILED=$(curl -sf "$BUILDER/v1/workspaces/$WORKSPACE_ID/rules/$RULE_ID/compile" -H "X-Tenant-Id: $TENANT")
echo "$COMPILED" | python3 -c "import sys,json; d=json.load(sys.stdin); assert 'conditions' in d" 2>/dev/null && ok "rule compiled → JSON" || fail "rule compile" "$COMPILED"

log "4. Template marketplace"
# Save workspace as template
TMP=$(curl -sf -X POST "$BUILDER/v1/templates" -H "Content-Type: application/json" -H "X-Tenant-Id: $TENANT" \
  -d '{"workspaceId":"'"$WORKSPACE_ID"'","name":"test-fleet','displayName":"Test Fleet","description":"Phase 3 test"}" 2>/dev/null || echo "")
echo "$TMP" | grep -q '"id"' && ok "template saved" || fail "template save" "$TMP"

# Clone from template
TMPS=$(curl -sf "$BUILDER/v1/templates" -H "X-Tenant-Id: $TENANT")
TMP_ID=$(echo "$TMPS" | python3 -c "import sys,json; d=json.load(sys.stdin); items=[t for t in d.get('templates',[]) if t['name']=='test-fleet']; print(items[0]['id'] if items else '')" 2>/dev/null)
if [ -n "$TMP_ID" ]; then
  CLONE=$(curl -sf -X POST "$BUILDER/v1/workspaces" -H "Content-Type: application/json" -H "X-Tenant-Id: $TENANT" \
    -d "{\"name\":\"Cloned Fleet\",\"baseTemplateId\":\"$TMP_ID\"}")
  CLONE_ID=$(echo "$CLONE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
  [ -n "$CLONE_ID" ] && ok "cloned from template: $CLONE_ID" || fail "clone" "$CLONE"
  curl -sf -X DELETE "$BUILDER/v1/workspaces/${CLONE_ID}" -H "X-Tenant-Id: $TENANT" >/dev/null 2>&1 || true
fi

log "5. Import/Export"
# Export workspace
EXPORT=$(curl -sf "$BUILDER/v1/workspaces/$WORKSPACE_ID/export" -H "X-Tenant-Id: $TENANT")
echo "$EXPORT" | python3 -c "import sys,json; d=json.load(sys.stdin); assert 'manifest' in d; assert 'rules' in d" 2>/dev/null && ok "export: manifest + rules" || fail "export" "$EXPORT"

# Import into new workspace
IMPORT=$(curl -sf -X POST "$BUILDER/v1/workspaces/import" -H "Content-Type: application/json" -H "X-Tenant-Id: $TENANT" \
  -d "$EXPORT")
IMPORT_ID=$(echo "$IMPORT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
[ -n "$IMPORT_ID" ] && ok "imported workspace" || fail "import" "$IMPORT"
curl -sf -X DELETE "$BUILDER/v1/workspaces/${IMPORT_ID}" -H "X-Tenant-Id: $TENANT" >/dev/null 2>&1 || true

log "6. Rule Designer UI"
UI="${UI_BASE_URL:-http://localhost:3000}"
curl -sf "$UI/studio/rules?workspace=$WORKSPACE_ID" | grep -q "Rule" 2>/dev/null && ok "UI rules page renders" || fail "UI rules" "check console-web"
curl -sf "$UI/studio/templates" | grep -q "Templates" 2>/dev/null && ok "UI templates page renders" || fail "UI templates" "check console-web"

echo ""
echo "Phase 3: $PASS passed, $FAIL failed"
[ $FAIL -gt 0 ] && exit 1 || echo "Phase 3 complete."
