# GDPR Record of Processing Activities (ROPA) v1 — template

Article 30 GDPR — controller/processor record for DAEMON platform operations. Maintain in GRC system of record; this file is the **in-repo template**.

**Status:** Draft  
**Owner:** GRC / DPO

## Controller record (if DAEMON acts as controller for account/billing data)

| Field | Value (TBD) |
|-------|-------------|
| Name and contact | [Legal entity] |
| DPO | TBD |
| Purposes | Customer account management, billing, product improvement (aggregated) |
| Categories of data subjects | Customer admins, billing contacts |
| Categories of personal data | Name, email, billing address, usage metadata |
| Recipients | Finance tools, support tooling |
| Transfers | Document per region |
| Retention | Contract + statutory |
| Security measures | SOC 2 control set; encryption |

## Processor record (primary SaaS processing on behalf of customers)

| # | Processing activity | Purpose | Data subjects | Personal data categories | Recipients / sub-processors | Third country transfers | Retention | Security measures |
|---|---------------------|---------|---------------|--------------------------|----------------------------|-------------------------|-----------|-------------------|
| P1 | Core platform API | Case & ontology operations | Customer users | IDs, email, audit fields, case content | Supabase, ClickHouse, Neo4j Aura | US/EU per DPA | Contract term + tiers | RLS, TLS, audit_log |
| P2 | Data pipelines | Analytics & features | Indirect | Aggregated operational metrics | ClickHouse Cloud | Per DPA | Per data platform SLA | Pipeline quality gates |
| P3 | AIP agent bridge | Proposals & research | Customer users | Prompts, traces (redacted) | LLM provider, LangSmith | US typical | 90d hot / policy | Eval gates, no auto-execute |
| P4 | Audit archival | Compliance evidence | Customer users | audit_log payloads | S3 Object Lock | Per DPA | 2–7y by class | Hash chain, WORM |
| P5 | Market intel (optional) | Enrichment jobs | Business contacts | Public web-derived data | Tavily, OpenAI | US | Job-scoped | Sandboxed pipeline |

## Joint controllership

Document any joint controller arrangements with customers (typically **customer = controller** for case content; **DAEMON = processor**).

## Update protocol

1. Add row when new sub-processor or processing purpose ships.
2. Link privacy review log entry for new features.
3. Review quarterly with [soc2-control-matrix-v1.md](./soc2-control-matrix-v1.md).
