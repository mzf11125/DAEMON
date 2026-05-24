# Sandbox gate — construction-ops v1

| Check | Command / artifact | Expected |
|-------|-------------------|----------|
| Pack manifest | `ontology/v2/examples/packs/construction-ops/manifest.json` | valid JSON |
| Synthetic connector | `connectors/synthetic/construction-ops/manifest.json` | present |
| Seed objects | `make seed-sandbox` then query `ontology_objects` where properties->>'vertical' = 'construction-ops' | ≥1 Site |
| Integration | `go test -tags=integration ./tests/integration/ -run TestSandboxSector_construction-ops` | PASS |
| Traceability | `docs/traceability/matrix-v1.md` row for construction-ops | linked |

Stop-the-line: seed drift without updating this gate packet and integration test.
