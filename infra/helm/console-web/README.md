# console-web Helm chart

Chart for [`apps/console-web`](../../../apps/console-web).

> **Alternative deploy path:** `console-web` can also deploy to **Vercel** (Next.js native). The chart targets the K8s path. Decision per environment lives in `infra/gitops/apps/platform/console-web.yaml` (Phase 1.1) — staging on K8s, prod TBD.

## Layout

Follows the same standards as [`infra/helm/platform-api/`](../platform-api/). Differences:

- Next.js port `3000`
- Probes hit `/api/health` (Next.js route)
- Ingress enabled by default with cert-manager (vs platform-api routed via gateway)
- Read-only root FS requires `.next` cache pre-built into image; runtime writes restricted to `/tmp`

## Production note

When prod deploys to Vercel, this chart is staging-only and the prod Application points to a different source. Document the choice in `docs/architecture/adr-console-runtime-v1.md` (TBD).
