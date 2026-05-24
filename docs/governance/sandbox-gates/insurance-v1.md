# Sandbox gate — insurance v1

| Check | Command / artifact | Expected |
|-------|-------------------|----------|
| Pack manifest | `ontology/v2/examples/packs/insurance/manifest.json` | valid JSON |
| Synthetic connector | `connectors/synthetic/insurance/manifest.json` | present |
| Seed objects | `make seed-sandbox` then query `ontology_objects` where properties->>'vertical' = 'insurance' | ≥1 Site |
| Integration | `go test -tags=integration ./tests/integration/ -run TestSandboxSector_insurance` | PASS |
| Traceability | `docs/traceability/matrix-v1.md` row for insurance | linked |

Stop-the-line: seed drift without updating this gate packet and integration test.
