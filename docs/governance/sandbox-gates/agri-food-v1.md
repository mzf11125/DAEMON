# Sandbox gate — agri-food v1

| Check | Command / artifact | Expected |
|-------|-------------------|----------|
| Pack manifest | `ontology/v2/examples/packs/agri-food/manifest.json` | valid JSON |
| Synthetic connector | `connectors/synthetic/agri-food/manifest.json` | present |
| Seed objects | `make seed-sandbox` then query `ontology_objects` where properties->>'vertical' = 'agri-food' | ≥1 Site |
| Integration | `go test -tags=integration ./tests/integration/ -run TestSandboxSector_agri-food` | PASS |
| Traceability | `docs/traceability/matrix-v1.md` row for agri-food | linked |

Stop-the-line: seed drift without updating this gate packet and integration test.
