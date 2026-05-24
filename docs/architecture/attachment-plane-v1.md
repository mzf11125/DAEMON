# Attachment plane v1 (ADR)

**Status:** Accepted (P3). **Decision:** Object storage (MinIO in local compose; S3-compatible in prod) plus Postgres metadata with tenant RLS — separate from ontology property blobs.

## Context

Reference “objects CLI” patterns teach file upload, metadata, prefix listing, and link-to-entity. Ontology properties must not store raw bytes.

## Decision

- Store bytes in MinIO/S3; metadata in `attachments` + `attachment_links` (migration `006_p3_geo_attachments.sql`)
- API on `platform-api`: `POST/GET/HEAD/DELETE /v1/attachments`, link via `role` (e.g. `thumbnail`)
- Auth: same Bearer + tenant middleware as other `/v1/*` routes
- Max size: `ATTACHMENT_MAX_BYTES` (default 25MB)

## Non-goals (P3)

- Public unsigned CDN URLs, virus scan, gRPC Objects API clone, vendor SDK

## Proof

```bash
make prove-p3-geo   # geo + attachment smoke when stack up
go test -tags=integration ./tests/integration/ -run TestAttachmentsHTTP
```

## Consequences

- Console and sdk-ts consume HTTP attachment endpoints only
- Cross-tenant reads denied by RLS + handler checks
