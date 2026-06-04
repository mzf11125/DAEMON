# Security and governance

Security and governance enforce identity, policy, guardrails, trust, and audit across the platform.

```mermaid
graph TB
  ID[Identity]
  POL[PolicyEngine]
  RBAC[RBAC]
  GUARD[Guardrails]
  TRUST[Trust]
  AUDIT[AuditLog]
  ID --> POL
  RBAC --> POL
  POL --> GUARD
  GUARD --> AUDIT
  TRUST --> POL
```

## Policy engine

`security-governance/policy-engine.ts` is the central decision point. It evaluates `action`/`resource` against the policies in [`configs/policies/`](../configs/policies). A decision is `allow` or `deny` with an optional `reason`. Denials surface as `ErrorCodes.POLICY_DENIED`.

## Policy sources

- `access-policies.yaml` — entity read/write access.
- `action-policies.yaml` — workflow and command execution.
- `data-policies.yaml` — store access and data classification.
- `governance-policies.yaml` — audit, retention, escalation, approval gates.

## Audit

Audit uses an in-memory backend for fast unit tests, and `PostgresAuditLog` when `DAEMON_POSTGRES_URL` is set (used in integration and e2e). Audit records are retained per `governance-policies.yaml`.

## Approval and escalation

External writes and schema changes route through approval gates. Policy denials and external writes trigger escalation channels defined in governance policy.

## Wired vs config-only (commercial SSOT)

| Config / capability | CI check | Runtime |
|---------------------|----------|---------|
| `governance-policies.yaml` approval gates | `pnpm run check:governance-policies` | `OntologyGovernance.assertSchemaChange` / `enforceSchemaChange`; CLI `ontology validate-schema-change` |
| `propagation.yaml` | `check:governance-policies` (targets) | `PropagationExecutor` on registry register/patch via `DaemonRuntime` |
| `action-catalog.yaml` | `check:governance-policies` (gateway `@PolicyCheck` pairs) | `PolicyEngine` at gateway startup via `loadActionCatalogPolicyRules()`; optional `onCommitted` workflow steps after loop commit |
| Pack relations/junctions | `check:ontology-pack` | Link validation on ingest/register; junction validation when junction ingest exists |
| Postgres RLS (`app.tenant_id`) | integration test when Postgres up | `withTenantSession` on journal upserts |

Audit actions for ontology paths include `ontology.register`, `ontology.patch`, and `ontology.schema.change` (when schema gates run).
