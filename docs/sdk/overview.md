# Daemon SDK

The Daemon SDK suite provides everything needed to build on the DAEMON platform.

## Packages

| Package                     | Purpose                                                    | Status                     |
| --------------------------- | ---------------------------------------------------------- | -------------------------- |
| `@daemon/sdk`               | Unified developer entry point — re-exports all public APIs | NEW                        |
| `@daemon/sdk-react`         | React hooks, providers, and components for building UI     | NEW                        |
| `@daemon/sdk-node`          | Node.js middleware, health checks, service registration    | NEW                        |
| `@daemon/dashboard-engine`  | Panel registry, data source abstraction, dashboard-as-code | NEW                        |
| `@daemon/grafana-codegen`   | Ontology → Grafana dashboard code generation               | NEW                        |
| `@daemon/plugin-sdk`        | Plugin system: registry, skills, dynamic agent builder     | EXISTING                   |
| `@daemon/ontology-sdk`      | OntologyClient, ObjectQueryBuilder, ActionProposer         | EXISTING                   |
| `@daemon/ontology-engine`   | Runtime: objects, actions, audit, schema registry          | EXISTING                   |
| `@daemon/ontology-language` | Core types (Zod) + YAML parser                             | EXISTING                   |
| `@daemon/sdk-ts`            | Browser/Node HTTP API client                               | DEPRECATED (→ @daemon/sdk) |

## Quick start

```typescript
import { DaemonClient, createClient } from "@daemon/sdk";

const client = createClient({
  platformApiUrl: "http://localhost:8080",
  ontologyServiceUrl: "http://localhost:8081",
  caseServiceUrl: "http://localhost:8084",
});

const signals = await client.listSignals();
const manifest = await client.manifest();
```

## Building a panel

```typescript
import { PanelPlugin, useDataSource } from '@daemon/sdk';
import { z } from 'zod';

const myPanel: PanelPlugin<{ limit: number }> = {
  id: 'my-signal-panel',
  name: 'Signal Panel',
  category: 'operations',
  configSchema: z.object({ limit: z.number().default(10) }),
  defaultSize: { w: 6, h: 4 },
  component: ({ config, datasource }) => {
    const { data, loading } = useDataSource(datasource, config);
    return <div>{loading ? 'Loading...' : JSON.stringify(data)}</div>;
  },
};
```

## Building a data source

```typescript
import { DataSourcePlugin } from "@daemon/sdk";
import { z } from "zod";

const myDs: DataSourcePlugin<{ status?: string }> = {
  id: "my-objects",
  name: "My Objects",
  objectType: "MyObject",
  querySchema: z.object({ status: z.string().optional() }),
  async query({ query, pagination }) {
    const result = await client.listObjects("MyObject", {
      ...query,
      ...pagination,
    });
    return { fields: result.fields, rows: result.items, meta: result.meta };
  },
  async metadata() {
    return { fields: [], primaryKey: "id" };
  },
  async testConnection() {
    return { ok: true, message: "connected" };
  },
};
```

## CLI scaffolding

```bash
daemon-cli plugin create my-plugin
daemon-cli panel create my-panel
daemon-cli datasource create my-datasource
daemon-cli grafana export --dashboard signals-overview
```

## Resources

- [ROADMAP.md](../../ROADMAP.md) — full implementation plan
- [AGENTS.md](../../AGENTS.md) — coding agent instructions
- [Grafana Foundation SDK](https://grafana.com/docs/grafana/latest/as-code/observability-as-code/foundation-sdk/)
