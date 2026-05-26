# DAEMON Ontology Studio — Architecture Blueprint v1.0

## 1. Vision

Self-service visual ontology builder. Operator/analyst defines domain model without engineers.
Time-to-first-model: minutes (clone pack) to hours (from scratch), vs competitors' weeks+FDE team.

## 2. Current System (Baseline)

```
ONTOLOGY V3 (authoring)                COMPILER                  ONTOLOGY V2-COMPILED (runtime)
├── manifest.yaml                      compile-schemas.ts        ├── manifest.json
├── object-types/*.yaml         →      (tsx script)       →      ├── object-types/*.json
├── link-types/*.yaml                  manual trigger             ├── link-types/*.json
├── action-types/*.yaml                                          ├── action-types/*.json
├── functions/*.json            (JSON passthrough)               ├── functions/*.json
├── rules/*.json                (JSON passthrough)               ├── rules/*.json
└── fixtures/*.json             (JSON passthrough)               └── fixtures/*.json
                                        │
                                        └── ontology-service reads v2-compiled at startup
                                            GET  /v1/ontology/v2/manifest
                                            GET  /v1/objects/{type}
                                            POST /v1/actions/{action}
```

### Existing type system (Zod schemas in `packages/ontology-language/src/types/`):

```
ObjectTypeDefinition {
  apiName, displayName, primaryKey, titleProperty
  properties: Property[]  // string | number | boolean | date | timestamp | enum
  description
}

LinkTypeDefinition {
  apiName, displayName
  fromObjectType, toObjectType
  cardinality: ONE_TO_ONE | ONE_TO_MANY | MANY_TO_ONE | MANY_TO_MANY
}

ActionTypeDefinition {
  apiName, displayName
  targetObjectType
  parameters: ActionParameter[]  // string | number | boolean | date | enum
  requiresApproval, description
}
```

### Existing type gaps (need extending for Studio):

- No `geo_point` property type (needed for maps)
- No `reference` property type (foreign key to another object)
- No `array` wrapper (e.g., `tags: string[]`)
- No `json` property type (free-form)
- No pre/post-conditions on actions
- No role-based visibility on properties

---

## 3. Ontology Studio Architecture

### 3.1 System Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                          CONSOLE-WEB (Next.js)                       │
│                                                                      │
│  ┌─────────────┐  ┌────────────┐  ┌───────────┐  ┌──────────────┐  │
│  │ /studio       │  │ /studio/   │  │ /studio/   │  │ /studio/      │  │
│  │ Dashboard     │  │ objects    │  │ links      │  │ actions        │  │
│  │ (workspace    │  │ (Object    │  │ (Link      │  │ (Action       │  │
│  │  list, clone, │  │  Designer) │  │  Designer) │  │  Designer)    │  │
│  │  templates)   │  │            │  │            │  │               │  │
│  └─────────────┘  └────────────┘  └───────────┘  └──────────────┘  │
│                                                                      │
│  ┌──────────┐  ┌─────────────┐  ┌─────────────────────────────────┐ │
│  │ /studio/ │  │ /studio/     │  │ /studio/rules                   │ │
│  │ rules    │  │ compile      │  │ (Rule Designer: block-based,    │ │
│  │ (list)   │  │ (publish,    │  │  visual condition builder)     │ │
│  │          │  │  validate)   │  │                                 │ │
│  └──────────┘  └─────────────┘  └─────────────────────────────────┘ │
└───────────────────────────────────┬──────────────────────────────────┘
                                    │ REST API
                                    ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    ONTOLOGY-BUILDER (new Go service :8085)           │
