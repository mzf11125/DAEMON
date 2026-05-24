# Sandbox gate — government-finance v1

| Check | Command / artifact | Expected |
|-------|-------------------|----------|
| Pack manifest | `ontology/v2/examples/packs/government-finance/manifest.json` | valid JSON |
| Synthetic connector | `connectors/synthetic/government-finance/manifest.json` | present |
| Seed objects | `make seed-sandbox` then query `ontology_objects` where properties->>'vertical' = 'government-finance' | ≥1 Site |
| Integration | `go test -tags=integration ./tests/integration/ -run TestSandboxSector_government-finance` | PASS |
| Traceability | `docs/traceability/matrix-v1.md` row for government-finance | linked |

Stop-the-line: seed drift without updating this gate packet and integration test.
