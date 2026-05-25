# RB-DR-01 — Region failover

**Severity:** P1 (platform unavailable in primary region)
**Owner:** Platform on-call
**Estimated time:** 2–4h to RTO; 4–8h to full restoration
**Last drilled:** TBD (Phase 2 first drill)

## Pre-conditions

- Customer impact confirmed in primary region (Supabase Cloud, ClickHouse Cloud, Neo4j Aura, or K8s control-plane unavailable).
- Status page incident created (P1 template — [`incident-comms-templates-v1.md`](../incident-comms-templates-v1.md)).
- Incident commander appointed; war room opened.

## Decision tree

| Failure | Action |
|---------|--------|
| K8s cluster control-plane only | Restart workloads via cloud console; no failover |
| Single managed service down (SB / CH / Neo4j) | Vendor-side recovery; runbooks RB-DR-02..04 |
| Whole region (cluster + ≥1 managed service) | **Execute this runbook** |

## Failover steps

1. **Confirm scope.** Verify primary region is unrecoverable (vendor status pages + own probes). If recoverable < RTO, choose recovery over failover.
2. **Freeze writes.** Pause non-DR ArgoCD sync windows; stop ingestion CronJobs; switch console-web maintenance banner ON via feature flag.
3. **Promote managed services in DR region.**
   - Supabase Cloud: trigger PITR restore to DR project (already provisioned in Phase 1.2). RPO ≤ 1h.
   - ClickHouse Cloud: promote DR replica.
   - Neo4j Aura: restore from latest snapshot to DR instance.
4. **Switch DNS.** Update DNS provider record set: `api.daemon.example.com` → DR ingress LB. TTL ≤ 60s baseline.
5. **Activate DR cluster.** ArgoCD on DR cluster syncs `infra/gitops/apps/` against the same `main` revision. Verify all Applications healthy.
6. **Re-issue secrets.** External-secrets-operator on DR cluster pulls from Vault. Verify Vault is multi-region or accessible from DR cluster.
7. **Validate.** Run smoke chain against DR URLs:
   ```bash
   PLATFORM_API_URL=https://api-dr.daemon.example.com \
   ONTOLOGY_SERVICE_URL=https://api-dr.daemon.example.com/ontology \
   ./scripts/prove-staging-smoke.sh
   ```
8. **Lift maintenance banner.** Console banner OFF.
9. **Comms.** Status page update; customer email; internal exec brief.

## Roll back to primary (when primary recovers)

1. Drain writes from DR before cutover (stop ingestion).
2. Replicate DR state back to primary (Supabase logical replication, CH backup → restore).
3. Switch DNS back; verify smoke; lift banner.
4. Schedule post-incident review per [`post-incident-template.md`](../post-incident-template.md).

## RPO / RTO measurement

- **RTO target:** 4h (from incident open to API healthy on DR).
- **RPO target:** 1h (data loss measured by max `observed_at` lag in `dataset_observations`).
- Record both in DR drill log [`dr-drill-log.md`](../dr-drill-log.md).

## Compliance evidence

- SOC 2 A1.2 (availability commitments) + CC7.5 (recovery)
- ISO 27001 A.5.30 (ICT readiness for business continuity)
- HIPAA 45 CFR 164.308(a)(7) (contingency plan)
- GDPR Art. 32(1)(c) (restore availability and access)

## Related

- [`RB-DR-02.md`](./RB-DR-02.md) — Postgres PITR restore
- [`RB-DR-03.md`](./RB-DR-03.md) — ClickHouse restore
- [`RB-DR-04.md`](./RB-DR-04.md) — Neo4j restore
- [`RB-DR-05.md`](./RB-DR-05.md) — Total tenant data loss
- [`dr-drill-log.md`](../dr-drill-log.md) — quarterly drill record
