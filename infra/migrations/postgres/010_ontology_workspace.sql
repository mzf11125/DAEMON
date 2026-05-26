-- DAEMON Ontology Studio — Workspace Tables
-- Phase 1: Foundation schema for ontology-builder service

CREATE TABLE IF NOT EXISTS ontology_workspaces (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id          TEXT NOT NULL,
    name               TEXT NOT NULL,
    description        TEXT,
    status             TEXT NOT NULL DEFAULT 'draft',
    base_manifest_id   UUID,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at       TIMESTAMPTZ,
    UNIQUE(tenant_id, name)
);

CREATE TABLE IF NOT EXISTS ontology_object_types (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id       UUID NOT NULL REFERENCES ontology_workspaces(id) ON DELETE CASCADE,
    api_name           TEXT NOT NULL,
    display_name       TEXT NOT NULL,
    primary_key        TEXT NOT NULL DEFAULT 'id',
    title_property     TEXT NOT NULL,
    description        TEXT,
    icon               TEXT,
    category           TEXT,
    sort_order         INT NOT NULL DEFAULT 0,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(workspace_id, api_name)
);

CREATE TABLE IF NOT EXISTS ontology_properties (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    object_type_id     UUID NOT NULL REFERENCES ontology_object_types(id) ON DELETE CASCADE,
    name               TEXT NOT NULL,
    type               TEXT NOT NULL,
    required           BOOLEAN NOT NULL DEFAULT false,
    config             JSONB NOT NULL DEFAULT '{}',
    sort_order         INT NOT NULL DEFAULT 0,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(object_type_id, name)
);

CREATE TABLE IF NOT EXISTS ontology_link_types (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id       UUID NOT NULL REFERENCES ontology_workspaces(id) ON DELETE CASCADE,
    api_name           TEXT NOT NULL,
    display_name       TEXT NOT NULL,
    from_object_type   TEXT NOT NULL,
    to_object_type     TEXT NOT NULL,
    cardinality        TEXT NOT NULL DEFAULT 'MANY_TO_MANY',
    description        TEXT,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(workspace_id, api_name)
);

CREATE TABLE IF NOT EXISTS ontology_action_types (
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

CREATE TABLE IF NOT EXISTS ontology_action_params (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_type_id     UUID NOT NULL REFERENCES ontology_action_types(id) ON DELETE CASCADE,
    name               TEXT NOT NULL,
    type               TEXT NOT NULL,
    required           BOOLEAN NOT NULL DEFAULT false,
    config             JSONB NOT NULL DEFAULT '{}',
    sort_order         INT NOT NULL DEFAULT 0,
    UNIQUE(action_type_id, name)
);

CREATE TABLE IF NOT EXISTS ontology_versions (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id       UUID NOT NULL REFERENCES ontology_workspaces(id) ON DELETE CASCADE,
    version            INT NOT NULL,
    snapshot           JSONB NOT NULL,
    change_summary     TEXT,
    published          BOOLEAN NOT NULL DEFAULT false,
    published_at       TIMESTAMPTZ,
    created_by         TEXT,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(workspace_id, version)
);

CREATE TABLE IF NOT EXISTS ontology_templates (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name               TEXT NOT NULL UNIQUE,
    display_name       TEXT NOT NULL,
    description        TEXT,
    category           TEXT,
    icon               TEXT,
    tags               TEXT[],
    source_workspace_id UUID,
    visibility         TEXT NOT NULL DEFAULT 'public',
    owner_tenant_id    TEXT,
    snapshot           JSONB NOT NULL,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_ontology_object_types_workspace
    ON ontology_object_types(workspace_id);
CREATE INDEX IF NOT EXISTS idx_ontology_properties_object_type
    ON ontology_properties(object_type_id);
CREATE INDEX IF NOT EXISTS idx_ontology_link_types_workspace
    ON ontology_link_types(workspace_id);
CREATE INDEX IF NOT EXISTS idx_ontology_action_types_workspace
    ON ontology_action_types(workspace_id);
CREATE INDEX IF NOT EXISTS idx_ontology_action_params_action_type
    ON ontology_action_params(action_type_id);
CREATE INDEX IF NOT EXISTS idx_ontology_versions_workspace
    ON ontology_versions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_ontology_templates_category
    ON ontology_templates(category);
CREATE INDEX IF NOT EXISTS idx_ontology_workspaces_tenant
    ON ontology_workspaces(tenant_id);
