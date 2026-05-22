# Operate the cockpit v1

For investigators using the web console (non-technical SOP).

## Prerequisites

- URL to console (local: `http://localhost:3000`)
- Credentials: `analyst@demo.local` / `analyst` (dev only)

## Steps

1. Sign in.
2. On **Inbox**, review signals (severity helps prioritization).
3. Select **Open case** on a signal → you land on **Case detail**.
4. Review **linked signals** and **context summary**.
5. Enter **outcome** and **rationale** → **Record decision**.
6. Confirm **audit** shows case opened and decision recorded.

## Proof for compliance

Use audit timeline on case detail, or API `GET /v1/audit/events?resourceType=Case&resourceId={id}`.

## Proxy validation (no live research)

Run `scripts/research/proxy-cockpit-walkthrough.sh` checklist.
