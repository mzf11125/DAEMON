# Dune upstream Agent Skills (Layer A)

DAEMON does not vendor the full [duneanalytics/skills](https://github.com/duneanalytics/skills) tree in git.

**Recommended setup:**

1. `npx skills add duneanalytics/skills`, or
2. Cursor → Settings → Rules → Remote Rule (GitHub) → `duneanalytics/skills`

Skills to use:

- **`dune`** — DuneSQL, datasets, batch analytics (pairs with `dune-sql` ingest)
- **`sim`** — realtime wallet APIs (pairs with `sim-dune` ingest)

Full onboarding: [docs/integrations/dune-agent-tooling-v1.md](../../docs/integrations/dune-agent-tooling-v1.md).
