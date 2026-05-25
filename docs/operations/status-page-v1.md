# Status page (Phase 6)

## Components

| Component | Monitor | Public name |
|-----------|---------|-------------|
| Console | HTTPS synthetic | Console |
| Platform API | `/health` | API |
| Agent bridge | `/health` (internal only — optional degraded banner) | AI Assist |

## Provider

- Recommended: managed status page (Statuspage, Instatus) — procurement
- RSS/webhook integration to `#incidents` channel

## GA requirement

- Public URL linked from security.txt and customer welcome pack
- Incident communication template in [communication-lead playbook](../governance/stop-the-line-policy-v1.md) cross-ref
