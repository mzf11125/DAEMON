# DAEMON — Architecture & Security Audit

**Repository:** [github.com/daemon-blockint-tech/DAEMON](https://github.com/daemon-blockint-tech/DAEMON)
**Audit date:** 2026-06-05 · **Commit:** `5f11592` (Create snyk-security.yml)
**Lens:** Zero-failure, no false-positive. Every finding below is backed by a file:line citation. Severity reflects exploitability **as the code currently ships**, not theoretical risk.

---

## Verdict

The platform is architecturally coherent and well-documented, but the **security-governance layer is largely decorative**. The authorization model resolves identity but never enforces it, multi-tenancy is asserted from an unauthenticated header, and the richest policy code (RBAC/ABAC/RLS/zero-trust) is dead. In its current state the gateway is **not safe to expose to untrusted callers**. None of the CRITICAL findings are speculative — each is reproducible from the cited code path.

| Severity | Count |
|---|---|
| Critical | 4 |
| High | 4 |
| Medium | 5 |
| Low / Hygiene | 4 |

---

## CRITICAL

### C1 — Cross-tenant access: tenant is taken from a client header, never bound to the session
The authenticated session carries `tenantId`, but every controller derives tenant scope from the `X-Daemon-Tenant` request header via `TenantContextService.resolve()` and **never compares it to `session.tenantId`**.

- `api/gateway/src/platform/tenant-context.ts:24` — `tenantId = headerValue(headers["x-daemon-tenant"]) ?? DEFAULT_TENANT_ID`
- `api/gateway/src/write/write.service.ts:22` — scope built from `ctx` only; `session` is passed downstream but its tenant is never checked against `ctx.tenantId`.

**Impact:** Any holder of a valid credential for tenant A can read/write tenant B's data simply by setting `X-Daemon-Tenant: B` (as long as the tenant exists and has the domain enabled). Classic IDOR / broken tenant isolation.
**Fix:** In `resolve()` (or a guard that runs after `AuthGuard`), require `header.tenant === session.tenantId` unless the subject holds an explicit cross-tenant role; default-deny otherwise.

### C2 — Policy decisions ignore the caller entirely (no subject/role/attribute in the decision)
`PolicyGuard` calls `policy.check(action, resource)` with **no session, roles, tenant, or resource instance**. The Rust engine likewise matches only `action`+`resource`.

- `api/gateway/src/auth/policy.guard.ts:54` — `this.policy.check(spec.action, spec.resource)`
- `api/gateway/src/policy/policy.service.ts:20` — `check(action, resource)` signature has no subject.
- `security-governance/policy/src/lib.rs:44` — `evaluate(&self, action, resource)` matches rule on `action`/`resource` only.

**Impact:** Authorization is role-blind. A session with zero roles passes the exact same policy check as an admin. RBAC is effectively absent on the live path.
**Fix:** Thread `DaemonSession` (subject, roles, tenant) and the resource instance into `PolicyService.check` and the Rust engine; evaluate roles/attributes, not just verb+noun.

### C3 — Read endpoints are unauthenticated AND unauthorized (dead `@PolicyCheck`)
`ReadController` decorates routes with `@PolicyCheck("read","entity")` but **omits `@Protected()`**. `PolicyGuard` returns `true` immediately for any route that is not `@Protected`, so the policy check never runs, and `AuthGuard` does not require a session for non-protected routes.

- `api/gateway/src/read/read.controller.ts:14,30` — `@PolicyCheck` present, `@Protected` absent.
- `api/gateway/src/auth/policy.guard.ts:39-41` — `if (!isProtected) return true;` short-circuits before the policy check.
- `api/gateway/src/auth/auth.guard.ts:46-48` — session only required when `isProtected`.

**Impact:** `GET /v1/read/entities` and `GET /v1/read/entities/:id` are fully open. Combined with C1, an anonymous caller reads any tenant's entities by choosing the header.
**Fix:** Add `@Protected()` to all read routes; make `PolicyGuard` enforce `@PolicyCheck` independently of `@Protected`, or fail-closed when a route declares `@PolicyCheck` but isn't protected.

### C4 — Webhook & listener ingest are unauthenticated by default; signature check is fail-open
`POST /v1/ingest/webhooks/:sourceId` and `/listeners/:id/events` have `@PolicyCheck` but no `@Protected` (same dead-decoration as C3). Their only defense, HMAC verification, **returns immediately when the secret env var is unset**.

- `api/gateway/src/ingest/ingest.controller.ts:93-94,115-116` — `@PolicyCheck` without `@Protected`.
- `api/gateway/src/ingest/ingest-webhook.service.ts:15-16` — `const secret = process.env.DAEMON_WEBHOOK_HMAC_SECRET; if (!secret) return;`

**Impact:** With the default config (no `DAEMON_WEBHOOK_HMAC_SECRET`), anyone can inject arbitrary records into any tenant's ontology via the webhook endpoint — unauthenticated write to the source of semantic truth.
**Fix:** Fail-closed: reject if the secret is unconfigured in production. Require `@Protected` or a mandatory shared-secret/mTLS on these external entry points. Pin the tenant to a per-source binding rather than the inbound header.

---

## HIGH

### H1 — Entire RBAC/ABAC/RLS/identity/trust subsystem is dead code
The `@daemon/security-governance` package only exports `policy-engine.js`, `prompt-guard.js`, and `audit-port-adapter.js`. RBAC, ABAC, row-level/field-level policy, identity (authn/authz/federation), and trust (secret-broker, zero-trust-gateway, key-management) are imported by **nothing except their own tests**.

- `security-governance/package.json:exports` — only three modules exported.
- Verified: no non-test import of `policy/rbac`, `policy/abac`, `policy/row-level-policy`, `identity/*`, or `trust/*` anywhere in `api/`, `read-write-loops/`, or `products/`.

**Impact:** The platform's strongest security primitives provide zero runtime protection. They give a false impression of defense-in-depth (and pass their unit tests) while the live path uses the role-blind stub engine (C2).
**Fix:** Wire `Rbac`/`Abac`/`RowLevelPolicy` into the read/write loop and policy service, or remove them and stop advertising the capability. Do not ship security code that isn't on the request path.

### H2 — `authorization: Bearer <jwt>` is decoded **without signature verification**
In dev mode, bearer tokens are accepted by base64-decoding the payload — no signature, no `exp`, no issuer/audience check. Production verification is explicitly "out of scope."

- `api/gateway/src/auth/auth.service.ts:104-118` — `decodeJwtClaims` splits on `.` and `JSON.parse`s the middle segment; roles/tenant taken verbatim from unverified claims.

**Impact:** In any environment left in `dev` auth mode, an attacker forges a JWT with `roles:["admin"]` and `tenant:"victim"` and is fully trusted. The mode gate (`this.mode !== "dev"`) is the only guard, and the default mode is `dev`.
**Fix:** Implement OIDC/JWKS signature + `exp`/`aud`/`iss` verification before GA; never accept unverified claims even in dev. Make non-dev the default.

### H3 — Built-in admin API key when `DAEMON_API_KEYS` is unset
If no keys are configured and mode is `dev`, the service auto-provisions `daemon-dev-key` with `roles:["admin"]`, tenant `default`. This key is published in `README.md`, `CLAUDE.md`, and `.env.example`.

- `api/gateway/src/auth/auth.service.ts:170-177` — auto-insert of `daemon-dev-key` (admin).

**Impact:** A deployment that forgets to set `DAEMON_API_KEYS` and `DAEMON_AUTH_MODE=prod` exposes a publicly-known admin key. Default-insecure.
**Fix:** Refuse to boot without explicit keys outside dev; never embed a default admin credential.

### H4 — Snyk CI references a non-existent Dockerfile / image, and SAST gating is ambiguous
`snyk-security.yml` runs `docker build -t your/image-to-test .` and `snyk container monitor ... --file=Dockerfile`, but **no Dockerfile exists** in the repo. The placeholder `your/image-to-test` was never customized.

- `.github/workflows/snyk-security.yml` — `docker build ... .`, `--file=Dockerfile`; repo has no `Dockerfile` (deployment uses `deployment/docker/`).
- `snyk code test --sarif > snyk-code.sarif` with the `|| true` commented out means a real SAST finding fails the build — good — but the broken container step will fail first, masking signal.

**Impact:** The container security job is dead on arrival; results are never produced. The workflow gives a green/red signal unrelated to actual container posture.
**Fix:** Point Snyk at the real Docker build context under `deployment/docker/`, or drop the container job. Decide intentionally whether SAST should gate (remove dead comments).

---

## MEDIUM

### M1 — Exception filter leaks internal error messages to clients
The catch-all returns `exception.message` verbatim with HTTP 500.
- `api/gateway/src/daemon-exception.filter.ts:64-69` — `message: exception instanceof Error ? exception.message : "internal server error"`.
**Impact:** Stack-adjacent details (DB errors, connection strings in driver messages, internal paths) can leak to callers. **Fix:** Return a generic message + correlation id for unhandled errors; log details server-side only.

### M2 — Policy server is a raw TCP socket with `unwrap_or_default()` and no auth/limits
- `security-governance/policy/src/bin/policy-server.rs:9-11` — `read_to_string` (unbounded), `serde_json::from_str(...).unwrap_or_default()`, no auth, no size cap, blocking single-threaded accept loop.
**Impact:** Unauthenticated internal service; trivially DoS-able (slowloris/large body), and a malformed body silently degrades to empty action/resource → deny, but the read is unbounded. **Fix:** Use an HTTP framework with body limits, timeouts, and mTLS/network policy; bound the read.

### M3 — Default policy rules are allow-all for entity read/write
The Rust server's default `POLICY_RULES_YAML` allows `read:entity` and `write:entity` unconditionally; the TS `devDefaultDecision` does the same.
- `security-governance/policy/src/bin/policy-server.rs:31-33`; `api/gateway/src/policy/policy.service.ts:9-14`.
**Impact:** A misconfigured deployment that starts the policy server without supplying rules is allow-all on the core verbs. **Fix:** Default to deny; require explicit rule provisioning.

### M4 — Tenant-mismatch returns a misleading 403 path, but no authz on domain enablement vs. session
`TenantContextService` validates that the *tenant* enables the *domain*, but never that the *session* may act in that tenant (the C1 root cause restated at the domain layer).
- `api/gateway/src/platform/tenant-context.ts:38-44`.
**Fix:** Same as C1 — bind to session.

### M5 — `loadRepoEnv()` parses `.env` by hand and walks up two parent directories
- `api/gateway/src/main.ts:9-37` — reads `../.env` and `../../.env`.
**Impact:** In a shared host this can pick up an unintended parent `.env`; naive parser ignores quoting/escaping and could mis-handle values. **Fix:** Use a vetted dotenv loader scoped to the app root; never traverse upward in production images.

---

## LOW / HYGIENE

- **L1 — `SECURITY.md` is the GitHub template stub** (placeholder versions `5.1.x`, "Tell them where to go…"). No real disclosure contact. `SECURITY.md`. Fix: real contact + SLA.
- **L2 — Rust workspace is `license = "UNLICENSED"`** while the repo ships `LICENSE` = Apache-2.0. `Cargo.toml:workspace.package`. Inconsistent licensing metadata.
- **L3 — Go `ValidateSession` checks presence only** (no expiry, signature, or role validation). `security-governance/authn/session.go:11-20`. Acceptable as a struct validator, but don't mistake it for authentication.
- **L4 — CodeQL config uses a custom query suite at repo root** (`important-only.qls`) which can narrow coverage. `.github/codeql.yml` + `important-only.qls`. Confirm it isn't suppressing security queries.

---

## What is genuinely solid (to avoid false alarms)

- **Cypher guardrails are well-built.** Read-only keyword denylist, multi-statement detection via a hand-rolled linear scan (explicitly ReDoS-safe), length cap, and mandatory `$tenantId`/`$domainId` parameterization. `products/ontology-query/validate-cypher.ts`.
- **Production policy path fails closed** when an upstream engine is required and unreachable/unconfigured — the *logic* is correct; the problem is the decision lacks subject context (C2), not the fail-closed posture. `api/gateway/src/policy/policy.service.ts:33-66`.
- **Webhook HMAC uses `timingSafeEqual` with length pre-check** — constant-time done right; the flaw is the fail-open default (C4), not the comparison.
- **Bounded-context discipline is real and CI-enforced** (`check:architecture`, `check:tenancy-config`, `check:governance-policies`), and `CLAUDE.md` documents the gateway composition-root rule. Architecture hygiene is above average.
- **Dependency hygiene**: pinned `pnpm` overrides remediate known-vuln transitive deps (multer, qs, ajv, etc.); Go bumped to 1.26.3 for stdlib CVEs.

---

## Prioritized remediation order

1. **C1 + C3 + C4** — close the tenant-from-header and unauthenticated-route holes (these are chainable into full cross-tenant read/write by an anonymous caller). Do this before any external exposure.
2. **C2 + H1** — make authorization role/attribute-aware and put the real RBAC/ABAC/RLS code on the request path (or delete it).
3. **H2 + H3** — real JWT verification; remove default admin key; default to prod auth mode.
4. **H4 + M2 + M3** — fix Snyk container job, harden the policy server, default-deny policy rules.
5. **M1, M4, M5, L1–L4** — hygiene and information-leak cleanup.

---

*Scope note: this is a static, white-box source review of the cited commit. It does not include a running-stack DAST pass, dependency-CVE enumeration beyond the lockfile overrides observed, or review of the private `docs/private/` governance vault (gitignored, not present).*

---

## Remediation appendix (post-audit)

**Remediation commit:** `d7a76d114e9ad0614080d98e98f6a9886cc57901` · **Date:** 2026-06-05  
**Program:** ANTERO + Parity Full Program (Gate 0 closure)  
**Preservation rule:** Body §CRITICAL–§LOW above is the **original due-diligence record** at audit commit `5f11592` and is intentionally unchanged.

### Verification gates (all green @ `d7a76d1`)

| Gate | Command / artifact |
|---|---|
| Route auth | `pnpm run check:route-auth` |
| Architecture | `pnpm run check:architecture` |
| Gateway security integration | `tests/integration/gateway-security.test.ts` |
| Tenancy isolation (incl. ABC) | `tests/tenancy/isolation.test.ts` |
| Full repo tests | `pnpm run test:repo` (Postgres-backed integration when `DAEMON_POSTGRES_URL` set) |

### Finding → fix → test

| ID | Mitigation | Primary files | Test / evidence |
|---|---|---|---|
| **C1** | `resolveBound` binds `X-Daemon-Tenant` to `session.tenantId`; platform-admin override only via `hasPlatformAdmin`; `TenantScopeGuard` applies scope before controllers | `api/gateway/src/platform/tenant-context.ts`, `api/gateway/src/auth/tenant-scope.guard.ts`, `@DaemonScope()` on controllers | `tests/tenancy/isolation.test.ts` (ABC tenants); `gateway-security.test.ts` |
| **C2** | `PolicyService.check` accepts `PolicyCheckInput` (principal + resource scope); local authorizer loads `configs/governance/rbac.yaml`; optional upstream `POST /check` | `api/gateway/src/policy/policy.service.ts`, `api/gateway/src/auth/policy.guard.ts`, `security-governance/policy/src/bin/policy-http-server.rs` | `gateway-security.test.ts`; policy unit tests |
| **C3** | `@Protected()` on read, search, write, ingest (non-webhook), lakehouse, analytics, admin, etc. | `api/gateway/src/read/read.controller.ts` (and peers) | `check:route-auth`; `gateway-http.test.ts` |
| **C4** | Webhook HMAC fail-closed when `DAEMON_WEBHOOK_REQUIRE_HMAC=1` or production policy mode; tenant forced from source catalog scope on webhook routes | `api/gateway/src/ingest/webhook-hmac.ts`, `tenant-scope.guard.ts` (webhook branch) | `gateway-security.test.ts` (webhook ingest fails closed when secret unset) |
| **M2 (policy transport)** | HTTP policy adapter (`policy-http-server.rs`) replaces raw TCP for gateway integration; document `DAEMON_POLICY_SKIP_UPSTREAM=1` for local ABC shadow | `security-governance/policy/src/bin/policy-http-server.rs`, `.env.example` | Manual / integration with `POLICY_ENGINE_URL` |

### Residual (not closed by this remediation)

| ID | Status | Compensating control for Fase 1 shadow |
|---|---|---|
| **H1** | RBAC YAML on local path only; ABAC/RLS packages still not wired to request path | Tenant-bound API keys; no external exposure; read-only ingest |
| **H2** | JWT signature verification not implemented in dev mode | `DAEMON_AUTH_MODE=prod` + OIDC before external GA |
| **H3** | Default `daemon-dev-key` in dev when `DAEMON_API_KEYS` unset | Explicit keys per ABC tenant in staging (`DAEMON_API_KEYS`) |
| **H4** | Snyk container job / Dockerfile path | Out of ANTERO program scope; track separately |

### Executive status

- **Gate 0:** CRITICAL chain (C1+C3+C4 anonymous/cross-tenant read-write) **mitigated** for gateway HTTP surface @ `d7a76d1`.
- **Fase 1 ANTERO shadow:** Authorized to proceed **read-only** with tenant-bound credentials and required webhook HMAC in non-dev environments.
- **Fase 3 governed writes:** Still blocked on residual H1/H2/H3 hardening + non-technical CTO/OS ratification (see `DAEMON_sebagai_Pondasi_ANTERO.md` §5).