│                                                                      │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────────┐  │
│  │ Workspace API    │  │ Compile API      │  │ Publish API       │  │
│  │ CRUD object/     │  │ validate schema   │  │ workspace →       │  │
│  │ link/action types│  │ incremental diff  │  │ v2-compiled       │  │
│  │ per tenant       │  │ preview changes   │  │ + migration gen   │  │
│  └──────────────────┘  └──────────────────┘  └───────────────────┘  │
│                                                                      │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────────┐  │
│  │ Template API     │  │ Version API      │  │ Migration API     │  │
│  │ list/clone global│  │ version history   │  │ diff → DDL        │  │
│  │ pre-built packs  │  │ diff & rollback   │  │ preview & exec    │  │
│  └──────────────────┘  └──────────────────┘  └───────────────────┘  │
└───────────────────────────────────┬──────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
            ┌──────────┐    ┌──────────┐    ┌──────────┐
            │ Postgres │    │ Neo4j    │    │  Disk    │
            │ workspace│    │ graph    │    │ compiled │
            │ drafts   │    │ links    │    │ JSON     │
            │ versions │    │          │    │ /ontology│
            └──────────┘    └──────────┘    └──────────┘
```

### 3.2 New Property Types (extend `object-type.ts`)

```typescript
// NEW: Geo point
const GeoPointPropertySchema = PropertyBaseSchema.extend({
  type: z.literal('geo_point'),
});

// NEW: Reference to another object type
const ReferencePropertySchema = PropertyBaseSchema.extend({
  type: z.literal('reference'),
  targetObjectType: z.string().min(1),
});

// NEW: Array of any base type
const ArrayPropertySchema = PropertyBaseSchema.extend({
  type: z.literal('array'),
  items: z.object({
    type: z.enum(['string', 'number', 'boolean', 'date', 'timestamp', 'enum', 'reference']),
    values: z.array(z.string()).optional(),  // for enum items
    targetObjectType: z.string().optional(),  // for reference items
  }),
});

// NEW: Free-form JSON
const JsonPropertySchema = PropertyBaseSchema.extend({
  type: z.literal('json'),
});
```

### 3.3 Extended Action Type (extend `action-type.ts`)

```typescript
// NEW fields on ActionTypeDefinition
{
  preConditions: PreCondition[]   // validation before execution
  postConditions: PostCondition[] // state change after execution
  sideEffects: SideEffect[]       // neo4j links, audit, notifications
}

PreCondition {
  type: 'FIELD_NOT_NULL' | 'FIELD_EQUALS' | 'FIELD_IN' | 'OBJECT_EXISTS'
  field?: string
  value?: any
  targetObjectType?: string
}

PostCondition {
  type: 'SET_FIELD' | 'INCREMENT_FIELD' | 'CREATE_LINK' | 'AUDIT'
  field?: string
  value?: any
  linkType?: string
  targetObjectType?: string
}

SideEffect {
  type: 'CREATE_NEO4J_LINK' | 'SEND_NOTIFICATION' | 'TRIGGER_WEBHOOK'
  config: Record<string, any>
}
```

---

## 4. Database Schema

### 4.1 Workspace Tables (Postgres)

```sql
-- Per-tenant ontology workspace
CREATE TABLE ontology_workspaces (
    workspace_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id          TEXT NOT NULL,
    name               TEXT NOT NULL,                    -- display name
    description        TEXT,
    status             TEXT NOT NULL DEFAULT 'draft',   -- draft | published | archived
    base_manifest_id   UUID,                             -- cloned from this template
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at       TIMESTAMPTZ,
    UNIQUE(tenant_id, name)
);

-- Object types within a workspace
CREATE TABLE ontology_object_types (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id       UUID NOT NULL REFERENCES ontology_workspaces(id) ON DELETE CASCADE,
    api_name           TEXT NOT NULL,
    display_name       TEXT NOT NULL,
    primary_key        TEXT NOT NULL,
    title_property     TEXT NOT NULL,
    description        TEXT,
    icon               TEXT,                             -- icon name for UI
    category           TEXT,                             -- grouping in sidebar
    sort_order         INT NOT NULL DEFAULT 0,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(workspace_id, api_name)
);

