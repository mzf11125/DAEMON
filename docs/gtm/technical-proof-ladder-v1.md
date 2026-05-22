# Technical proof ladder v1

GTM wedge deferred; v1 proves the **operational loop** only.

| Rung | Proof artifact |
|------|----------------|
| L0 | `make demo` / health endpoints |
| L1 | `scripts/e2e-smoke.sh` |
| L2 | `E2E_FULL=1` + `case_signals` + audit GET |
| L3 | `./scripts/prove-operational-loop.sh` |
| L4 | Console `/` → `/cases/{id}` manual demo |

Next rung (post-v1): sector pack with live rules + pilot customer KPIs.
