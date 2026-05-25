# Proof ladder matrix (Phase 2 evidence)

| Rung | Proof | Command / doc | Evidence location |
|------|-------|---------------|-------------------|
| L0 | Local unit + integration | `make test`, `make test-audit-archival-integration` | CI logs |
| L1 | Compose staging | `make up-apps`, `make prove-staging-smoke` | [phase-2.5-7-verification-v1.md](./phase-2.5-7-verification-v1.md) |
| L2 | Staging HTTPS | `make phase0-staging-proof` | [oidc-rls-verification-v1.md](./oidc-rls-verification-v1.md) |
| L3 | K8s staging sync | ArgoCD app health | Screenshot / export in ops vault |
| L4 | Prod OIDC_REQUIRED | `values.prod.yaml` + smoke | Phase 7 GA checklist |

Update **Evidence location** column as runs complete; do not store secrets in git.
