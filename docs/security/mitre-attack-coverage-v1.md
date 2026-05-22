# MITRE ATT&CK coverage v1 (mapping)

High-level defensive coverage for demo stack — not exhaustive ATT&CK assessment.

| Tactic | Technique (examples) | Control |
|--------|----------------------|---------|
| Initial Access | Valid accounts | Keycloak OIDC |
| Execution | User execution | No agent shell tools |
| Persistence | — | Out of v1 scope |
| Privilege Escalation | Abuse elevation | Role checks on actions |
| Defense Evasion | — | Audit log on ontology actions |
| Credential Access | Unsecured credentials | env secrets only |
| Discovery | Cloud/API discovery | Authenticated APIs |
| Collection | Data from cloud | Tenant-scoped queries |
| Impact | Data manipulation | SELECT-only rules; HITL OpenCase |

Expand with `mitre-attack-framework` skill when building detection engineering program.
