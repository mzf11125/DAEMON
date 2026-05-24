# Sandbox gate — mission-tasking v1

| Check | Command / artifact | Expected |
|-------|-------------------|----------|
| Pack manifest | `ontology/v2/examples/packs/mission-tasking/manifest.json` | valid JSON |
| Synthetic connector | `connectors/synthetic/mission-tasking/manifest.json` | present |
| Seed objects | `make seed-sandbox` then query `ontology_objects` where properties->>'vertical' = 'mission-tasking' | ≥1 Site |
| Integration | `go test -tags=integration ./tests/integration/ -run TestSandboxSector_mission-tasking` | PASS |
| Traceability | `docs/traceability/matrix-v1.md` row for mission-tasking | linked |

Stop-the-line: seed drift without updating this gate packet and integration test.
