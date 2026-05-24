# Vendor-neutral content policy v1

Public artifacts in this repository must describe **Daemon-native** capabilities without naming commercial counterparties, their trademarks, or implying a signed partnership.

## Allowed

- Neutral architecture terms: ontology, dataset plane, operational loop, attachment plane, geo read model, action types, HITL, RLS, MCP tools.
- Internal capability IDs: `CAP-01` … `CAP-26` (see [capability-pattern-index-v1.md](../traceability/capability-pattern-index-v1.md)).
- Generic pattern names: entity visualizer, objects/file plane, periodic publish, thumbnail link, task lifecycle, listen-as-agent (as **patterns**, not product names).

## Disallowed in committed docs, README, agents, services, and apps

- Vendor company names, product names, and trademarked platform labels.
- URLs to vendor documentation portals used as runtime dependencies.
- Language that states or implies an NDA, pilot, or production integration with a named counterparty.

## Scope

- **In scope:** `docs/`, `README.md`, `.cursor/agents/`, `services/`, `apps/`, `scripts/check-vendor-neutral-language.sh`, CI workflow gates.
- **Out of scope:** `external/` subtrees (separate repos or reference mirrors); scrub those only when promoting content into `main`.

## Enforcement

```bash
./scripts/check-vendor-neutral-language.sh
```

CI runs the same script on pull requests. Fix violations by rephrasing to capability IDs or neutral pattern language; do not add vendor URLs as substitutes.

## Review checklist

1. Grep clean on in-scope paths.
2. Traceability rows cite Daemon modules and tests, not external product names.
3. New vertical packs use `packId` slugs only in seeds and gate packets.
