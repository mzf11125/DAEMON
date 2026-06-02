# Daemon documentation

Modular, Grafana-like dashboard platform built on the Ontology framework.

> **[ROADMAP.md](../ROADMAP.md)** — Phased plan: dashboard engine, SDK suite, marketplace, Grafana integration.
> **[AGENTS.md](../AGENTS.md)** — Instructions for AI coding agents.

## Platform roadmap

- [DAEMON Roadmap](../ROADMAP.md) — current phased plan (dashboard engine → SDK suite → Grafana → marketplace → source of truth)
- [End-to-end production plan](../.cursor/plans/daemon-production-end-to-end-50d4a9.md) — sequential, quality-first, ~16 months
- [Production readiness tracker](operations/production-readiness-tracker-v1.md) — phase status + open items
- [P1 staging pilot closeout (Phase 0)](operations/p1-staging-pilot-closeout-v1.md) — current phase status
- [Stop-the-line policy](operations/stop-the-line-policy-v1.md) — gate-violation conditions
- [Audit retention policy](governance/audit-retention-v1.md) — production retention tiers

## Sections

- [Getting started](getting-started/overview.md)
- [Architecture](architecture/enterprise-os.md)
- [Data integration](data-integration/overview.md)
- [Ontology](ontology/overview.md)
- [Applications](applications/overview.md)
- [AIP](aip/overview.md)
- [Automation](automation/overview.md)
- [API contracts](api-contracts/README.md)
- [Developer tools](developer-tools/overview.md)
- [Observability](observability/overview.md)
- [Security](security/overview.md)
- [Operations](operations/staging-deploy-v1.md)
- [Governance](governance/daemon-maturation-gates-v1.md)
- [SDK & plugins](sdk/overview.md)
- [Dashboard engine](dashboard/overview.md)
- [Grafana integration](grafana/overview.md)
- [Glossary](operational-glossary.md)

## Repo map

| Folder                         | Role                                                       |
| ------------------------------ | ---------------------------------------------------------- |
| `apps/console-web/`            | Operator dashboard UI (Next.js 15)                         |
| `apps/control-plane/`          | Control plane API + plugin marketplace (Fastify)           |
| `apps/daemon-cli/`             | Operator CLI (Commander.js)                                |
| `packages/ontology-language/`  | Core types (Zod) + YAML parser                             |
| `packages/ontology-engine/`    | Runtime: objects, actions, audit, schema registry          |
| `packages/ontology-sdk/`       | OntologyClient, ObjectQueryBuilder, ActionProposer         |
| `packages/ontology-contracts/` | Manifest schema, canonical object/action lists             |
| `packages/ontology-functions/` | Pure functions (aggregate, summarize, match)               |
| `packages/plugin-sdk/`         | PluginRegistry, SkillRegistry, DynamicAgentBuilder         |
| `packages/aip-agent/`          | Agent orchestrator + MCP client                            |
| `packages/sdk-ts/`             | Browser/Node HTTP API client                               |
| `packages/shared-types/`       | Shared TypeScript types                                    |
| `packages/ui-kit/`             | React component library                                    |
| `packages/dashboard-engine/`   | (NEW) PanelRegistry, DataSourceRegistry, DashboardBuilder  |
| `packages/sdk/`                | (NEW) Unified developer SDK barrel                         |
| `packages/sdk-react/`          | (NEW) React hooks + components                             |
| `packages/sdk-node/`           | (NEW) Node.js middleware + utilities                       |
| `packages/grafana-codegen/`    | (NEW) Ontology → Grafana dashboard generator               |
| `aip/`                         | AI platform: MCP server, agent service, LLM gateway, evals |
| `services/`                    | Go microservices (8080-8084)                               |
| `ontology/`                    | Ontology schema files (v2 compiled, v3 source YAML)        |
| `pipelines/`                   | Data pipeline CLIs                                         |
| `connectors/`                  | External data connectors                                   |
| `infra/`                       | Docker, migrations, k8s, terraform, helm, gitops           |
