# case-service

Case read API. Port **8084**.

- `GET /health`
- `GET /v1/cases` — list cases for tenant
- `GET /v1/cases/{caseId}` — case detail with linked signals

Create cases via **ontology-service** action `OpenCase` (`POST /v1/actions/OpenCase`), not this service.

```bash
make run-case-service
```
