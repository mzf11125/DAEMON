# platform-api

Identity and audit API. Port **8080**.

- `GET /health`
- `GET /v1/me` — user from Postgres `users`
- `POST /v1/audit/events` — append audit log entry

```bash
make run-platform-api
```
