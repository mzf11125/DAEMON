# Phase 0 operator runbook

One-page sequence for closing Phase 0 after Wave 0 (repo) is green.

## 1. GitHub ruleset (P0.2)

```bash
gh auth status
ENFORCEMENT=active ./scripts/apply-github-ruleset.sh
```

Verify: open repo **Settings → Rules → Rulesets** → `main-production-gates` = **Active**.

## 2. Staging environment (P0.3)

Follow [staging-vm-compose-v1.md](./staging-vm-compose-v1.md) (Option A) or defer to Phase 1 K8s (Option B — delays Phase 0).

Copy [`.env.staging.example`](../../.env.staging.example) → `.env.staging` (local only).

## 3. Staging proofs (P0.4)

```bash
set -a && source .env.staging && set +a
export PHASE0_STRICT=1
./scripts/run-phase0-staging-proof.sh
```

Update staging rows in [oidc-rls-verification-v1.md](./oidc-rls-verification-v1.md).

## 4. Eval baseline D4–D7 (P0.1)

Daily: confirm `aip-eval` workflow green on `main`:

```bash
gh run list --workflow=ci.yml --branch=main --limit=5
gh run list --workflow=aip-eval.yml --branch=main --limit=5
```

Update [agent-maturation-p3-v1.md](../governance/agent-maturation-p3-v1.md) table.

## 5. Tag v0.1.0 (P0.7)

After steps 1–4:

```bash
git tag -a v0.1.0 -m "Phase 0 staging pilot closeout"
git push origin v0.1.0
```

Per [release-tagging-v1.md](./release-tagging-v1.md).

## 6. Mark closeout

Flip P0 rows in [p1-staging-pilot-closeout-v1.md](./p1-staging-pilot-closeout-v1.md) and [production-readiness-v1.md](./production-readiness-v1.md).