-- Properties per object type (stored as JSONB for flexibility)
CREATE TABLE ontology_properties (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    object_type_id     UUID NOT NULL REFERENCES ontology_object_types(id) ON DELETE CASCADE,
    name               TEXT NOT NULL,
    type               TEXT NOT NULL,                    -- string | number | boolean | date | timestamp | enum | geo_point | reference | array | json
    required           BOOLEAN NOT NULL DEFAULT false,
    config             JSONB NOT NULL DEFAULT '{}',      -- { values: [], targetObjectType: "...", items: {...} }
    sort_order         INT NOT NULL DEFAULT 0,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(object_type_id, name)
);

-- Link types
CREATE TABLE ontology_link_types (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id       UUID NOT NULL REFERENCES ontology_workspaces(id) ON DELETE CASCADE,
    api_name           TEXT NOT NULL,
    display_name       TEXT NOT NULL,
    from_object_type   TEXT NOT NULL,                    -- apiName of source
    to_object_type     TEXT NOT NULL,                    -- apiName of target
    cardinality        TEXT NOT NULL DEFAULT 'MANY_TO_MANY',
    description        TEXT,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(workspace_id, api_name)
);

-- Action types
CREATE TABLE ontology_action_types (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id       UUID NOT NULL REFERENCES ontology_workspaces(id) ON DELETE CASCADE,
    api_name           TEXT NOT NULL,
    display_name       TEXT NOT NULL,
    target_object_type TEXT NOT NULL,
    requires_approval  BOOLEAN NOT NULL DEFAULT true,
    description        TEXT,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(workspace_id, api_name)
);

-- Action parameters (JSONB)
CREATE TABLE ontology_action_params (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_type_id     UUID NOT NULL REFERENCES ontology_action_types(id) ON DELETE CASCADE,
    name               TEXT NOT NULL,
    type               TEXT NOT NULL,                    -- string | number | boolean | date | enum
    required           BOOLEAN NOT NULL DEFAULT false,
    config             JSONB NOT NULL DEFAULT '{}',      -- { values: [] for enum }
    sort_order         INT NOT NULL DEFAULT 0,
    UNIQUE(action_type_id, name)
);

-- Version history
CREATE TABLE ontology_versions (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id       UUID NOT NULL REFERENCES ontology_workspaces(id) ON DELETE CASCADE,
    version            INT NOT NULL,
    snapshot           JSONB NOT NULL,                   -- full workspace state at this version
    change_summary     TEXT,                             -- human-readable diff
    published          BOOLEAN NOT NULL DEFAULT false,
    published_at       TIMESTAMPTZ,
    created_by         TEXT,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(workspace_id, version)
);

