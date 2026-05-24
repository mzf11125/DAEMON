# Sandbox gate — rail-network v1

| Check | Command / artifact | Expected |
|-------|-------------------|----------|
| Pack manifest | `ontology/v2/examples/packs/rail-network/manifest.json` | valid JSON |
| Synthetic connector | `connectors/synthetic/rail-network/manifest.json` | present |
| Seed objects | `make seed-sandbox` then query `ontology_objects` where properties->>'vertical' = 'rail-network' | ≥1 Site |
| Integration | `go test -tags=integration ./tests/integration/ -run TestSandboxSector_rail-network` | PASS |
| Traceability | `docs/traceability/matrix-v1.md` row for rail-network | linked |

Stop-the-line: seed drift without updating this gate packet and integration test.
