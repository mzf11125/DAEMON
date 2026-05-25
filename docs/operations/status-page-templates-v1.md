# Status page incident communication templates v1

Copy-paste templates for public status page (Statuspage, Instatus, or self-hosted). Customize `{{placeholders}}` per incident.

**Owner:** Customer ops + SRE  
**Related:** [post-incident-template.md](./post-incident-template.md), [slo-spec-v1.md](./slo-spec-v1.md)

---

## Investigating

**Title:** Investigating elevated errors on {{component}}

**Body:**

We are investigating reports of {{symptom}} affecting {{component}}. Some customers may experience {{user_impact}}.

- **Start time (UTC):** {{start_time}}
- **Scope:** {{staging_only | production | region}}
- **Customer action:** {{none | workaround}}

Next update in **{{30}} minutes** or when we have more information.

---

## Identified

**Title:** Identified — {{root_cause_category}}

**Body:**

We have identified the cause of {{symptom}}: {{brief_technical_description_without_sensitive_detail}}.

Mitigation in progress: {{mitigation_step}}.

- **Impact:** {{ongoing_impact}}
- **ETA for mitigation:** {{eta}} (estimate)

Next update in **{{30}} minutes**.

---

## Monitoring

**Title:** Monitoring fix for {{component}}

**Body:**

A fix has been deployed for {{issue}}. We are monitoring error rates, latency, and {{key_metric}}.

Early indicators show {{improving | stable}}. We will confirm resolution after **{{monitoring_window}}** of stable metrics.

If you continue to see issues, contact {{support_email}} with tenant ID and approximate time.

---

## Resolved

**Title:** Resolved — {{component}} incident

**Body:**

The incident affecting {{component}} is **resolved** as of **{{resolved_time}} UTC**.

**Summary:** {{one_paragraph_customer_friendly}}

**Duration:** {{start}} – {{end}} UTC  
**Root cause (high level):** {{category}}  
**Customer action required:** {{none | rotate_keys | re-run_job}}

A detailed post-incident summary will be published within **{{5}} business days** for customers on enterprise support tier.

We apologize for the disruption.

---

## Maintenance (scheduled)

**Title:** Scheduled maintenance — {{date}}

**Body:**

Planned maintenance on {{component}} from **{{start}}** to **{{end}}** UTC.

Expected impact: {{brief_impact}}. No action required unless notified.

---

## Communication checklist

- [ ] Internal Slack war room linked
- [ ] Support macros updated
- [ ] Severity matches [support-severity-matrix-v1.md](./support-severity-matrix-v1.md)
- [ ] Post-incident review scheduled if P1/P2
