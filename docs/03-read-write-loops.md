# Read-write loops

Read-write loops coordinate the lifecycle of a request from read through policy, write, and optional external write.

```mermaid
sequenceDiagram
  participant Client
  participant Loop as LoopOrchestrator
  participant Read as ReadRouter
  participant Policy as PolicyEngine
  participant Write as CommandGateway
  participant Ext as ExternalWrites

  Client->>Loop: request
  Loop->>Read: resolve current state
  Loop->>Policy: evaluate decision
  alt allowed
    Loop->>Write: validate + mutate
    Write->>Loop: commit record
    opt external effect
      Loop->>Ext: dispatch external write
    end
  else denied
    Loop->>Client: POLICY_DENIED
  end
```

## Components

- **ReadRouter** (`read-write-loops/reads/read-router.ts`): resolves entities from the ontology registry. When `DAEMON_READ_FROM_PROJECTION=1`, returns the **EntityReadModelProjection** row when present; otherwise falls back to the registry (same NOT_FOUND semantics).
- **Read parity** (`read-write-loops/reads/read-parity.ts`): optional dual-read comparison when `DAEMON_READ_PARITY_CHECK=1`. Each read loads registry and projection snapshots, compares version, entity type, and stable JSON properties, increments in-process counters, and emits structured `read_parity_mismatch` logs on drift. Prometheus text is appended on gateway `GET /metrics` (`daemon_read_parity_*`).
- **CommandGateway** (`read-write-loops/writes/command-gateway.ts`): entry point for mutations.
- **MutationValidator** (`read-write-loops/writes/mutation-validator.ts`): validates payloads against ontology models.
- **ConflictResolver**: applies `reject`, `last-write-wins`, or `merge` strategies under optimistic concurrency.
- **CommitManager**: append-only commit log with version lookup and rollback.
- **LoopOrchestrator** (`read-write-loops/loop-controller/`): drives read → policy → write → external-write, using the state machine, approval gates, and escalation engine.

## Concurrency

Writes use optimistic concurrency control. A version mismatch raises `ErrorCodes.CONFLICT`; the configured `ConflictResolver` strategy decides whether to reject, overwrite, or merge.
