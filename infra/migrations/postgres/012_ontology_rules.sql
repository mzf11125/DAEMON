-- DAEMON Ontology Studio — Rules Table
-- Phase 3: Rules engine integration for the ontology-builder service

CREATE TABLE IF NOT EXISTS ontology_rules (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id        UUID NOT NULL REFERENCES ontology_workspaces(id) ON DELETE CASCADE,
    api_name            TEXT NOT NULL,
    display_name        TEXT NOT NULL,
    source_object_type  TEXT NOT NULL,
    schedule            TEXT NOT NULL DEFAULT '*/15 * * * *',
    condition_logic     TEXT NOT NULL DEFAULT 'AND',
    conditions          JSONB NOT NULL DEFAULT '[]',
    signal_config       JSONB NOT NULL DEFAULT '{}',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(workspace_id, api_name)
);

CREATE INDEX IF NOT EXISTS idx_ontology_rules_workspace
    ON ontology_rules(workspace_id);
