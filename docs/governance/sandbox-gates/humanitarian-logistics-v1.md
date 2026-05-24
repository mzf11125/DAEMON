# Sandbox gate — humanitarian-logistics v1

| Check | Command / artifact | Expected |
|-------|-------------------|----------|
| Pack manifest | `ontology/v2/examples/packs/humanitarian-logistics/manifest.json` | valid JSON |
| Synthetic connector | `connectors/synthetic/humanitarian-logistics/manifest.json` | present |
| Seed objects | `make seed-sandbox` then query `ontology_objects` where properties->>'vertical' = 'humanitarian-logistics' | ≥1 Site |
| Integration | `go test -tags=integration ./tests/integration/ -run TestSandboxSector_humanitarian-logistics` | PASS |
| Traceability | `docs/traceability/matrix-v1.md` row for humanitarian-logistics | linked |

Stop-the-line: seed drift without updating this gate packet and integration test.
