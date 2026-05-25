# Customer onboarding playbook v1

Enterprise customer path from **staging pilot** → **production tenant**. Pair with [staging-deploy-v1.md](./staging-deploy-v1.md) and [p2-ga-checklist-v1.md](./p2-ga-checklist-v1.md).

**Owner:** Customer ops + Solutions  
**Status:** Draft playbook

## Roles

| Role | Responsibility |
|------|----------------|
| CSM | Timeline, training, sign-off |
| Solutions engineer | Tenant config, smoke tests |
| Platform | API keys, OIDC, env provisioning |
| Security | DPA/BAA execution |

## Phase A — Contract & compliance (T-30 to T-14)

- [ ] MSA + DPA signed ([dpa-baa-subprocessors-v1.md](../compliance/dpa-baa-subprocessors-v1.md))
- [ ] BAA if PHI scope ([hipaa-safeguards-matrix-v1.md](../compliance/hipaa-safeguards-matrix-v1.md))
- [ ] Sub-processor list acknowledged
- [ ] Region selection (US / EU)
- [ ] Privacy review ID logged if custom integration ([privacy-review-log-v1.md](../compliance/privacy-review-log-v1.md))

## Phase B — Staging tenant (T-14 to T-7)

| Step | Action | Proof |
|------|--------|-------|
| B1 | Create `tenant_id` in staging Postgres | Row in `tenants` |
| B2 | Provision Supabase Auth users / SSO (OIDC) | [oidc-rls-verification-v1.md](./oidc-rls-verification-v1.md) |
| B3 | Issue API keys (service accounts) | Vault / secrets store — never email plaintext |
| B4 | Configure `ONTOLOGY_PACK` if vertical pack | Env on ontology-service |
| B5 | Run ingestion smoke | `POST /v1/jobs` success |
| B6 | Run operational proofs | `./scripts/prove-operational-loop.sh` (staging URLs) |
| B7 | Agent bridge smoke (if licensed) | `./scripts/smoke-agent-bridge.sh` |
| B8 | Train customer admins (2h workshop) | Attendance log |

## Phase C — Production cutover prep (T-7 to T-1)

- [ ] Production tenant created (separate from staging)
- [ ] OIDC production redirect URLs registered
- [ ] Rate limits and quotas configured
- [ ] On-call notified of go-live date
- [ ] Status page subscriber list for customer contacts
- [ ] Support tier assigned ([support-severity-matrix-v1.md](./support-severity-matrix-v1.md))

## Phase D — Go-live day (T-0)

| Time | Action |
|------|--------|
| H-2 | Freeze customer config changes |
| H-0 | Enable production DNS / routing |
| H+0 | Smoke checklist (below) |
| H+2 | CSM check-in call |
| H+24 | Review audit_log volume + errors |

### Production smoke checks

```bash
# Replace URLs and credentials with customer prod values
curl -sf "https://api.{{domain}}/health"
curl -sf -H "Authorization: Bearer $TOKEN" "https://api.{{domain}}/v1/cases?limit=1"
# Optional: prove scripts against prod (read-only service account)
```

- [ ] Health endpoints green (8080–8084 or gateway equivalent)
- [ ] JWT tenant matches RLS (`tenant_id` in token)
- [ ] One case create + list round-trip
- [ ] Audit event visible in `GET /v1/audit/events`

## Phase E — Hypercare (T+1 to T+14)

- Daily standup with customer (15 min)
- Weekly metrics: latency, error rate, open cases
- Escalation path tested once (tabletop)

## Rollback

If smoke fails on T-0: disable customer routing, keep staging active, open P1 per severity matrix. Document in post-incident template.

## Artifacts to deliver to customer

- Admin guide (console + API)
- API key rotation procedure
- Support contacts + severity definitions
- Link to status page
