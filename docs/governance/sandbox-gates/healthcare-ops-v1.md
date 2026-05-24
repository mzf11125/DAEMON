# Sandbox gate — healthcare-ops v1

| Check | Command / artifact | Expected |
|-------|-------------------|----------|
| Pack manifest | `ontology/v2/examples/packs/healthcare-ops/manifest.json` | valid JSON |
| Synthetic connector | `connectors/synthetic/healthcare-ops/manifest.json` | present |
| Seed objects | `make seed-sandbox` then query `ontology_objects` where properties->>'vertical' = 'healthcare-ops' | ≥1 Site |
| Integration | `go test -tags=integration ./tests/integration/ -run TestSandboxSector_healthcare-ops` | PASS |
| Traceability | `docs/traceability/matrix-v1.md` row for healthcare-ops | linked |

Stop-the-line: seed drift without updating this gate packet and integration test.
