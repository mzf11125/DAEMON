# Sandbox gate — life-sciences-ops v1

| Check | Command / artifact | Expected |
|-------|-------------------|----------|
| Pack manifest | `ontology/v2/examples/packs/life-sciences-ops/manifest.json` | valid JSON |
| Synthetic connector | `connectors/synthetic/life-sciences-ops/manifest.json` | present |
| Seed objects | `make seed-sandbox` then query `ontology_objects` where properties->>'vertical' = 'life-sciences-ops' | ≥1 Site |
| Integration | `go test -tags=integration ./tests/integration/ -run TestSandboxSector_life-sciences-ops` | PASS |
| Traceability | `docs/traceability/matrix-v1.md` row for life-sciences-ops | linked |

Stop-the-line: seed drift without updating this gate packet and integration test.
