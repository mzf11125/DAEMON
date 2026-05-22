# API contracts

Machine-readable spec: [api/openapi-v1.yaml](../../api/openapi-v1.yaml).

HTTP APIs use a shared envelope:

- Success: `{ "data": T }`
- Failure: `{ "error": { "code", "message", "requestId", "timestamp" } }`

Every response includes header `X-Request-Id` (also echoed in error JSON when available). List endpoints include `meta` with pagination fields.

## Services and ports

| Service | Port | Base path |
|---------|------|-----------|
| platform-api | 8080 | `/v1` |
| ontology-service | 8081 | `/v1` |
| ingestion-service | 8082 | `/v1` |
| rules-engine | 8083 | `/v1` |
| case-service | 8084 | `/v1` |

Authenticated routes require:

- `Authorization: Bearer <jwt>` (Supabase or OIDC)
- `X-Tenant-Id` (seed default: `tenant-demo`)

## Actions vs functions

| Pattern | Path | Semantics |
|---------|------|-----------|
| **Actions** | `POST /v1/actions/{actionType}` | Mutating ontology operations (OpenCase, RecordDecision, …). Role-gated via ontology manifest. |
| **Functions** | `POST /v1/functions/{name}` | Read-only or side-effect-free helpers (e.g. `summarizeCaseContext`). |

This mirrors Foundry-style RPC naming; REST aliases for cases are not required for v1 parity.

## Pagination

Query parameters on list routes:

| Param | Default | Max |
|-------|---------|-----|
| `limit` | 50 | 200 |
| `offset` | 0 | — |

Response shape:

```json
{
  "data": {
    "items": [],
    "meta": { "total": 0, "limit": 50, "offset": 0, "hasMore": false, "returned": 0 }
  }
}
```

Applies to: `GET /v1/objects/{objectType}`, `GET /v1/cases`, `GET /v1/audit/events`.

## Error codes and HTTP status

| Status | When | Example codes |
|--------|------|----------------|
| 400 | Malformed JSON body | `INVALID_JSON` |
| 401 | Missing/invalid bearer | `UNAUTHORIZED` |
| 403 | Role or tenant denied | `FORBIDDEN` |
| 404 | Resource missing | `NOT_FOUND` |
| 422 | Semantic validation | `MISSING_PARAM`, `SIGNAL_NOT_FOUND` |
| 500 | Server/DB failure | `QUERY_FAILED`, `ACTION_FAILED` |

## Key routes (v1 parity)

| Method | Path | Service |
|--------|------|---------|
| POST | `/v1/actions/OpenCase` | ontology — `{ title, signalIds? }` → `case_signals` |
| POST | `/v1/actions/RecordDecision` | ontology — `{ caseId, outcome, rationale? }` |
| GET | `/v1/audit/events` | platform — `resourceType`, `resourceId`, `limit`, `offset` |
| POST | `/v1/audit/events` | platform — append event; requires `actionType`, `resourceType`, `resourceId` |
| GET | `/v1/cases` | case — paginated list |
| GET | `/v1/cases/{caseId}` | case — includes `signalIds` |
| GET | `/v1/objects/Case/{id}/links` | ontology — `SignalLinkedToCase` |
| POST | `/v1/functions/summarizeCaseContext` | ontology — `{ caseId }` |

## Rate limits (development)

Responses include advisory headers `X-RateLimit-Limit` and `X-RateLimit-Remaining` (high dev quotas). Production limits are deployment-specific.

## Client SDK

TypeScript client: `packages/sdk-ts` — pass `limit` / `offset` on list helpers where supported.

See [developer-tools/api.md](../developer-tools/api.md) for local URLs and smoke scripts.
