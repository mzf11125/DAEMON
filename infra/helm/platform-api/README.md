# platform-api Helm chart

Chart for [`services/platform-api`](../../../services/platform-api). Phase 1.1 skeleton — production-quality scaffold per [`infra/helm/README.md`](../README.md).

## Layout

```
platform-api/
├── Chart.yaml
├── values.yaml             # base values (production defaults)
├── values.staging.yaml     # staging override
├── values.prod.yaml        # prod override (digest-pinned image)
├── templates/
│   ├── _helpers.tpl
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── configmap.yaml
│   ├── externalsecret.yaml # ExternalSecret(s) backed by Vault / cloud secrets
│   ├── serviceaccount.yaml
│   ├── networkpolicy.yaml  # deny-all + allowlist
│   ├── hpa.yaml
│   └── pdb.yaml
└── README.md
```

## Standards enforced

- Image: digest-pinned in prod (`image.digest`), tag allowed only in staging.
- Pod security context: non-root, read-only root FS, dropped caps, seccomp `RuntimeDefault`.
- NetworkPolicy: deny-all + explicit allowlists (defaults restrict ingress to known namespaces).
- HPA: CPU + memory utilization with stabilization windows.
- PDB: `minAvailable: 1` in base, `2` in prod.
- Probes: `/health` (unauthenticated per [api-rest-conventions-v1.md](../../../docs/operations/api-rest-conventions-v1.md)).
- Topology spread + pod anti-affinity for HA.
- ExternalSecret per secret bundle, refreshed hourly.
- ConfigMap checksum annotation forces pod restart on config change.

## Install (do not use directly in prod — use GitOps)

```bash
# Lint chart
helm lint infra/helm/platform-api

# Render templates for review
helm template platform-api infra/helm/platform-api --values infra/helm/platform-api/values.staging.yaml

# Local dev only — production uses ArgoCD sync from infra/gitops/
helm install platform-api infra/helm/platform-api \
  --namespace daemon-platform \
  --create-namespace \
  --values infra/helm/platform-api/values.staging.yaml
```

## Production rollout via GitOps

The chart is referenced from [`infra/gitops/apps/platform/platform-api.yaml`](../../gitops/apps/platform/platform-api.yaml) (ArgoCD `Application`). Image digest updates land via PR; ArgoCD syncs.

## Required secrets (in Vault / cloud secrets manager)

Path layout: `daemon/<namespace>/platform-api/<key>`

| Key | Source | Rotation |
|-----|--------|----------|
| `DATABASE_URL` | Supabase Cloud project (runtime user) | provider-managed |
| `SUPABASE_JWT_SECRET` | Supabase Cloud project (HS256) | annual or on incident |
| `MINIO_ACCESS_KEY` | object-store IAM role | 30 days (Vault dynamic) |
| `MINIO_SECRET_KEY` | object-store IAM role | 30 days (Vault dynamic) |

Rotation policy — see [`docs/architecture/adr-secrets-store-v1.md`](../../../docs/architecture/adr-secrets-store-v1.md).

## Compliance hooks

- SOC 2 CC6.1 / CC6.6 / CC6.7 — encryption + non-root + secrets via vault
- ISO 27001 A.8.5 / A.8.24 / A.8.28 — secure configuration + crypto + secrets
- HIPAA 45 CFR 164.312(a)(2)(iv) / 164.312(e) — encryption at rest + transit (combined with cluster TLS)
