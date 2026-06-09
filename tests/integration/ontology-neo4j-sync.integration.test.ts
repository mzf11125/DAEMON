import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { entityId, ontologyId } from "@daemon/platform-types";
import { DEFAULT_TENANT_ID, DEFAULT_DOMAIN_ID } from "@daemon/context-ports";
import { Neo4jGraphSync } from "@daemon/ontology/graph-sync/neo4j-graph-sync.js";
import { buildPackGraphSchema } from "@daemon/ontology/graph-schema/pack-graph-schema.js";
import { PackResolver } from "@daemon/ontology/packs/pack-resolver.js";
import { DomainCatalog } from "@daemon/ontology/tenancy/domain-catalog.js";
import { TenantRegistry } from "@daemon/ontology/tenancy/tenant-registry.js";
import { skipUnlessNeo4jReady } from "../helpers/neo4j-integration.js";

const scope = { tenantId: DEFAULT_TENANT_ID, domainId: DEFAULT_DOMAIN_ID };
const logisticsScope = { tenantId: "logistics-pilot", domainId: "logistics" };
const ont = ontologyId("foundation");

describe("ontology neo4j sync (integration)", () => {
  it("upserts entity snapshot into Neo4j", async (t) => {
    const store = await skipUnlessNeo4jReady(t);
    if (!store) return;

    const schema = buildPackGraphSchema();
    await store.ensureSchema(schema.constraintStatements);

    const sync = new Neo4jGraphSync(store);
    const record = {
      tenantId: scope.tenantId,
      domainId: scope.domainId,
      ontologyId: ont,
      entityId: entityId("neo4j-sync-party-1"),
      entityType: "Party",
      properties: { displayName: "Neo4j Sync Test", partyKind: "person" },
      version: 1,
      updatedAt: new Date().toISOString(),
    };

    sync.sync(record, scope);
    await new Promise((r) => setTimeout(r, 800));

    const count = await store.countEntities(scope);
    assert.ok(count >= 1);

    await store.close();
  });

  it("upserts logistics Shipment with extension type label", async (t) => {
    const store = await skipUnlessNeo4jReady(t);
    if (!store) return;

    const tenants = TenantRegistry.fromYamlFile();
    const resolver = new PackResolver(DomainCatalog.fromYamlFile());
    const pack = resolver.resolve(tenants.require("logistics-pilot"), "logistics");
    const schema = buildPackGraphSchema(pack);
    assert.ok(schema.entityTypes.includes("Shipment"));
    await store.ensureSchema(schema.constraintStatements);

    const sync = new Neo4jGraphSync(store);
    const record = {
      tenantId: logisticsScope.tenantId,
      domainId: logisticsScope.domainId,
      ontologyId: ont,
      entityId: entityId("neo4j-sync-shipment-1"),
      entityType: "Shipment",
      properties: {
        displayName: "Logistics Neo4j Shipment",
        entityType: "Shipment",
        status: "open",
      },
      version: 1,
      updatedAt: new Date().toISOString(),
    };

    sync.sync(record, logisticsScope);
    await new Promise((r) => setTimeout(r, 800));

    const count = await store.countEntities(logisticsScope);
    assert.ok(count >= 1);

    await store.close();
  });

  it("upserts logistics Trip with extension type label", async (t) => {
    const store = await skipUnlessNeo4jReady(t);
    if (!store) return;

    const tenants = TenantRegistry.fromYamlFile();
    const resolver = new PackResolver(DomainCatalog.fromYamlFile());
    const pack = resolver.resolve(tenants.require("logistics-pilot"), "logistics");
    const schema = buildPackGraphSchema(pack);
    assert.ok(schema.entityTypes.includes("Trip"));
    await store.ensureSchema(schema.constraintStatements);

    const sync = new Neo4jGraphSync(store);
    const record = {
      tenantId: logisticsScope.tenantId,
      domainId: logisticsScope.domainId,
      ontologyId: ont,
      entityId: entityId("neo4j-sync-trip-1"),
      entityType: "Trip",
      properties: {
        tripCode: "TRIP-NEO4J-1",
        entityType: "Trip",
        status: "planned",
      },
      version: 1,
      updatedAt: new Date().toISOString(),
    };

    sync.sync(record, logisticsScope);
    await new Promise((r) => setTimeout(r, 800));

    const count = await store.countEntities(logisticsScope);
    assert.ok(count >= 1);

    await store.close();
  });
});
