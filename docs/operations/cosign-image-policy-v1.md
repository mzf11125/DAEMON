# Cosign image policy (Phase 2)

## Requirement

Production and staging GitOps sync MUST reference images by **digest**, verified with **cosign** signature from the release pipeline.

## Workflow

1. CI builds and pushes `ghcr.io/daemon-blockint-tech/<service>@sha256:...`
2. Release job signs with cosign key in GitHub OIDC (`supply-chain.yml` documents policy; signing job added when registry write enabled).
3. Helm `values.prod.yaml` sets `image.digest` — never floating `latest`.
4. ArgoCD sync fails policy check if digest missing (OPA/Gatekeeper optional Phase 2.2).

## Evidence

- SBOM artifacts: `.github/workflows/supply-chain.yml` → `sbom-*.spdx.json`
- This policy doc + PR checklist item in `docs/governance/github-rulesets-v1.md`
