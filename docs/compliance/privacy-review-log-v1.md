# Privacy review log v1

Tracks privacy impact review for product features before GA or material change. Complements [gdpr-dpia-platform-v1.md](./gdpr-dpia-platform-v1.md) feature-level assessments.

**Owner:** Product + GRC  
**Status:** Active template

## Log (markdown)

| Review ID | Date | Feature / change | Engineer | PM | New personal data? | New sub-processor? | DPIA required? | Decision | Sign-off (DPO/Legal) | Notes |
|-----------|------|------------------|----------|-----|-------------------|-------------------|----------------|----------|----------------------|-------|
| PR-001 | TBD | Example: agent bridge v1 | | | Y (prompts) | Y (LLM) | Y | Proceed with redaction | TBD | Link agent-redteam |
| PR-002 | TBD | audit_event_class column | | | N (metadata) | N | N | Approved | TBD | Migration 009 |

## CSV template

Copy to GRC tool or `docs/compliance/privacy-review-log.csv`:

```csv
review_id,date,feature,engineer,pm,new_personal_data,new_subprocessor,dpia_required,decision,dpo_signoff,notes
PR-001,,,,,,,,,,
```

## Review checklist (per feature)

- [ ] Data minimization: collect only fields required
- [ ] Purpose limitation documented in ROPA
- [ ] Retention aligned with [audit-retention-v1.md](../governance/audit-retention-v1.md)
- [ ] Tenant isolation tested (RLS)
- [ ] Agent features: HITL and eval gates per [agent-maturation-p3-v1.md](../governance/agent-maturation-p3-v1.md)
- [ ] Sub-processor register updated if needed
- [ ] Customer-facing docs / DPA annex updated if needed

## Escalation

| Trigger | Action |
|---------|--------|
| Special category data | Mandatory Legal + DPIA |
| New country region | Legal + SCC review |
| Automated decision with legal effect | DPIA + customer disclosure |
