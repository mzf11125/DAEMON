# Assumption register v1

| ID | Assumption | Risk if wrong | Owner |
|----|------------|---------------|-------|
| A-01 | Supabase local is primary auth for dev | Demo blocked | Platform |
| A-02 | `tenant-demo` seed tenant sufficient for v1 | RLS gaps in multi-tenant | Security |
| A-03 | Neo4j optional for loop proof | Graph features degraded | Ontology |
| A-04 | Solana + EVM via Dune/Sim connectors only | Chain coverage gaps | Ingestion |
| A-05 | Sector packs are stubs until W2 | No vertical GA | Product |
| A-06 | No Palantir code import | Legal / maintainability | Engineering |

Review quarterly or before external pilot.

**Parity v1 (full register):** [`assumption-register-parity-v1.md`](assumption-register-parity-v1.md).
