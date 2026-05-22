# RB-DATA-01 — Data stores down

1. `make up` / `docker compose -f infra/docker/docker-compose.yml ps`
2. `pg_isready -h localhost -U daemon`; `curl localhost:8123/ping`; Neo4j `:7474`
3. Check disk usage; prune dev volumes if needed (document data loss).
4. Escalate P1 if outage &gt; 30 minutes.
