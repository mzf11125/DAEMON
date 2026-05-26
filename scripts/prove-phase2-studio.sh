#!/usr/bin/env bash
# prove-phase2-studio.sh — Phase 2: Compilation, Publish, Hot-Reload
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'
PASS=0; FAIL=0

ok()  { echo -e "${GREEN}PASS${NC}  $1"; PASS=$((PASS + 1)); }
fail(){ echo -e "${RED}FAIL${NC}  $1 — $2"; FAIL=$((FAIL + 1)); }
log() { echo -e "${CYAN}----${NC}  $1"; }

BUILDER="${BUILDER_URL:-http://localhost:8085}"
ONTOLOGY="${ONTOLOGY_URL:-http://localhost:8081}"
TENANT="tenant-phase2-test"
WORKSPACE_ID=""
COMPILED_DIR=""

cleanup() {
  if [ -n "${WORKSPACE_ID:-}" ]; then
    curl -sf -X DELETE "$BUILDER/v1/workspaces/$WORKSPACE_ID" -H "X-Tenant-Id: $TENANT" >/dev/null 2>&1 || true
  fi
  if [ -n "${COMPILED_DIR:-}" ] && [ -d "$COMPILED_DIR" ]; then
    rm -rf "$COMPILED_DIR" 2>/dev/null || true
  fi
}
trap cleanup EXIT

echo "=== Phase 2: Compilation, Publish, Hot-Reload ==="

# ── 1. Service Health ───────────────────────────────────────
log "1. Service health"
curl -sf "$BUILDER/health" | grep -q "ontology-builder" && ok "ontology-builder up" || fail "builder" "make run-ontology-builder"
curl -sf "$ONTOLOGY/health" | grep -q "ontology-service" && ok "ontology-service up" || fail "ontology-service" "make run-ontology-service"

# ── 2. Create workspace with real object types ──────────────
log "2. Create workspace with objects, link, action"

WS=$(curl -sf -X POST "$BUILDER/v1/workspaces" -H "Content-Type: application/json" -H "X-Tenant-Id: $TENANT" \
  -d '{"name":"Phase2 Test"}')
WORKSPACE_ID=$(echo "$WS" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])" 2>/dev/null || echo "")
[ -n "$WORKSPACE_ID" ] && ok "workspace created" || fail "workspace" "$WS"

# Add object type
curl -sf -X POST "$BUILDER/v1/workspaces/$WORKSPACE_ID/objects" \
  -H "Content-Type: application/json" -H "X-Tenant-Id: $TENANT" \
  -d '{"apiName":"TestFleet","displayName":"Test Fleet","primaryKey":"fleet_id","titleProperty":"fleet_id","properties":[{"name":"fleet_id","type":"string","required":true},{"name":"location","type":"geo_point"},{"name":"status","type":"enum","required":false,"config":{"values":["GREEN","AMBER","RED"]}}]}' >/dev/null
ok "object type created"

# Add link type
curl -sf -X POST "$BUILDER/v1/workspaces/$WORKSPACE_ID/links" \
  -H "Content-Type: application/json" -H "X-Tenant-Id: $TENANT" \
  -d '{"apiName":"FleetToSite","displayName":"Fleet to Site","fromObjectType":"TestFleet","toObjectType":"Site","cardinality":"MANY_TO_ONE"}' >/dev/null
ok "link type created"

# Add action type
curl -sf -X POST "$BUILDER/v1/workspaces/$WORKSPACE_ID/actions" \
  -H "Content-Type: application/json" -H "X-Tenant-Id: $TENANT" \
  -d '{"apiName":"ScrambleFleet","displayName":"Scramble Fleet","targetObjectType":"TestFleet","parameters":[{"name":"reason","type":"string","required":true}]}' >/dev/null
ok "action type created"

# ── 3. Validate ─────────────────────────────────────────────
log "3. Validate workspace"
VAL=$(curl -sf -X POST "$BUILDER/v1/workspaces/$WORKSPACE_ID/validate" \
  -H "Content-Type: application/json" -H "X-Tenant-Id: $TENANT")
echo "$VAL" | python3 -c "import sys,json; assert json.load(sys.stdin)['valid']==True" 2>/dev/null \
  && ok "validation passed" || fail "validation" "$VAL"

# ── 4. Incremental Compile → disk ──────────────────────────
log "4. Incremental compile to disk"
COMPILE=$(curl -sf -X POST "$BUILDER/v1/workspaces/$WORKSPACE_ID/compile" \
  -H "Content-Type: application/json" -H "X-Tenant-Id: $TENANT" \
  -d '{"changeSummary":"Initial workspace definition"}')
