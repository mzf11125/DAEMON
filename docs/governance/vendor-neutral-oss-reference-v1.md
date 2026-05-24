# Vendor-neutral OSS reference v1

Pattern families useful when studying **open operational-platform samples**. Use for local learning only — implement Daemon equivalents via ontology, attachments, and actions; do not import third-party SDKs into runtime paths.

| Pattern family | Typical behaviors | Daemon module |
|----------------|-------------------|---------------|
| Entity visualizer | Map COP, track streaming | `/v1/geo/map`, console `/live` |
| Objects / file plane | Upload, list, TTL blobs | `platform-api` attachments + MinIO |
| Periodic publish | Scheduled upsert to entities | `ingestion-service`, pipelines |
| Thumbnail link | Image on entity for UI | attachment `role=thumbnail` |
| Task / agent lifecycle | Create, assign, complete tasks | ontology actions, WorkOrder |
| Listen-as-agent | Long-poll task queue | agent-bridge (501 until maturation gates) |
| Dataset medallion | Raw → curated tables | ClickHouse `dataset_*` |
| Rules on datasets | SQL render → signals | rules-engine |

Capability IDs: [capability-pattern-index-v1.md](../research/capability-pattern-index-v1.md).

Policy: [vendor-neutral-content-v1.md](./vendor-neutral-content-v1.md).
