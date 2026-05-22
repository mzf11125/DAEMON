# Foundry Reference Project walkthrough v1 (DAEMON mapping)

Read-only mapping from Palantir’s three-layer training narrative to this monorepo.

| Layer | Foundry | DAEMON |
|-------|---------|--------|
| 1 — Data | PySpark transforms, lineage | `ingestion-service`, `pipeline-runner`, medallion docs |
| 2 — Ontology | Object types + relations | `ontology/v2`, rules → Signal, `case_signals` |
| 3 — Apps | Workshop + Actions writeback | `console-web` + `sdk-ts` actions |

DAEMON does **not** ship Palantir’s reference project binaries. Use this doc for onboarding engineers.

## Exercise

1. `make demo` → open console inbox.
2. Open case with `signalIds` → verify `case_signals` in DB.
3. Record decision → verify audit API.

See [`foundry-platform-overview.md`](foundry-platform-overview.md).