-- Global template library (pre-built packs, shared across tenants)
CREATE TABLE ontology_templates (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name               TEXT NOT NULL UNIQUE,
    display_name       TEXT NOT NULL,
    description        TEXT,
    category           TEXT,                             -- logistics | defense | finance | healthcare
    icon               TEXT,
    tags               TEXT[],
    source_workspace_id UUID,                            -- NULL for built-in templates
    visibility         TEXT NOT NULL DEFAULT 'public',   -- public | tenant-private
    owner_tenant_id    TEXT,
    snapshot           JSONB NOT NULL,                   -- full workspace snapshot
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 5. REST API Design (ontology-builder :8085)

### 5.1 Workspace CRUD

```
GET    /v1/workspaces                              list tenant's workspaces
POST   /v1/workspaces                              create new workspace
         { name, description, baseTemplateId? }
GET    /v1/workspaces/{workspaceId}                get workspace summary (object/link/action counts)
PUT    /v1/workspaces/{workspaceId}                update name/description
DELETE /v1/workspaces/{workspaceId}                delete workspace + all contents

POST   /v1/workspaces/{workspaceId}/clone          clone from another workspace or template
         { sourceWorkspaceId | sourceTemplateId, newName }
```

### 5.2 Object Type Editor

```
GET    /v1/workspaces/{workspaceId}/objects                       list all object types
POST   /v1/workspaces/{workspaceId}/objects                       create new object type
         { apiName, displayName, primaryKey, titleProperty, properties: [...] }
GET    /v1/workspaces/{workspaceId}/objects/{objectTypeId}        get single object type with properties
PUT    /v1/workspaces/{workspaceId}/objects/{objectTypeId}        update object type
DELETE /v1/workspaces/{workspaceId}/objects/{objectTypeId}        delete object type
         (cascades: delete linked props, check link references)

POST   /v1/workspaces/{workspaceId}/objects/{objectTypeId}/properties    add property
PUT    /v1/workspaces/{workspaceId}/objects/{objectTypeId}/properties/{propId}  update property
DELETE /v1/workspaces/{workspaceId}/objects/{objectTypeId}/properties/{propId}  delete property
POST   /v1/workspaces/{workspaceId}/objects/reorder              reorder objects
         { orderedIds: [...] }
```

### 5.3 Link Type Editor

```
GET    /v1/workspaces/{workspaceId}/links                         list all link types
POST   /v1/workspaces/{workspaceId}/links                         create link
GET    /v1/workspaces/{workspaceId}/links/{linkId}                get single
PUT    /v1/workspaces/{workspaceId}/links/{linkId}                update
DELETE /v1/workspaces/{workspaceId}/links/{linkId}                delete
```

### 5.4 Action Type Editor

```
GET    /v1/workspaces/{workspaceId}/actions                       list actions
POST   /v1/workspaces/{workspaceId}/actions                       create action
GET    /v1/workspaces/{workspaceId}/actions/{actionId}            get single
PUT    /v1/workspaces/{workspaceId}/actions/{actionId}            update
DELETE /v1/workspaces/{workspaceId}/actions/{actionId}            delete

POST   /v1/workspaces/{workspaceId}/actions/{actionId}/params     add param
PUT    /v1/workspaces/{workspaceId}/actions/{actionId}/params/{paramId}  update param
DELETE /v1/workspaces/{workspaceId}/actions/{actionId}/params/{paramId}  delete param
```

### 5.5 Validation & Compile

```
POST   /v1/workspaces/{workspaceId}/validate                      validate workspace
         → { valid: bool, errors: [{path, message}], warnings: [...] }

POST   /v1/workspaces/{workspaceId}/compile/preview               compile preview (don't persist)
         → { compiledManifest, newObjects: [...], changedObjects: [...], removedObjects: [...] }

POST   /v1/workspaces/{workspaceId}/compile                       compile + save version snapshot
         { changeSummary: "Added DroneFleet object, ScrambleFleet action" }
         → { version: 3, compiledPath: "/ontology/v2-compiled/tenant-{id}/" }

POST   /v1/workspaces/{workspaceId}/publish                       mark version as published
         → ontology-service hot-reloads
```

### 5.6 Versions & Rollback

```
GET    /v1/workspaces/{workspaceId}/versions                      list version history
GET    /v1/workspaces/{workspaceId}/versions/{version}/diff       diff between two versions
POST   /v1/workspaces/{workspaceId}/versions/{version}/rollback   rollback to version
```

### 5.7 Migration Preview

```
POST   /v1/workspaces/{workspaceId}/migrations/preview
         → { sql: ["ALTER TABLE ...", "CREATE TABLE ..."], estimatedDowntime: "0s" }
POST   /v1/workspaces/{workspaceId}/migrations/apply
         → { applied: [...], errors: [] }
```

### 5.8 Templates

```
GET    /v1/templates                                             list public templates
GET    /v1/templates/{templateId}                                get template details
POST   /v1/templates                                             save workspace as template
         { workspaceId, name, description, visibility }
```

---

## 6. Tenant Isolation & Security

### 6.1 Per-Tenant Ontology

Each tenant gets their own compiled ontology directory:

```
/ontology/v2-compiled/
├── tenant-demo/              ← default (built-in packs)
│   ├── manifest.json
│   ├── object-types/
│   ├── link-types/
│   └── action-types/
├── tenant-acme/              ← Acme Corp custom ontology
│   ├── manifest.json
│   └── ...
└── tenant-navy/              ← Navy custom (classified)
    ├── manifest.json
    └── ...
```

ontology-service loads: `ONTOLOGY_ROOT=/ontology/v2-compiled/tenant-{tenant_id}` per-request.

### 6.2 RLS

All workspace tables use tenant_id RLS matching auth middleware.
Templates: read public (all tenants), write only owner tenant.

### 6.3 Classification Support (Defense Mode)

When tenant has `classification.enabled=true`:
- Each object/link/action gets `classification` field (UNCLASSIFIED, CUI, SECRET, TOP SECRET)
- Portion markings: `//REL TO USA, GBR//FOUO`
- Need-to-know access: per-object-type ACL
- Audit: who viewed what (access-based, not just action-based)

---

## 7. Frontend Component Tree

```
/app/studio/
├── layout.tsx                    StudioLayout (sidebar + workspace context)
├── page.tsx                      WorkspaceDashboard
│   ├── WorkspaceList             (cards: name, status, object/link/action counts)
│   ├── TemplateBrowser           (grid of pre-built pack templates)
│   ├── CreateWorkspaceDialog     (name, clone from template/workspace)
│   └── DeleteWorkspaceDialog
│
├── [workspaceId]/
│   ├── layout.tsx                WorkspaceEditorLayout (tabs: Objects | Links | Actions | Compile)
│   ├── page.tsx                  redirect to objects/
│   │
│   ├── objects/
│   │   ├── page.tsx              ObjectTypeList (sortable list with drag)
│   │   ├── new/page.tsx          CreateObjectTypeForm
│   │   └── [objectTypeId]/
│   │       ├── page.tsx          ObjectTypeEditor
│   │       │   ├── BasicInfoPanel      (apiName, displayName, primaryKey, titleProperty)
│   │       │   ├── PropertyList        (sortable, inline editable)
│   │       │   ├── AddPropertyDialog   (type selector, config per type)
│   │       │   └── DeleteConfirmDialog
│   │       └── edit/...           inline form
│   │
│   ├── links/
│   │   ├── page.tsx              LinkTypeList (table)
│   │   └── [linkId]/
│   │       └── page.tsx          LinkTypeEditor
│   │           ├── SourceTargetSelector  (dropdown from workspace objects)
│   │           └── CardinalitySelector
│   │
│   ├── actions/
│   │   ├── page.tsx              ActionTypeList
│   │   └── [actionId]/
│   │       └── page.tsx          ActionTypeEditor
│   │           ├── TargetObjectSelector
│   │           ├── ParameterList        (name, type, required toggle)
│   │           ├── PreConditionBuilder  (field-based)
│   │           └── PostConditionBuilder
│   │
│   ├── rules/
│   │   ├── page.tsx              RuleTypeList
│   │   └── [ruleId]/
│   │       └── page.tsx          RuleDesigner (block-based visual)
│   │           ├── TriggerBlock          (schedule, event source)
│   │           ├── ConditionBlock        (AND/OR/NOT nested, field comparisons)
│   │           ├── ActionBlock           (Create Signal with severity + title)
│   │           └── FormulaHelper         (template strings, aggregations)
│   │
│   ├── compile/
│   │   └── page.tsx              CompileDashboard
│   │       ├── ValidationPanel         (errors/warnings list, inline fixes)
│   │       ├── PreviewPanel            (manifest diff view)
│   │       ├── MigrationPreviewPanel   (SQL DDL preview)
│   │       ├── PublishButton           (compile + publish)
│   │       └── VersionHistory          (timeline, diff, rollback)
│   │
│   └── history/
│       └── page.tsx              VersionHistoryPage
│           ├── VersionTimeline
│           └── DiffViewer              (side-by-side JSON diff)
```

---

## 8. Incremental Compilation Design

### 8.1 Problem

Current `compile-schemas.ts` does full rebuild every time. With workspaces, we need:
- Fast validation (just changed items)
- Preview what will change
- Generate minimal DDL (only new/changed tables)

### 8.2 Algorithm

```
1. Load workspace from DB
2. Compare against last published version snapshot
   → compute diff:
     newObjectTypes:     [DroneFleet, Mission]
     changedObjectTypes: [{apiName: "Shipment", addedProps: ["droneId"], removedProps: []}]
     removedObjectTypes: []
     newLinks:           [FleetMission]
     changedLinks:       []
     removedLinks:       []
     newActions:         [ScrambleFleet]
     changedActions:     []

3. Validation (incremental — only new/changed items)
   - Check no duplicate apiNames
   - Check all link references resolve to existing object types
   - Check all action targetObjectTypes exist
   - Check properties reference valid types
   - Check no circular link chains (optional)

4. Generate compiled output
   - New objects → add JSON files
   - Changed objects → overwrite JSON files
   - Removed objects → delete JSON files
   - Update manifest.json
   → Write to tenant-specific directory

5. Generate migration DDL
   New object type → CREATE TABLE (using properties as columns)
   Changed object (new property) → ALTER TABLE ADD COLUMN
   Changed object (removed property) → WARNING (no auto DROP)
   Removed object type → WARNING (manual review)
```

### 8.3 Migration Generator

```
Property type → SQL type mapping:
  string    → TEXT
  number    → DOUBLE PRECISION
  boolean   → BOOLEAN
  date      → DATE
  timestamp → TIMESTAMPTZ
  enum      → TEXT (CHECK constraint optional)
  reference → TEXT (foreign key optional)
  geo_point → GEOMETRY(POINT, 4326)  -- PostGIS
  json      → JSONB
  array     → JSONB (Postgres array of TEXT/INT)
```

---

## 9. Rule Designer Architecture (Block-Based)

### 9.1 Visual Blocks

```
┌─────────────────────────────────────────────────────────┐
│ RULE: "DroneFleetNotReady"                              │
│                                                         │
│ ┌─────────────────┐                                    │
│ │ 🔁 Every 15 min │  ← Trigger Block                   │
│ └────────┬────────┘                                    │
│          ▼                                              │
│ ┌─────────────────────────────────────────┐            │
│ │ IF                                      │            │
│ │  ┌──────────────────────────────────┐   │            │
│ │  │ DroneFleet.readiness_status = RED│   │ ← Condition │
│ │  └──────────────────────────────────┘   │            │
│ │  ┌──────────────────────────────────┐   │            │
│ │  │ AND                              │   │            │
│ │  │ DroneFleet.drone_count < 3       │   │            │
│ │  └──────────────────────────────────┘   │            │
│ │  ┌──────────────────────────────────┐   │            │
│ │  │ AND                              │   │            │
│ │  │ hours_since(last_maintenance)    │   │ ← Function │
│ │  │ > 72                             │   │            │
│ │  └──────────────────────────────────┘   │            │
│ └─────────────────────────────────────────┘            │
│          ▼                                              │
│ ┌─────────────────────────────────────────┐            │
│ │ THEN CREATE SIGNAL                      │            │
│ │  Severity: ██ HIGH                      │            │
│ │  Title: "Fleet {{fleet_id}} not ready"  │ ← Template │
│ │  Bind to: DroneFleet.{{fleet_id}}       │            │
│ └─────────────────────────────────────────┘            │
└─────────────────────────────────────────────────────────┘
```

### 9.2 Compiled Output (JSON, stored in rules/)

```json
{
  "apiName": "DroneFleetNotReady",
  "displayName": "Drone Fleet Not Mission-Ready",
  "schedule": "*/15 * * * *",
  "sourceObjectType": "DroneFleet",
  "conditions": [
    { "field": "readiness_status", "op": "eq", "value": "RED" },
    { "field": "drone_count", "op": "lt", "value": 3 },
    { "fn": "hours_since", "args": ["last_maintenance"], "op": "gt", "value": 72 }
  ],
  "conditionLogic": "AND",
  "signal": {
    "severity": "HIGH",
    "titleTemplate": "Fleet {{fleet_id}} not ready",
    "bindToSource": true
  }
}
```

---

## 10. Implementation Plan

### Phase 1 — Foundation (Weeks 1-4)

| Week | Deliverable | Priority |
|------|------------|----------|
| 1 | DB migrations for all workspace tables | P0 |
| 1 | Extended Zod types (geo_point, reference, array, json) | P0 |
| 1-2 | `ontology-builder` Go service: workspace CRUD endpoints | P0 |
| 2 | `ontology-builder` Go service: object type CRUD with properties | P0 |
| 2-3 | `ontology-builder` Go service: link + action CRUD | P0 |
| 3 | `console-web` `/studio` layout + workspace dashboard | P1 |
| 3-4 | `console-web` Object Designer page (property list, add/edit) | P1 |
| 4 | `console-web` Link Designer page | P1 |

### Phase 2 — Compilation & Publish (Weeks 5-8)

| Week | Deliverable | Priority |
|------|------------|----------|
| 5 | Validation engine (incremental, per-workspace) | P0 |
| 5-6 | Incremental compiler (diff → compiled JSON) | P0 |
| 6 | Migration generator (diff → SQL DDL preview) | P0 |
| 6-7 | Version history (snapshot, diff, rollback) | P0 |
| 7 | `console-web` Compile dashboard (validate, preview, publish flow) | P1 |
| 7-8 | `console-web` Version history viewer with diff | P1 |
| 8 | Hot-reload: ontology-service detects new manifest, reloads without restart | P1 |

### Phase 3 — Rules & Templates (Weeks 9-12)

| Week | Deliverable | Priority |
|------|------------|----------|
| 9-10 | `console-web` Rule Designer — block-based visual builder | P1 |
| 10 | Rule compiler (blocks → JSON) | P1 |
| 11 | Template marketplace (list, clone, save-as-template) | P2 |
| 11-12 | Import/Export (JSON manifest portable between tenants) | P2 |
| 12 | Multi-user editing with conflict detection | P2 |

---

## 11. Testing Strategy

```
Unit:
  - Zod schema validation (valid + invalid object/link/action)
  - Incremental diff computation
  - SQL migration generation

Integration:
  - Full workspace lifecycle: create → add objects/links/actions → compile → publish → verify v2-compiled/
  - Tenant isolation: tenant A cannot see tenant B's workspace
  - Template clone: template → workspace → verify snapshot match
  - Version rollback: publish v1 → modify → publish v2 → rollback v1 → verify compiled matches v1

E2E (Playwright in console-web):
  - User creates workspace from blank → adds object → adds property → validates → publishes
  - User clones template → modifies → validates → publishes
  - User builds rule in visual designer → compiles → checks JSON output
  - Two users editing same workspace → conflict detection dialog
```

---

## 12. Configuration & Feature Flags

Per-tenant `config.yaml` additions:

```yaml
tenants:
  - id: tenant-acme
    ontology:
      studio_enabled: true         # can use Studio UI
      self_service_build: true     # can create workspaces from scratch
      template_clone_only: false   # false = full freedom, true = clone-only
      max_custom_object_types: 50  # guardrail
      max_properties_per_object: 30
      classification_required: false
      auto_publish_on_compile: false
      require_approval_for_publish: true  # admin approval before live

  - id: tenant-navy
    ontology:
      studio_enabled: true
      self_service_build: true
      template_clone_only: false
      classification_required: true   # every object must have classification
      classification_minimum: SECRET  # must be SECRET or above
      auto_publish_on_compile: false
      require_approval_for_publish: true
```
