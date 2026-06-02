# Grafana Daemon Plugin

Grafana data source and panel plugins for the DAEMON Ontology platform.

## Installation

### From Grafana CLI

```bash
grafana-cli plugins install daemon-ontology-datasource
```

### From Source

```bash
cd grafana-daemon-plugin
npm install
npm run build
# Copy dist/ to your Grafana plugins directory
```

## Data Source

- **ID:** `daemon-ontology-datasource`
- **Name:** DAEMON Ontology

Connects to your DAEMON API and exposes ontology objects as Grafana data.

### Query Types

| Type          | Description                           | Grafana Panels          |
| ------------- | ------------------------------------- | ----------------------- |
| `listSignals` | List operational signals              | Table, Stat             |
| `listCases`   | List cases                            | Table                   |
| `listObjects` | List any ontology object type         | Table                   |
| `auditEvents` | Query audit trail                     | Table, Timeline         |
| `geoMap`      | Geo-referenced site/asset/signal data | Geomap                  |
| `caseDetail`  | Single case detail                    | Custom                  |
| `metricQuery` | Aggregated metrics                    | TimeSeries, Stat, Gauge |

## Panels

| Panel ID                    | Name         | Description                                      |
| --------------------------- | ------------ | ------------------------------------------------ |
| `daemon-signal-inbox-panel` | Signal Inbox | Real-time signal triage with inline case opening |
| `daemon-case-list-panel`    | Case List    | Filter and manage operational cases              |

## Configuration

### Data Source Config

- **API URL:** Base URL of your DAEMON API (e.g. `https://daemon.company.com`)
- **Tenant ID:** DAEMON tenant identifier
- **Auth Token:** JWT Bearer token for API authentication

### Provisioning

Place `provisioning/datasources/daemon.yaml` in your Grafana provisioning directory to auto-configure the data source.

## Requirements

- Grafana >= 10.0.0
- DAEMON API running (ontology-service on port 8081)

## License

BSD 3-Clause
