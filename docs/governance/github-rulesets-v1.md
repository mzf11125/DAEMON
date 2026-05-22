# GitHub rulesets v1 (DAEMON)

Operational mirror of [daemon-maturation-gates-v1.md](./daemon-maturation-gates-v1.md). Configure in **Settings → Rules → Rulesets** (repo admins). Rulesets are readable to anyone with read access; only admins edit them.

Reference: [About rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets).

## Branch ruleset — `main`

| Rule | Setting |
|------|---------|
| Target | Default branch `main` |
| Require pull request | Yes (no direct push) |
| Block force push | Yes |
| Required status checks | See table below |
| Bypass | Repo admins / release automation only |

### Required status checks (verify exact names in a PR Checks tab)

| Check name | Workflow / job |
|------------|----------------|
| `validate` | CI → job `validate` |
| `aip-eval` | AIP eval → job `aip-eval` |
| `integration` | CI → job `integration` |
| `policy` | Maturation gates → job `policy` |

If GitHub shows a different display name, use the name from the latest green PR.

**Rollout:** create ruleset as **Disabled**, merge one green PR to `main`, then set **Active**.

## Push ruleset (optional)

| Restriction | Path pattern |
|-------------|----------------|
| Block env secrets | `**/.env`, `**/.env.*` (except `.env.example`) |
| Block keys/certs | `**/*.pem`, `**/*credentials*` |
| Block compiled ontology in git | `ontology/v2-compiled/**` |

## Submodule

CI checkout must use `submodules: recursive` so `external/daemon-system-ontology` is present for vendored parity and future test-compose sync.

## When merge is blocked

1. Open the failed check log (validate / aip-eval / integration / policy).
2. Reproduce locally: `make ontology-sync`, `make ontology-validate`, `./scripts/prove-aip-eval.sh`, `make test-integration`.
3. Do not bypass required checks for maturation-sensitive paths without admin + documented exception.
