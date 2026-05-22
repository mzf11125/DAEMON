# SLO spec v1 (user journeys)

| ID | Journey | SLI | Target (demo) |
|----|---------|-----|---------------|
| J-01 | List signals | ontology GET latency | p95 &lt; 500ms local |
| J-02 | Run rules | evaluate success rate | 99% when CH seeded |
| J-03 | Open case | action 2xx with analyst role | 100% authorized |
| J-04 | Ingestion job | completed within 5 min | seed-csv |
| J-05 | Console health | page loads API | manual |
| J-06 | MCP list objects | tool success | eval pass |

Error budgets and paging: production program — pair with `sla-slo-engineer` patterns.
