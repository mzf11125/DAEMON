# Staging failover drill (Phase 6)

## Objectives

- Validate multi-AZ pod reschedule (platform-api, ontology-service)
- Validate managed DB failover behavior (Supabase/CH — vendor runbooks)
- Measure RTO/RPO against [slo-platform-v1.md](./slo-platform-v1.md)

## Steps

1. Record baseline: `kubectl get pods -n daemon-platform`
2. Cordon one node; verify PDB maintains minAvailable
3. Simulate AZ loss (provider console or node drain)
4. Verify `/health` on gateway returns 200 within RTO target
5. Document in [runbook-exercise-log-v1.md](./runbook-exercise-log-v1.md)

## Pass criteria

- No data loss on audit ingest (Postgres)
- ArgoCD self-heal restores desired state within 15m
