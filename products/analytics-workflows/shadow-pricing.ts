import { defaultOntology, type EntityRecord } from "@daemon/ontology";
import type { OntologyId } from "@daemon/platform-types";
import type { ProductRuntime } from "../shared/product-runtime.js";

export interface ClickHouseStatusRow {
  status: string;
  count: number;
}

export interface ShadowPricingSimulationRequest {
  ontologyId?: OntologyId;
  shipmentRef?: string;
  limit?: number;
}

export interface ShadowPricingSimulationResult {
  mode: "clickhouse" | "ontology-only";
  generatedAt: string;
  shipmentRef?: string;
  clickhouse?: {
    database: string;
    table: string;
    statusBreakdown: ClickHouseStatusRow[];
    totalRows: number;
  };
  routingDecisions: {
    count: number;
    items: { entityId: string; decisionType?: string; shipmentRef?: string }[];
  };
  shipments: {
    count: number;
    items: { entityId: string; externalRef?: string; displayName?: string }[];
  };
  readOnly: true;
}

function clickhouseBaseUrl(): string | undefined {
  const raw = process.env.DAEMON_CLICKHOUSE_URL?.trim();
  if (raw) return raw.replace(/\/$/, "");
  const host = process.env.CLICKHOUSE_HOST?.trim();
  if (!host) return undefined;
  const port = process.env.CLICKHOUSE_PORT?.trim() || "8124";
  return `http://${host}:${port}`;
}

function clickhouseDatabase(): string {
  return (
    process.env.DAEMON_CLICKHOUSE_DATABASE?.trim() ||
    process.env.CLICKHOUSE_DATABASE?.trim() ||
    "abc_express"
  );
}

async function queryClickHouseShipmentBreakdown(
  database: string,
): Promise<{ rows: ClickHouseStatusRow[]; total: number } | undefined> {
  const base = clickhouseBaseUrl();
  if (!base) return undefined;
  const sql = `SELECT status, count() AS cnt FROM ${database}.shipments GROUP BY status ORDER BY cnt DESC FORMAT JSON`;
  const url = `${base}/?query=${encodeURIComponent(sql)}`;
  try {
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) return undefined;
    const body = (await res.json()) as {
      data?: { status?: string; cnt?: string | number }[];
    };
    const rows: ClickHouseStatusRow[] = (body.data ?? []).map((row) => ({
      status: String(row.status ?? "unknown"),
      count: Number(row.cnt ?? 0),
    }));
    const total = rows.reduce((sum, row) => sum + row.count, 0);
    return { rows, total };
  } catch {
    return undefined;
  }
}

function scopedRecords(
  runtime: ProductRuntime,
  ontologyId: OntologyId,
  entityType: string,
  limit: number,
): EntityRecord[] {
  const scope = runtime.scope;
  if (!scope) return [];
  const records = runtime.store.list(scope, ontologyId);
  return records
    .filter((r) => r.entityType === entityType)
    .slice(0, limit);
}

/**
 * Read-only shadow pricing simulation: ClickHouse OLAP rollups plus ontology
 * RoutingDecision / Shipment context (no Supabase or governed writes).
 */
export class ShadowPricing {
  constructor(private readonly runtime: ProductRuntime) {}

  async simulate(
    req: ShadowPricingSimulationRequest = {},
  ): Promise<ShadowPricingSimulationResult> {
    this.runtime.assertAllowed("query", "analytics");
    const ont = req.ontologyId ?? defaultOntology();
    const limit = Math.min(Math.max(req.limit ?? 20, 1), 100);
    const database = clickhouseDatabase();
    const ch = await queryClickHouseShipmentBreakdown(database);

    const routingRecords = scopedRecords(
      this.runtime,
      ont,
      "RoutingDecision",
      limit,
    );
    let shipmentRecords = scopedRecords(this.runtime, ont, "Shipment", limit);
    if (req.shipmentRef) {
      shipmentRecords = shipmentRecords.filter(
        (r) => r.properties.externalRef === req.shipmentRef,
      );
    }

    return {
      mode: ch ? "clickhouse" : "ontology-only",
      generatedAt: new Date().toISOString(),
      shipmentRef: req.shipmentRef,
      clickhouse: ch
        ? {
            database,
            table: "shipments",
            statusBreakdown: ch.rows,
            totalRows: ch.total,
          }
        : undefined,
      routingDecisions: {
        count: routingRecords.length,
        items: routingRecords.map((r) => ({
          entityId: String(r.entityId),
          decisionType:
            typeof r.properties.decisionType === "string"
              ? r.properties.decisionType
              : undefined,
          shipmentRef:
            typeof r.properties.shipmentRef === "string"
              ? r.properties.shipmentRef
              : undefined,
        })),
      },
      shipments: {
        count: shipmentRecords.length,
        items: shipmentRecords.map((r) => ({
          entityId: String(r.entityId),
          externalRef:
            typeof r.properties.externalRef === "string"
              ? r.properties.externalRef
              : undefined,
          displayName:
            typeof r.properties.displayName === "string"
              ? r.properties.displayName
              : undefined,
        })),
      },
      readOnly: true,
    };
  }
}
