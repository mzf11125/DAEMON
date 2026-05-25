# Capacity plan v1

Phase 2.3 deliverable. Establishes baseline capacity assumptions, autoscaling targets, and load-test methodology before customer pilot traffic in Phase 4.

## GA traffic assumptions (placeholder — refine in Phase 4)

| Dimension | Assumption | Source |
|-----------|------------|--------|
| Tenants at GA | 5 (1 design partner + 4 internal) | Phase 4 customer pilot |
| Concurrent analyst users / tenant | 5 | Internal estimate |
| Peak signal generation | 1,000 / hour / tenant | seed pipelines + customer ingestion estimate |
| Peak case opens | 50 / hour / tenant | derived: 5% of signals open cases |
| Peak ingestion job throughput | 10 jobs / minute (system-wide) | Job manifest estimate |
| Peak rules evaluations | 200 / hour / tenant | rules-engine triggers |
| MCP tool calls | 200 / hour / tenant (P3) | Read-only pattern + propose flows |
| Audit events / day / tenant | 50,000 | actions × 10 + read events |

10× headroom (load test target): all rows × 10.

## Per-service capacity baselines

| Service | Replicas (prod) | CPU req / pod | Mem req / pod | Pods @ peak (est) | HPA max |
|---------|-----------------|---------------|---------------|-------------------|---------|
| platform-api | 3 | 200m | 384Mi | 4 | 12 |
| ontology-service | 3 | 200m | 512Mi | 5 | 12 |
| ingestion-service | 2 | 200m | 512Mi | 4 | 8 |
| rules-engine | 2 | 250m | 768Mi | 3 | 6 |
| case-service | 3 | 200m | 384Mi | 4 | 8 |
| console-web | 2 | 100m | 256Mi | 3 | 6 |
| control-plane | 2 | 100m | 256Mi | 2 | 4 |
| agent-bridge | 2 | 200m | 512Mi | 2 | 4 |
| agent-service | 2 | 500m | 1Gi | 3 | 8 |
| audit-archival | 0 (CronJob hourly) | 200m | 512Mi | 1 / run | n/a |
| otel-collector | 2 | 200m | 512Mi | 3 | 6 |

Aggregate at GA load: ~32 pods steady, ~70 pods at peak. Cluster sized for 100 pods + system overhead → 8 cores / 16Gi nodes × 4 minimum (Phase 1.1 detail).

## Managed-service capacity

| Service | Tier (start) | Justification | Scale trigger |
|---------|-------------|---------------|---------------|
| Supabase Cloud | Pro / dedicated compute | RLS-heavy queries; tenant scoping | CPU > 70% sustained 1h |
| ClickHouse Cloud | Production tier; 1 service / env; auto-scale on | OLAP workload; cold archive separate | Disk > 70% or query time > target |
| Neo4j Aura | Professional 4GB | Graph queries are sparse | Memory > 80% sustained |
| Object store (S3) | Standard + Object Lock | Audit archive + attachments | Bucket size review monthly |
| HCP Vault | Standard tier | Secrets footprint moderate | Secret count or RPS > tier limit |

## Load-test methodology

Phase 2.3 implementation:

1. **Tool**: k6 (preferred) or Vegeta. Lives under `scripts/load-test/`.
2. **Scenarios**:
   - `signal-flood.js` — 10× peak signal generation across tenants.
   - `case-burst.js` — 10× peak case opens with role + tenant variation.
   - `agent-mcp.js` — sustained MCP `ontology_list_objects` at 10× expected rate.
   - `mixed-realistic.js` — combined workload at 1× and 10×.
3. **Targets**:
   - SLOs from [`slo-spec-v1.md`](./slo-spec-v1.md) hold at 1×.
   - At 10×, latency degrades but error rate stays < 1%.
   - HPA scales up + back down within 5 minutes of load change.
   - No managed-service rate-limit hits at 1× sustained.
4. **Cadence**: monthly load test on staging; quarterly soak test (4h sustained 1×).

## Autoscaling policy

Per-service HPA in chart `values.yaml`:

- Scale on CPU **and** memory utilization.
- ScaleUp stabilization 30s; allow rapid expansion.
- ScaleDown stabilization 5min; conservative shrink.
- HPA min replicas ≥ PDB minAvailable + 1.

Optional: KEDA-based custom metric scaling on `daemon_request_rate` (Phase 2.3 if peak headroom isn't met by CPU triggers).

## Cost guardrails

- Resource quotas per namespace per [`infra/kubernetes/base/resourcequotas.yaml`](../../infra/kubernetes/base/resourcequotas.yaml).
- Alerts when monthly cloud spend > forecast + 20%.
- Quarterly FinOps review: rightsizing, unused capacity, spot/preemptible candidates for non-critical batch.

## Phase tie-in

| Phase | Action |
|-------|--------|
| Phase 1 | Helm chart `values.prod.yaml` with `requests`/`limits` table above. |
| Phase 2 | Stand up k6 harness; run 1× and 10× on staging; record results in [`production-readiness-v1.md`](./production-readiness-v1.md). |
| Phase 4 | Re-baseline against real customer pilot traffic; revise targets. |
| Phase 6 | Soak test at expected GA + 25% headroom; sign-off in dress rehearsal. |
| Phase 7 | GA cluster size confirmed; HPA active. |

## Related

- [`production-readiness-v1.md`](./production-readiness-v1.md)
- [`slo-spec-v1.md`](./slo-spec-v1.md)
- [`infra/helm/platform-api/values.yaml`](../../infra/helm/platform-api/values.yaml)
- [`infra/kubernetes/base/resourcequotas.yaml`](../../infra/kubernetes/base/resourcequotas.yaml)
