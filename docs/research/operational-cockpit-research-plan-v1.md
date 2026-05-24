# Operational cockpit research plan v1

**Status:** Documented now; **live sessions deferred** until Phase B2 UI ships (A-RES-01).

## Background

Operational Parity v1 proves the **operational loop** (signal → case → decision → audit) under JWT+RLS. This plan defines formative and usability research **after** console routes `/` and `/cases/{id}` are stable.

## Objectives

| ID | Objective |
|----|-----------|
| R1 | Validate ≤3-click golden path is discoverable |
| R2 | Confirm audit strip answers “who decided when?” |
| R3 | Test trust in `summarizeCaseContext` (assistant vs human) |
| R4 | Surface multi-signal case needs |
| R5 | Capture sector-neutral copy feedback |

## Methods and timeline

| Phase | Method | When |
|-------|--------|------|
| Proxy | Internal 30-min walkthrough + `scripts/research/proxy-cockpit-walkthrough.sh` | Now (pre-live UR) |
| Formative | 5–8 interviews, 45 min | **After** B2 UI in staging |
| Usability | 5–8 moderated tasks (T1–T5) | 1 week after formative |
| Optional | Async card sort for nav labels (15+) | If IA confusion in formative |

## Participants

- Investigator, supervisor, compliance viewer profiles.
- **Recruitment TBD** for external pilots (A-RES-02); internal proxies acceptable for first round.

## Logistics

- Remote screen share; staging URL + `analyst@demo.local` seed.
- NDA template per org policy; no partner names in public repo artifacts.

## Usability task script (post–B2)

| Task | Success | Fail if |
|------|---------|---------|
| T1 Sign in | Lands on inbox | Cannot auth |
| T2 Open case from highest-severity signal | Case detail; ≥1 linked signal | Stays on inbox |
| T3 Record decision with reason | Decision visible + audit event | No audit update |
| T4 Find OpenCase + RecordDecision in audit | Both within 60s | Cannot find |
| T5 Supervisor read-only | Views signals + audit | 403 or empty |

**Metrics:** time-on-task, errors, assists, SEQ per task, SUS post-session.

## Interim validation (no live users)

| Proxy | Owner | Gate |
|-------|-------|------|
| E2E_FULL CI | Engineering | Phase B3 |
| Proxy walkthrough script | Product | This doc |
| Heuristic UX audit | UX | [`docs/ux/operational-cockpit-flow-v1.md`](../ux/operational-cockpit-flow-v1.md) |

## Synthesis

After live sessions, complete [`operational-cockpit-synthesis-v1.md`](operational-cockpit-synthesis-v1.md).

## Handoff

| Finding type | Destination |
|--------------|-------------|
| IA / nav | UX spec |
| Copy / trust | Case detail + AIP prompts |
| Missing features | Assumption register + roadmap |
| Blockers | Stop-the-line if &lt;70% T1–T4 in pilot |
