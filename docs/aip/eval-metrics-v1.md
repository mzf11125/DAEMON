# Eval metrics v1

| KPI | Sprint target | Measurement |
|-----|---------------|-------------|
| Golden pass rate | 100% before AIP merge | `make aip-eval` / CI |
| Eval flake rate | &lt; 10% (7d) | Waivers tagged `flake` |
| Time-to-golden-case | &lt; 2h from prompt change | CHANGELOG log |
| Coverage | 1 agent, 1 case, 2 read tools | This inventory |
| Pre-merge eval runs | 100% of prompt PRs | PR checklist audit |

Record outcomes in `aip/evals/baseline.json` after first green run.
