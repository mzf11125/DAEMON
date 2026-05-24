# Console C2-style UX P3 epic

Post–Gate 0 console-web enhancements for operational COP-style workflows (Daemon-native UI, reference screenshots only).

## Scope

| Surface | P3 target |
|---------|-----------|
| Auth shell | Supabase session + tenant context (existing) |
| `/live` map | MapLibre over `/v1/geo/map` |
| Asset panel | Sidebar detail + optional thumbnail via attachment link |
| Task catalog | Read-only work orders / case actions (HITL) |

## Proof

```bash
pnpm --filter console-web typecheck
make prove-p3-geo
```

## Non-goals

- Embedding vendor sample app UIs
- Autonomous agent controls without audit trail

Cross-link: [operational-sample-patterns-v1.md](../research/operational-sample-patterns-v1.md)
