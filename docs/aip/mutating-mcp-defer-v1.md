# Mutating MCP tools — defer checklist

Phase 2 **does not** ship `ontology_execute_action` or automated `OpenCase`.

## Preconditions

1. Golden eval flake rate &lt; 10% over 7 days (`aip/evals/baseline.json`)
2. ≥3 read-only MCP tools in production path (**met** in Phase 2: six read tools)
3. `OpenCase` excluded from automated eval (enforced in case `forbiddenTools`)
4. Risk-tier sign-off documented ([risk-tier-v1.md](./risk-tier-v1.md))

## When approved

- Add `ontology_execute_action` with `requireHumanApproval: true`
- Console parity tests for the same action
- Separate eval suite (not golden) for mutation smoke

## Owner

Platform + compliance review before implementation.
