# Reference Project walkthrough v1 (DAEMON mapping)

Read-only mapping from three-layer architecture narrative to this monorepo.

| Layer | Reference pattern | DAEMON |
|-------|---------|--------|
| 1 — Data | PySpark transforms, lineage | `ingestion-service`, `pipeline-runner`, medallion docs |
| 2 — Ontology | Object types + relations | `ontology/v2`, rules → Signal, `case_signals` |
| 3 — Apps | Workshop + Actions writeback | `console-web` + `sdk-ts` actions |

DAEMON does **not** ship third-party reference project binaries. Use this doc for onboarding engineers.

## Exercise

1. `make demo` → open console inbox.
2. Open case with `signalIds` → verify `case_signals` in DB.
3. Record decision → verify audit API.

See [`ontology-platform-overview.md`](ontology-platform-overview.md).
