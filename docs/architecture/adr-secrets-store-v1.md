# ADR: Secrets store (Phase 1.3)

## Status

**Proposed — DRAFT.** Decision required mid-Phase 1 of the [end-to-end production plan](../../.cursor/plans/daemon-production-end-to-end-50d4a9.md). Coupled with [`adr-cluster-provider-v1.md`](./adr-cluster-provider-v1.md) but independently decidable.

## Context

Locked production runtime: self-managed K8s + Supabase Cloud + ClickHouse Cloud + Neo4j Aura. Every variable in [`.env.example`](../../.env.example) needs to live in a real secrets store, with rotation policy, audit log, and workload-identity-based access (no static creds in the cluster).

Secrets in scope:

- Database creds: `DATABASE_URL` (Supabase Cloud), `SEED_DATABASE_URL` (admin)
- ClickHouse: `CLICKHOUSE_DSN` + `CLICKHOUSE_CLOUD_KEY_ID/SECRET`
- Neo4j: `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD`
- Object store: S3 access key + secret + bucket
- Supabase: `SUPABASE_JWT_SECRET`, `SUPABASE_SERVICE_ROLE_KEY` (seed-only, never runtime)
- LLM provider: `OPENROUTER_API_KEY`, `LANGCHAIN_API_KEY`, `TAVILY_API_KEY`, `SHODAN_API_KEY`
- OIDC: `OIDC_ISSUER`, `OIDC_AUDIENCE` (config, not secret)
- Cosign signing key
- TLS cert private keys (cert-manager-managed)

## Decision criteria

| Criterion | Weight | Notes |
|-----------|--------|-------|
| SOC 2 + ISO 27001 + HIPAA + GDPR fit | High | All options pass with controls |
| Workload identity (no static creds in pods) | High | Both Vault and cloud-native support |
| Rotation automation | High | Cloud-native easier for cloud creds; Vault best for app secrets |
| Audit log | High | Both produce structured access logs |
| Cross-cloud / multi-region | Medium | Vault portable; cloud-native locks to provider |
| Operational burden | High | Cloud-native = zero ops; Vault = real ops cost |
| Cost | Medium | Cloud-native = pay-per-secret; Vault open-source free + infra cost |
| Ecosystem (external-secrets-operator) | High | Both first-class supported by ESO |
| Disaster recovery | High | Both have managed snapshot / replication paths |

## Options considered

### Option A — Cloud-native secrets manager

**AWS Secrets Manager / GCP Secret Manager / Azure Key Vault** depending on cluster provider.

**Pros**
- Zero operational burden — fully managed.
- Native KMS integration with provider IAM.
- Auto-rotation hooks for managed services (RDS, etc. — less relevant for Supabase but useful for object-store keys).
- Strong audit logs in CloudTrail / Cloud Audit Logs / Azure Monitor.
- External-secrets-operator integration is first-class.

**Cons**
- Cloud lock-in — secrets cannot trivially migrate to another provider.
- Each provider has its own API surface and quirks (rotation lambdas, rotation schedules).
- Multi-cloud secret sync requires extra tooling.

### Option B — HashiCorp Vault (self-hosted)

**Pros**
- Cloud-portable; secrets store is the same regardless of K8s provider.
- Rich secret engines (database, PKI, transit encryption, KV).
- Dynamic secrets (short-lived DB credentials) — strong fit for HIPAA/SOC2.
- Strong policy language (HCL) and audit log.

**Cons**
- Operational burden — must run Vault HA cluster (Raft / Consul backend).
- DR is non-trivial (auto-unseal, root token rotation, performance replicas).
- Adds a Tier-0 dependency on the platform.
- More moving parts in compliance scope.

### Option C — HashiCorp Vault (HCP managed)

**Pros**
- Reduces operational burden vs self-hosted Vault.
- Same Vault API surface; same secret engines and policies.
- HCP Vault is SOC 2 + ISO 27001 attested.

**Cons**
- HCP Vault adds a sub-processor → DPA + risk assessment work.
- Cost higher than self-hosted at small scale.
- Network egress from K8s to HCP requires careful firewalling.

### Option D — Hybrid (Vault for app secrets + cloud-native for cloud creds)

**Pros**
- Right tool per job: cloud-native for IAM-tied secrets; Vault for app/DB/runtime secrets.
- Leverages provider rotation features without losing portability for app config.

**Cons**
- Two systems to operate and audit.
- Engineers must learn both.
- Secret discovery at runtime gets harder (which store is X in?).

## Recommendation (to be ratified)

**Tentative: Option C (HCP Vault)** for first GA.

Rationale:
- Decouples secrets from cluster provider — supports the vendor-neutral cluster decision.
- Eliminates self-hosted Vault operational burden during the highest-leverage phase.
- HCP Vault's compliance attestations satisfy SOC 2 + ISO 27001 sub-processor evidence.
- Dynamic secret engines (DB, PKI, transit) are valuable for HIPAA + GDPR posture.

**Fallback: Option A (cloud-native)** if HCP Vault adds unacceptable cost at GA scale, or if the team has zero Vault operational experience and cannot absorb learning curve in Phase 1.

**Not recommended for first GA: self-hosted Vault (Option B)** — too much operational burden during Phase 1–4.

## Consequences

- New sub-processor (HashiCorp) added to DPA register in Phase 3.4.
- External-secrets-operator deployed cluster-wide; one `SecretStore` (or `ClusterSecretStore`) per environment.
- All Helm charts read secrets via `valueFrom: secretKeyRef`; chart values never contain secrets.
- Sealed-secrets is **not** used (sealed-secrets stores encrypted values in git; Vault is the source of truth and doesn't need it).
- Cosign signing key stored in Vault transit engine.
- Supabase Service Role Key stays seed-only — never injected into runtime pods (already enforced).

## Rotation policy (production)

| Secret class | Rotation cadence | Method |
|--------------|------------------|--------|
| LLM provider keys | 90 days | Vault rotation engine + provider API |
| Object store keys | 30 days | Vault dynamic secret engine |
| TLS certificates | 60 days (Let's Encrypt) | cert-manager |
| Cosign signing key | 365 days | Vault transit + manual handover |
| Supabase JWT secret | 365 days (or on incident) | Coordinated cutover; service restart |
| Database creds (Supabase) | provider-managed | Supabase Cloud |
| Vault root token | 365 days | Quorum unseal + new root |

## Open items

- [ ] Cost model: HCP Vault Starter vs Plus vs Enterprise tier sizing for GA.
- [ ] Spike: external-secrets-operator → HCP Vault end-to-end with one Daemon service.
- [ ] Confirm rotation hooks for OpenRouter and Tavily (provider API support).
- [ ] DR: HCP Vault region + cross-region replication strategy.
- [ ] Decide whether console-web (if on Vercel) reads secrets via Vercel env or via Vault Agent — likely Vercel env populated from Vault by CI.

## References

- Plan §Phase 1.3: [`/Users/macbook/.windsurf/plans/daemon-production-end-to-end-50d4a9.md`](../../.cursor/plans/daemon-production-end-to-end-50d4a9.md)
- Audit retention (rotation evidence): [`docs/governance/audit-retention-v1.md`](../governance/audit-retention-v1.md)
- AI surface review: [`docs/security/ai-surface-review-v1.md`](../security/ai-surface-review-v1.md)
