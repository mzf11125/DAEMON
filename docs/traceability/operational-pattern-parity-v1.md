# Operational pattern parity v1

Daemon-native equivalents for common **reference sample application** patterns (entity map, file objects, periodic publish, thumbnail, tasking). This is **pattern parity**, not a vendor integration — no third-party SDK, runtime dependency, or connector in production paths.

## Three planes (semantic / files / command)

```text
┌─────────────────┐   ingest/sync    ┌──────────────────┐
│ Semantic plane  │ ◄─────────────── │ ingestion +      │
│ ontology types  │                  │ transforms       │
└────────┬────────┘                  └──────────────────┘
         │ read model
         ▼
┌─────────────────┐   upload/link    ┌──────────────────┐
│ Console / SDK   │ ◄─────────────── │ Files plane      │
│ map, cases      │                  │ /v1/attachments  │
└────────┬────────┘                  └──────────────────┘
         │ executeAction (HITL)
         ▼
┌─────────────────┐
│ Command plane   │
│ actions + audit │
└─────────────────┘
```

## Pattern map (status)

See [operational-sample-apps-parity-v1.md](./operational-sample-apps-parity-v1.md) for CAP-* rows and proof commands. [matrix-v1.md](./matrix-v1.md) tracks requirement → test evidence.

## Not in scope

- Vendor SDK imports or API calls from runtime services
- gRPC connectors to external entity managers (REST-first for Daemon)
- Autonomous agent task execution without human gate (Wave 1–2)

## Cross-links

- [operational-sample-patterns-v1.md](./operational-sample-patterns-v1.md)
- [operational-platform-parity-v1.md](./operational-platform-parity-v1.md)
- [ADR MERGE-STRATEGY-01](../architecture/adr-merge-strategy-01.md)
