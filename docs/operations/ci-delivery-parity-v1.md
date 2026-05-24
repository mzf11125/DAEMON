# CI/CD delivery parity v1

Maps **continuous delivery concepts** (public CI/CD narrative) to Daemon repo mechanics — **not** vendor CD product integration.

| CI/CD concept | Daemon equivalent |
|----------------|-------------------|
| Release channel | GitHub Actions → staging → tagged release |
| Environment promotion | `docs/operations/staging-deploy-v1.md`, docker-compose profiles |
| Artifact registry | Container images + MinIO for attachments |
| Change management | GitHub rulesets, merge track runbook |
| Verification | Integration tests, `make prove-operational-loop` |

## Non-goals

- CI/CD control plane API usage
- Vendor-specific deployment agents

## Related

- [`merge-track-runbook-v1.md`](merge-track-runbook-v1.md)
- [`release-tagging-v1.md`](release-tagging-v1.md)
