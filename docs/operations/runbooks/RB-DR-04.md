# RB-DR-04 — Neo4j Aura restore

**Severity:** P2 (graph queries degraded; ontology objects still served from Postgres)
**Owner:** Data engineering on-call
**Estimated time:** 30–60 min for snapshot restore
**Last drilled:** TBD

## Triggers

- Neo4j Aura incident (graph queries failing).
- Bad ontology sync that polluted link types.
- Region failover (RB-DR-01).

## Pre-conditions

- Neo4j Aura with hourly snapshot + 30d retention (Phase 1.2).
- DR Aura instance provisioned (Phase 1.2).
- Vendor-managed restore via Aura console.

## Steps

1. **Triage**: which queries are failing? If only specific link types are affected, defer to a partial rebuild.
2. **Restore from snapshot** via Aura console — pick most recent ≤ 1h-old snapshot.
3. **Update DSN** in Vault: `daemon/<env>/runtime/NEO4J_URI`. Trigger ESO refresh on `ontology-service`.
4. **Verify**:
   ```bash
   curl -sf "$ONTOLOGY_SERVICE_URL/health"
   # Tenant query
   curl -sf -H "Authorization: Bearer $JWT" \
        "$ONTOLOGY_SERVICE_URL/v1/objects/Asset?limit=10"
   ```
5. **Rebuild missing edges** (if snapshot is older than recent action audit):
   - Identify recent ontology actions in `audit_log` since snapshot timestamp.
   - Replay `RecordObservation` / `OpenCase` / etc. via `services/ontology-service` admin endpoint (read from `audit_log` payload, re-execute side effect on Neo4j only).
   - Best-effort: graph writes are non-transactional in scaffold per [`docs/architecture/daemon-mapping.md`](../../architecture/daemon-mapping.md); document gaps and tag for legal review if material.
6. **Run integration suite:** `make test-integration -k Neo4j`.

## Compliance evidence

- SOC 2 A1.2
- ISO 27001 A.8.13 + A.8.14
- HIPAA 45 CFR 164.308(a)(7)(ii)(A)
- GDPR Art. 32(1)(c)

## Notes

- Postgres remains source of truth for ontology object **properties**. Neo4j stores **links**. A link gap is recoverable from action audit because every action is recorded in `audit_log`.
- If `audit_log` itself is degraded, this runbook is downstream of RB-DR-02.
