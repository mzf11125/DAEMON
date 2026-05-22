# rules-engine

Evaluates JSON rules under `ontology/v2/rules/` against ClickHouse and writes Signal rows to Postgres. Port **8083**.

- `POST /v1/evaluate`

```bash
make run-rules-engine
```
