# Logistics express-cargo — action catalog v0.1

Governed actions for pack `logistics-express-cargo`. Agents **propose** via HITL; humans or authorized roles **execute** through ontology-service.

## Read path (agents)

- `ontology_list_objects` — Signal, Shipment, CustomerAccount, Activity, AccountHealthScore, etc.
- `ontology_manifest` — pack metadata
- MCP: `extract_express_cargo_intake`, `generate_express_cargo_sales_brief` (read-only brief)

Agents must **not** query Postgres directly.

## Mutating actions (HITL)

| Action | Role | Purpose |
|--------|------|---------|
| `CreateShipmentDraft` | operations_planner, analyst | Draft shipment + commercial order from intake |
| `ConfirmShipment` | operations_planner | Promote draft → confirmed |
| `OpenCase` | analyst | Escalate signal to case |
| `CreateWorkOrder` | analyst | Operational task on asset |
| `TransitionShipmentState` | analyst | Lifecycle update |
| `AllocateVendorCost` | finance_ops | Financial stub allocation (sim) |

### CreateShipmentDraft parameters

- `customerAccountId`, `origin`, `destination` (required)
- `items`, `weight`, `references`, `confidence` (optional)

Invariant: status remains `draft` until `ConfirmShipment`.

## Propose-only eval gates

- G-EC-07 — intake proposes draft, never auto-executes
- G-EC-08 — sales brief is read-only

See [logistics-express-cargo-signal-map-v1.md](./logistics-express-cargo-signal-map-v1.md) and pack `catalog/signals-map.yaml`.
