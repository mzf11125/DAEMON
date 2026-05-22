# Assumption register — Foundry Parity v1

Govern platform and product assumptions for Parity v1 (not insurance actuarial models).

**Consumers:** ontology-service, platform-api, case-service, console-web, rules-engine, CI.  
**Effective:** Align with [`docs/lifecycle/baseline-supabase-local-v1.md`](../lifecycle/baseline-supabase-local-v1.md) G5 sign-off.

**Material drivers:** (1) Case is sector-agnostic core, (2) JWT+RLS tenant boundary, (3) `case_signals` integrity, (4) audit `actor_id` from JWT, (5) packs do not fork Case schema.

## Register (v1 baseline)

| ID | Category | Assumption | Value / policy | Owner |
|----|----------|------------|----------------|-------|
| A-ARCH-01 | Architectural | Core primitives | `Signal`, `Case`, `Decision` unchanged; packs add types only | Ontology |
| A-ARCH-02 | Architectural | Default pack | `defaultPack: null` | Product |
| A-ARCH-03 | Architectural | Palantir OSS | Imitate only; zero Palantir code in DAEMON | Platform |
| A-ARCH-04 | Multi-tenant | Tenant boundary | Tenant isolates data; connectors per tenant | Product |
| A-OPS-01 | Operational | OpenCase linkage | `signalIds` → `case_signals` (validated) | Ontology |
| A-OPS-02 | Operational | Audit read | `GET /v1/audit/events` with RLS | Platform API |
| A-OPS-03 | Operational | Audit actor | `actor_id` = JWT `sub` | Security |
| A-OPS-04 | Graph | Neo4j | Optional `SignalLinkedToCase` when graph up | Ontology |
| A-DATA-01 | Rules | Demo threshold | `high-temperature.json` documented | Rules |
| A-DATA-02 | Rules | Rule SQL | SELECT-only; typed placeholders | Rules |
| A-DATA-04 | Transforms | Transform catalog | See [`transform-catalog-v1.md`](../pipeline/transform-catalog-v1.md) | Data |
| A-SEC-01 | Security | Auth | Supabase JWT + `daemon_runtime`; Keycloak legacy only | Security |
| A-SEC-02 | Security | Cross-tenant | G4b deny; stop-the-line | Security |
| A-PACK-01 | Pack | v1 gate | Framework + stubs; no aml full E2E | Product |
| A-PACK-02 | Pack | Enablement | `?pack=` / env default | Ontology |
| A-PACK-03 | Pack | Boundary | No fork of Case/Signal/Decision tables | Ontology |
| A-PACK-04 | Pack | First sector E2E | Product-selected post–v1 | Product |
| A-CI-01 | CI | E2E_FULL | Required in GitHub Actions | Platform |
| A-AIP-01 | AIP | Human + agent | MCP read-only; write via console actions | AIP |
| A-CHAIN-03 | Chain | Connectors | Solana + EVM via Dune/Sim v1 | Ingestion |
| A-UX-01 | UX | Golden path | ≤3 clicks; dev off golden path | UX |
| A-RES-01 | Research | Live UR | Deferred until post–B2 UI | Research |

Judgment overrides: changes to **A-ARCH-01** or **A-OPS-01** require change log entry + traceability update.

## Assumption packs

| Pack ID | Use case | Must not vary |
|---------|----------|----------------|
| `core-operational-v1` | Default demo, E2E | OpenCase → RecordDecision → audit |
| `pack-{sector}-v1` | Vertical E2E post–v1 | Core action sequence |
| `auth-migration-v1` | G4–G7 | Fail-closed 401 |

## Change log

| Date | ID | Prior → Proposed | PR | E2E impact |
|------|-----|------------------|-----|------------|
| 2026-05-22 | — | Initial parity v1 register | — | E2E_FULL baseline |

## Sensitivities

| Driver | Base | Adverse | Metric |
|--------|------|---------|--------|
| Rule threshold | Current JSON | +20% stricter | Signal count |
| Pack enabled | null | sector pack on | UI types |
| signalIds | Valid list | Invalid id | 4xx / `case_signals` |
| Tenant | Tenant A JWT | Tenant B reads A | RLS deny |

## Checklist (pre-demo)

- [ ] Material rows have owner
- [ ] Core vs pack basis documented
- [ ] Top drivers have sensitivity or N/A rationale
- [ ] No legal/actuarial sign-off claimed

## Related

- [`assumption-register-v1.md`](assumption-register-v1.md) — short index
- [`docs/traceability/foundry-parity-v1.md`](../traceability/foundry-parity-v1.md)
