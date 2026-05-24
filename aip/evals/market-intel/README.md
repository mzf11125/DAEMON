# Market intel evals (AIP phase 2 gate)

Static eval assets for citation quality and prompt-injection resistance on market-intel paths. MCP tool wiring (`tavily_company_brief`, `tavily_hybrid_research`, etc.) is deferred until CLI prove targets are green in CI.

## Files

| File | Purpose |
|------|---------|
| `injection-probes.json` | 12 canned adversarial queries; must block or refuse via `sanitize_user_query` |
| `citation-golden.json` | Sample Q&A pairs for manual/LLM-judge citation rubric |

## Local gate

```bash
make prove-market-intel-security
```

Runs injection probes against `market_intel.security.sanitize_user_query` and greps recent artifacts for secret patterns.

## CI

Workflow `.github/workflows/aip-eval.yml` includes `pipelines/market-intel/**` path triggers. Full Tavily prove remains optional (requires secrets); security probe runs without Tavily.

## Promotion checklist (tier 2)

- [ ] Golden citation set reviewed
- [ ] Injection probes pass
- [ ] `MARKET_INTEL_MODEL` pinned in manifest
- [ ] Rollback steps in [market-intel-runbook-v1.md](../../../docs/operations/market-intel-runbook-v1.md)
