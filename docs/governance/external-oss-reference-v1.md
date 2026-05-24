# Public OSS reference patterns (no proprietary imports)

DAEMON may study **public** repositories for patterns only. Do not copy proprietary SDKs or trademarks into this repo.

## Pattern families

| Pattern | Public examples (illustrative) | DAEMON mapping |
|---------|-------------------------------|----------------|
| Ontology manifest | OWL/RDF ecosystems, internal `ontology/v2` | manifest + packs |
| Object backend | Postgres + RLS | Supabase migrations |
| Graph projection | Neo4j open docs | optional links |
| Agent tools | MCP specification | `aip/mcp-ontology` |
| Audit log | Append-only event tables | `audit_log` |

## Compliance

- No counterparty names in public README/commits without written consent.
- Prefer generic terms: “graph projection,” “operational datastore.”
