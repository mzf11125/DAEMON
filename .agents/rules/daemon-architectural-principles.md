---
trigger: always_on
---

DAEMON Architectural Principles

1. DAEMON Core must remain domain-neutral.
2. Domain logic belongs in Ontology Packs.
3. Domain logic must not leak into Core modules.
4. Entity, Relationship, Event, Evidence, and Workflow are first-class concepts.
5. Ontology Registry is the single source of truth.
6. PostgreSQL Journal is the authoritative persistence layer.
7. Neo4j is a projection layer.
8. Search indexes are projections, not sources of truth.
9. Governance must precede mutation.
10. Auditability must never be bypassed.
11. All intelligence data must be represented through ontology-defined entities.
12. New domain requirements should be implemented through Ontology Packs whenever possible.
13. Core modules must not depend on specific business domains.
14. Evidence provenance must be preserved throughout the lifecycle.
15. Every architectural decision must support future intelligence domains.

When proposing changes:

- Reuse existing modules whenever possible.
- Prefer extension over replacement.
- Avoid duplicate functionality.
- Preserve backward compatibility.
- Analyze architecture before implementation.
- Identify affected bounded contexts.
- Identify ontology implications.
- Identify governance implications.
- Identify audit implications.
- Explain why a new module is necessary.
- Prefer integration over duplication.
- Prefer domain packs over core modifications.