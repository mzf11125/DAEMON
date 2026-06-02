# Grafana Integration

DAEMON provides **bidirectional Grafana interoperability** via the `@daemon/grafana-codegen` package and the [Grafana Foundation SDK](https://grafana.com/docs/grafana/latest/as-code/observability-as-code/foundation-sdk/).

## Export: Daemon → Grafana

Generate Grafana dashboards from ontology schemas:

```typescript
import { DashboardGenerator } from "@daemon/grafana-codegen";

const generator = new DashboardGenerator({ grafanaVersion: "11.0" });
const dashboards = await generator.fromManifest(manifest);

// dashboards[0].json → ready-to-import Grafana dashboard JSON
fs.writeFileSync("dashboard.json", JSON.stringify(dashboards[0].json, null, 2));
```

### Panel Mappings

| Ontology Type                  | Grafana Panel       |
| ------------------------------ | ------------------- |
| Objects with time-series props | TimeSeries          |
| Objects with geo fields        | Geomap              |
| Objects with enum/status       | Stat                |
| Object lists                   | Table               |
| Aggregate/count queries        | BarGauge / PieChart |

## Import: Grafana → Daemon

Parse Grafana JSON and map to ontology concepts:

```typescript
import { parseGrafanaDashboard } from "@daemon/grafana-codegen";

const grafanaJson = JSON.parse(
  fs.readFileSync("my-grafana-dashboard.json", "utf-8"),
);
const mapping = await parseGrafanaDashboard(grafanaJson);

// mapping.suggestedPanels[] — suggested Daemon panel types
// mapping.suggestedDataSources[] — suggested ontology object types
```

## CLI

```bash
# Export a Daemon dashboard to Grafana JSON
daemon-cli grafana export --dashboard signals-overview --output ./grafana/

# Import a Grafana dashboard JSON
daemon-cli grafana import ./grafana/my-dashboard.json
```

## Installation

```bash
pnpm add @grafana/grafana-foundation-sdk --filter @daemon/grafana-codegen
```

## Resources

- [Grafana Foundation SDK docs](https://grafana.com/docs/grafana/latest/as-code/observability-as-code/foundation-sdk/)
- [Grafana Foundation SDK GitHub](https://github.com/grafana/grafana-foundation-sdk)
- [Intro to Foundation SDK](https://github.com/grafana/intro-to-foundation-sdk)
- [ROADMAP.md](../../ROADMAP.md)
