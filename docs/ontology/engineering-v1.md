# Ontology engineering v1

## Layout

- `ontology/v2/manifest.json` — registry of types
- `object-types/`, `link-types/`, `action-types/`, `functions/`
- `interfaces/ontology/` — shared interface defs
- `rules/` — ClickHouse SQL rules (SELECT-only)

## Validation

Run `./scripts/validate-ontology.sh` before merge when touching ontology:

- Manifest completeness
- Rule SQL: SELECT-only, `{threshold:Float64}` placeholder
- Go tests: `TestOntologyRuleFiles`

## Change control

Bump `manifest.version` on breaking type changes. Coordinate with rules-engine threshold and console object displays.
