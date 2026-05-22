# API

OpenAPI: [api/openapi-v1.yaml](../../api/openapi-v1.yaml). Contracts: [api-contracts/README.md](../api-contracts/README.md).

Error envelope: `{ data?, error?: { code, message, requestId, timestamp } }`. Health on each service `/health`.

List routes support `?limit=` (default 50, max 200) and `?offset=`; responses include `meta` pagination fields.
