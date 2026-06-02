# Dashboard Engine

The DAEMON dashboard engine provides a **Grafana-like modular dashboard system** built on the ontology framework.

## Concepts

| Concept               | Description                                                                      |
| --------------------- | -------------------------------------------------------------------------------- |
| `PanelPlugin`         | A registered visualization component with typed config schema                    |
| `DataSourcePlugin`    | A registered data source that maps to an ontology object type or external system |
| `DashboardDefinition` | A serializable dashboard specification (panels, variables, links)                |
| `VariableDefinition`  | Dashboard-wide filters (query, custom, interval, datasource)                     |
| `DashboardBuilder`    | Fluent API for defining dashboards in code                                       |

## Architecture

```
DashboardDefinition (JSON)
        │
        ▼
  DashboardBuilder (fluent API)
        │
   ┌────┴────┐
   │         │
   ▼         ▼
PanelRegistry   DataSourceRegistry
(panel lookup)  (query execution)
   │              │
   ▼              ▼
React Panel    DataSourcePlugin
Component      (typed query)
                  │
                  ▼
              OntologyEngine
              (runtime)
```

## Example

```typescript
import { DashboardBuilder, PanelBuilder } from "@daemon/dashboard-engine";

const dashboard = new DashboardBuilder("Signals Monitor")
  .withVariable("severity", {
    name: "severity",
    label: "Severity",
    type: "query",
    datasource: { type: "ontology", uid: "Signal" },
    query: { field: "severity" },
    multi: true,
    includeAll: true,
  })
  .withPanel(
    new PanelBuilder("signal-inbox")
      .title("Active Signals")
      .datasource({ type: "ontology", uid: "Signal" })
      .config({ severity: "$severity" })
      .gridPos({ x: 0, y: 0, w: 12, h: 6 }),
  )
  .withPanel(
    new PanelBuilder("case-list")
      .title("Open Cases")
      .datasource({ type: "ontology", uid: "Case" })
      .gridPos({ x: 12, y: 0, w: 12, h: 6 }),
  )
  .build();

console.log(JSON.stringify(dashboard, null, 2));
```

## Resources

- [ROADMAP.md](../../ROADMAP.md)
- [AGENTS.md](../../AGENTS.md)
