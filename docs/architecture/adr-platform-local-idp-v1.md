# ADR: Local developer platform (IDP-lite)

## Decision

v1 developer experience = Makefile + docker compose + docs catalog. No Backstage/K8s.

| Layer | v1 | v2 |
|-------|----|----|
| Portal | docs + console-web | Backstage |
| Orchestration | Makefile | GitHub Actions |
| Runtime | go run / compose profile | K8s |

Versioning: SQL migrations `00N_` and ontology `manifest.version`.
