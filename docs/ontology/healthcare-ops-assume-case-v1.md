# Healthcare operations — assume-case v1

Illustrates how **one hospital tenant** keeps fragmented clinical systems while using the **same** operational loop as logistics or public sector.

## Tenant model

- **Tenant** = hospital group or IDN (e.g. `tenant-demo` in dev only).
- **Connectors** (post–v1): EMR, LIS, RIS, billing — each a `connectorProfile` under pack `healthcare-ops`.

## Assume-case narrative

1. **Observation** — abnormal lab or device feed lands in silver (`dataset_observations`).
2. **Signal** — rule flags critical value → `Signal` in ontology (same type as manufacturing alert).
3. **OpenCase** — investigator links `signalIds`; `case_signals` records provenance (not a separate “clinical case” table).
4. **RecordDecision** — human outcome (e.g. escalate to clinical review) + audit for compliance.
5. **Audit** — supervisor reads `GET /v1/audit/events` on Case resource.

## What pack `healthcare-ops` adds (post–v1, stub today)

| Addition | Examples |
|----------|----------|
| Object types | `Patient`, `Encounter`, `LabResult` (manifest-only stub) |
| Links | `EncounterRaisedSignal`, `CaseTargetsPatient` |
| Rules | Critical lab thresholds, duplicate admission heuristics |
| Console panel | Clinical context sidebar (additive) |

## What stays core

`Signal`, `Case`, `Decision`, `OpenCase`, `RecordDecision`, `case_signals`, RLS, audit model.

## Non-goals (v1)

- HIPAA BAAs, PHI retention policy, or clinical decision support claims.
- Replacing EMR workflows.

## Related

- [`multi-sector-fragmentation-v1.md`](multi-sector-fragmentation-v1.md)
