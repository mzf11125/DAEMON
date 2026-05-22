# Operational cockpit flow v1

Industry-agnostic operator path: **Signal → Case → Decision → audit**. Handoff target: **ui-software-engineer** for visual polish; this doc is the **contract** for routes, IA, and acceptance.

## Personas

| Persona | Goal | v1 scope |
|---------|------|----------|
| Investigator | Open case from signal, record decision | Full write path |
| Supervisor | Review case + audit read-only | Read path (same JWT, analyst role today) |
| Compliance viewer | Reconstruct who decided what | Audit strip + platform-api read |

## Information architecture

```text
/                    Signal inbox + case list (operator home)
/cases/{caseId}      Case detail (golden path)
/dev                 Ingestion, rules, Dune demo (non-operator)
```

**Golden path ≤ 3 clicks:** inbox → open case → record decision.

## Screen specs

### S1 — Inbox (`/`)

| Element | Behavior |
|---------|----------|
| Signal table | Sort by severity; row action **Open case** |
| Open case | `POST OpenCase` with `signalIds: [primaryKey]`; navigate to `/cases/{id}` |
| Case list | Link each row to `/cases/{caseId}` |
| Copy | Sector-neutral: “Signal”, “Investigation case”, “Decision” (no AML-only labels) |
| Errors | 401 → re-auth hint; 502 → service unavailable; 403 → missing role |

### S2 — Case detail (`/cases/{caseId}`)

| Element | Behavior |
|---------|----------|
| Header | Case id, title, status |
| Linked signals | From `getCase` / `signalIds`; optional `GET …/links` |
| Context summary | `summarizeCaseContext` (DB-backed; loading + error states) |
| Audit strip | `listAuditEvents(resourceType=Case, resourceId=…)`; show OpenCase + RecordDecision |
| Decision form | Outcome + rationale → `recordDecision`; disable while submitting |
| Close case | Phase post–v1 or existing action if exposed |

### S3 — Dev tools (`/dev`)

| Element | Behavior |
|---------|----------|
| Placement | Not linked from operator golden path on home (link only in footer or admin) |
| Content | Rules evaluate, ingestion triggers, Dune demo |

## Flows

### F1 — Open case from signal

1. Analyst reviews signals on `/`.
2. **Open case** sends `signalIds: [primaryKey]` to `POST /v1/actions/OpenCase`.
3. Backend: validate signals, insert `case_signals`, optional Neo4j `SignalLinkedToCase`.
4. Console navigates to `/cases/{caseId}`.

### F2 — Record decision

1. On case detail, analyst submits decision form.
2. `POST RecordDecision` → updates case + audit row for Case.
3. Audit strip refreshes; user sees ≥2 events (open + decision) under E2E_FULL.

### F3 — Agent assist (read-only, Phase G)

1. MCP `investigate_case` bundles signals + audit (no auto OpenCase).
2. Human confirms OpenCase in console when ready.

## Acceptance criteria (v1)

| ID | Criterion | Verification |
|----|-----------|--------------|
| UX-AC-01 | Linked signals visible on case detail | Manual + `getCase.signalIds` |
| UX-AC-02 | Audit shows OpenCase and RecordDecision on Case | `E2E_FULL` audit count ≥ 2 |
| UX-AC-03 | `summarizeCaseContext` returns non-empty when links exist | e2e-smoke |
| UX-AC-04 | Dev tools not required for operator demo | Home links to cases, not `/dev` only |
| UX-AC-05 | Destructive actions (close case) require confirm when exposed | Component test / manual |
| UX-AC-06 | Record decision copy states human authority (no “auto-approved”) | Copy review |

## Non-goals (v1)

- Workshop-style app builder, drag-and-drop layouts, sector-specific AML panels.
- Separate supervisor role UI (403 vs read-only distinction post–v1).
- Mobile-native layouts.

## Related

- [`docs/lifecycle/dx-paper-cuts-v1.md`](../lifecycle/dx-paper-cuts-v1.md)
- [`docs/traceability/foundry-parity-v1.md`](../traceability/foundry-parity-v1.md)
- [`docs/research/operational-cockpit-research-plan-v1.md`](../research/operational-cockpit-research-plan-v1.md)
