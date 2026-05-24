# Sandbox gate — energy-utilities v1

| Check | Command / artifact | Expected |
|-------|-------------------|----------|
| Pack manifest | `ontology/v2/examples/packs/energy-utilities/manifest.json` | valid JSON |
| Synthetic connector | `connectors/synthetic/energy-utilities/manifest.json` | present |
| Seed objects | `make seed-sandbox` then query `ontology_objects` where properties->>'vertical' = 'energy-utilities' | ≥1 Site |
| Integration | `go test -tags=integration ./tests/integration/ -run TestSandboxSector_energy-utilities` | PASS |
| Traceability | `docs/traceability/matrix-v1.md` row for energy-utilities | linked |

Stop-the-line: seed drift without updating this gate packet and integration test.
