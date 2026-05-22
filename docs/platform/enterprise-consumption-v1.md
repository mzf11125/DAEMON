# Enterprise consumption v1

## Access channels

| Channel | Users | Writeback |
|---------|-------|-----------|
| Web console (`console-web`) | Investigators | Actions via JWT |
| `sdk-ts` | Integrators | Same API contracts |
| MCP (`aip/mcp-ontology`) | Agents | Read-only v1 (A-AIP-01) |
| REST platform-api | Audit readers | Read |

## v1 constraints

- Web-first (A-ACCESS-01); no desktop store apps.
- Human RecordDecision / OpenCase; agents summarize only.

## Related

- [`docs/api-contracts/README.md`](../api-contracts/README.md)
- [`docs/operator-guides/operate-cockpit-v1.md`](../operator-guides/operate-cockpit-v1.md)