VERSION=$(echo "$COMPILE" | python3 -c "import sys,json; print(json.load(sys.stdin)['version'])" 2>/dev/null || echo "")
COMPILED_PATH=$(echo "$COMPILE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('compiledPath',''))" 2>/dev/null || echo "")

[ -n "$VERSION" ] && ok "compile → version $VERSION" || fail "compile" "$COMPILE"

if [ -n "$COMPILED_PATH" ]; then
  COMPILED_DIR="$COMPILED_PATH"
  [ -f "$COMPILED_PATH/manifest.json" ] && ok "manifest.json written" || fail "manifest" "not found at $COMPILED_PATH"
  [ -f "$COMPILED_PATH/object-types/TestFleet.json" ] && ok "TestFleet.json written" || fail "object file" "not found"
  [ -f "$COMPILED_PATH/link-types/FleetToSite.json" ] && ok "FleetToSite.json written" || fail "link file" "not found"
  [ -f "$COMPILED_PATH/action-types/ScrambleFleet.json" ] && ok "ScrambleFleet.json written" || fail "action file" "not found"
fi

# ── 5. Migration Preview ────────────────────────────────────
log "5. Migration DDL preview"
MIG=$(curl -sf -X POST "$BUILDER/v1/workspaces/$WORKSPACE_ID/migrations/preview" \
  -H "Content-Type: application/json" -H "X-Tenant-Id: $TENANT")
SQL_COUNT=$(echo "$MIG" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('sql',[])))" 2>/dev/null || echo "0")
[ "$SQL_COUNT" -gt 0 ] && ok "migration preview: $SQL_COUNT statements" || fail "migration" "$MIG"

# ── 6. Publish ──────────────────────────────────────────────
log "6. Publish workspace"
PUB=$(curl -sf -X POST "$BUILDER/v1/workspaces/$WORKSPACE_ID/publish" \
  -H "Content-Type: application/json" -H "X-Tenant-Id: $TENANT")
echo "$PUB" | python3 -c "import sys,json; assert json.load(sys.stdin)['status']=='published'" 2>/dev/null \
  && ok "workspace published" || fail "publish" "$PUB"

# ── 7. Hot-reload: ontology-service picks up new manifest ──
log "7. Hot-reload: ontology-service serves custom manifest"
sleep 2  # allow hot-reload to trigger
MANIFEST=$(curl -sf "$ONTOLOGY/v1/ontology/v2/manifest" -H "X-Tenant-Id: $TENANT" | python3 -c "import sys,json; print(json.dumps(json.load(sys.stdin)))" 2>/dev/null || echo "")
if echo "$MANIFEST" | grep -q "TestFleet"; then
  ok "ontology-service serves TestFleet"
else
  fail "hot-reload" "TestFleet not in manifest. Check ONTOLOGY_ROOT per-tenant."
fi

# ── 8. Version History ──────────────────────────────────────
log "8. Version history"
VERS=$(curl -sf "$BUILDER/v1/workspaces/$WORKSPACE_ID/versions" -H "X-Tenant-Id: $TENANT")
VER_COUNT=$(echo "$VERS" | python3 -c "import sys,json; print(len(json.load(sys.stdin)['versions']))" 2>/dev/null || echo "0")
[ "$VER_COUNT" -ge 1 ] && ok "versions available: $VER_COUNT" || fail "versions" "$VERS"

# ── 9. Version Diff ─────────────────────────────────────────
log "9. Version diff"
DIFF=$(curl -sf "$BUILDER/v1/workspaces/$WORKSPACE_ID/versions/${VERSION}/diff" \
  -H "X-Tenant-Id: $TENANT")
echo "$DIFF" | python3 -c "import sys,json; d=json.load(sys.stdin); assert 'current' in d" 2>/dev/null \
  && ok "version diff available" || fail "diff" "$DIFF"

# ── 10. UI: Compile dashboard renders migration preview ─────
log "10. UI compile dashboard with migration preview"
UI="${UI_BASE_URL:-http://localhost:3000}"
curl -sf "$UI/studio/compile?workspace=$WORKSPACE_ID" | grep -q "Migration" 2>/dev/null \
  && ok "UI compile page renders" || fail "UI compile" "check console-web is running"

# ── Summary ─────────────────────────────────────────────────
echo ""
echo "Phase 2: $PASS passed, $FAIL failed"
[ $FAIL -gt 0 ] && exit 1 || echo "Phase 2 compilation & publish complete."
