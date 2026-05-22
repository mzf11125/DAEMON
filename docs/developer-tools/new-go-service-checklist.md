# New Go service checklist

1. Copy patterns from `services/case-service` (config, health, chi router).
2. Wire `dhttp.AuthenticatedStack(auth.LoadConfigFromEnv())`.
3. Expose `GET /health` and port via `HTTP_PORT` / `config.LoadBase`.
4. Add to Makefile `test` loop and `scripts/platform-check.sh` ports list.
5. Register in `docs/developer-tools/service-catalog.md`.
6. Add e2e-smoke step if on critical path.
