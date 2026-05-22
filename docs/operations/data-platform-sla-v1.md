# Data platform SLA v1 (demo)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Data freshness (CH max observed_at) | &lt; 24h vs wall clock | `scripts/data-health-check.sh` |
| Ingestion job completion | pending → completed &lt; 5 min | `GET /v1/jobs/{id}` |
| Rules evaluate latency | p95 &lt; 10s local | service logs |
| Store health | PG/CH/Neo4j up | compose healthcheck |

Production SLOs: see `docs/operations/slo-spec-v1.md`.
