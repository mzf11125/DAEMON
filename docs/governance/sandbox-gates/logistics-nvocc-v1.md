# Sandbox gate — logistics-nvocc v1

| Check | Command / artifact | Expected |
|-------|-------------------|----------|
| Pack manifest | `ontology/v2/examples/packs/logistics-nvocc/manifest.json` | valid JSON |
| Synthetic connector | `connectors/synthetic/logistics-nvocc/manifest.json` | present |
| Seed objects | `make seed-sandbox` then query `ontology_objects` where properties->>'vertical' = 'logistics-nvocc' | ≥1 Site |
| Integration | `go test -tags=integration ./tests/integration/ -run TestSandboxSector_logistics-nvocc` | PASS |
| Traceability | `docs/traceability/matrix-v1.md` row for logistics-nvocc | linked |

Stop-the-line: seed drift without updating this gate packet and integration test.
