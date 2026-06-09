import { describe, it, expect, beforeEach } from "vitest";
import { DataSourceRegistry } from "../src/registry/data-source-registry.js";
import { MemoryBackend } from "../src/backends/memory-backend.js";
import type {
  DataSourcePlugin,
  DataSourceQuery,
  Entity,
} from "../src/index.js";

describe("DataSourceRegistry", () => {
  let registry: DataSourceRegistry;

  beforeEach(() => {
    registry = new DataSourceRegistry();
  });

  describe("register / deregister", () => {
    it("registers a data source and indexes by entity type", () => {
      const source = new MemoryBackend(["Case", "Signal"]);
      registry.register(source);

      expect(registry.has("memory")).toBe(true);
      expect(registry.list()).toHaveLength(1);
      expect(registry.listForEntityType("Case")).toHaveLength(1);
      expect(registry.listForEntityType("Signal")).toHaveLength(1);
      expect(registry.listForEntityType("Asset")).toHaveLength(0);
    });

    it("throws on duplicate registration", () => {
      const source = new MemoryBackend(["Case"]);
      registry.register(source);
      expect(() => registry.register(source)).toThrow("already registered");
    });

    it("deregisters and removes from entity index", () => {
      const source = new MemoryBackend(["Case"]);
      registry.register(source);
      registry.deregister("memory");

      expect(registry.has("memory")).toBe(false);
      expect(registry.listForEntityType("Case")).toHaveLength(0);
    });

    it("registers multiple sources and sorts by priority", () => {
      const low = new MemoryBackend(["Case"], { id: "low", priority: 100 });
      const high = new MemoryBackend(["Case"], { id: "high", priority: 1 });
      registry.register(low);
      registry.register(high);

      const sources = registry.listForEntityType("Case");
      expect(sources).toHaveLength(2);
      expect(sources[0].id).toBe("high"); // lower priority number = preferred
    });
  });

  describe("query routing", () => {
    it("routes query to the correct backend", async () => {
      const mem = new MemoryBackend(["Case"]);
      mem.seed("Case", [
        {
          id: "c1",
          entityType: "Case",
          properties: { title: "Test Case", status: "open" },
        },
      ]);
      registry.register(mem);

      const result = await registry.query({ entityType: "Case", filters: [] });
      expect(result.entities).toHaveLength(1);
      expect(result.entities[0].properties["title"]).toBe("Test Case");
      expect(result.backend).toBe("memory");
    });

    it("throws when no backend serves the entity type", async () => {
      await expect(registry.query({ entityType: "Unknown" })).rejects.toThrow(
        "No data source",
      );
    });

    it("routes with forceBackend hint", async () => {
      const mem = new MemoryBackend(["Case"], { id: "mem1" });
      const mem2 = new MemoryBackend(["Case"], { id: "mem2", priority: 1 });
      mem.seed("Case", [
        { id: "c1", entityType: "Case", properties: { title: "From mem1" } },
      ]);
      mem2.seed("Case", [
        { id: "c2", entityType: "Case", properties: { title: "From mem2" } },
      ]);
      registry.register(mem);
      registry.register(mem2);

      const result = await registry.query(
        { entityType: "Case" },
        { forceBackend: "mem1" },
      );
      expect(result.backend).toBe("mem1");
      expect(result.entities[0].properties["title"]).toBe("From mem1");
    });
  });

  describe("write routing", () => {
    it("routes write to the correct backend", async () => {
      const mem = new MemoryBackend(["Case"]);
      registry.register(mem);

      const result = await registry.write({
        entityType: "Case",
        operation: "upsert",
        properties: { title: "New Case" },
      });
      expect(result.success).toBe(true);
      expect(result.operation).toBe("upsert");
    });

    it("throws when backend has no write support", async () => {
      const readOnly: DataSourcePlugin = {
        id: "readonly",
        name: "Read Only",
        backend: "custom",
        entityTypes: ["Case"],
        priority: 1,
        query: async () => ({
          entities: [],
          total: 0,
          executionTime: 0,
          backend: "readonly",
          cached: false,
        }),
        schema: async () => ({
          entityType: "Case",
          fields: [],
          primaryKey: "id",
        }),
        health: async () => ({ ok: true, latencyMs: 0 }),
        metrics: async () => ({
          queryCount: 0,
          avgLatencyMs: 0,
          errorRate: 0,
          cacheHitRate: 0,
        }),
      };
      registry.register(readOnly);

      await expect(
        registry.write({
          entityType: "Case",
          operation: "upsert",
          properties: {},
        }),
      ).rejects.toThrow("No write support");
    });
  });

  describe("health and metrics", () => {
    it("reports health for all sources", async () => {
      const mem = new MemoryBackend(["Case"]);
      registry.register(mem);

      const health = await registry.healthCheck();
      expect(health.get("memory")?.ok).toBe(true);
    });

    it("reports registry metrics", async () => {
      const mem = new MemoryBackend(["Case"]);
      registry.register(mem);

      const metrics = await registry.registryMetrics();
      expect(metrics.totalSources).toBe(1);
      expect(metrics.healthySources).toBe(1);
      expect(metrics.queryCount).toBe(0);
    });
  });
});

describe("MemoryBackend", () => {
  let backend: MemoryBackend;

  beforeEach(() => {
    backend = new MemoryBackend(["Case", "Signal"]);
    backend.seed("Case", [
      {
        id: "c1",
        entityType: "Case",
        properties: { title: "Case 1", status: "open", priority: "P1" },
      },
      {
        id: "c2",
        entityType: "Case",
        properties: { title: "Case 2", status: "closed", priority: "P2" },
      },
      {
        id: "c3",
        entityType: "Case",
        properties: { title: "Case 3", status: "open", priority: "P3" },
      },
    ]);
    backend.seed("Signal", [
      {
        id: "s1",
        entityType: "Signal",
        properties: { summary: "Alert 1", severity: "high" },
      },
      {
        id: "s2",
        entityType: "Signal",
        properties: { summary: "Alert 2", severity: "low" },
      },
    ]);
  });

  describe("query", () => {
    it("returns all entities for a type", async () => {
      const result = await backend.query({ entityType: "Case" });
      expect(result.entities).toHaveLength(3);
      expect(result.total).toBe(3);
    });

    it("filters by eq", async () => {
      const result = await backend.query({
        entityType: "Case",
        filters: [{ field: "status", op: "eq", value: "open" }],
      });
      expect(result.entities).toHaveLength(2);
    });

    it("filters by in", async () => {
      const result = await backend.query({
        entityType: "Case",
        filters: [{ field: "status", op: "in", value: ["open", "closed"] }],
      });
      expect(result.entities).toHaveLength(3);
    });

    it("paginates results", async () => {
      const result = await backend.query({
        entityType: "Case",
        limit: 1,
        offset: 1,
      });
      expect(result.entities).toHaveLength(1);
      expect(result.total).toBe(3);
    });

    it("sorts by field ascending", async () => {
      const result = await backend.query({
        entityType: "Case",
        sort: [{ field: "priority", direction: "asc" }],
      });
      expect(result.entities[0].properties["priority"]).toBe("P1");
    });

    it("applies field projection", async () => {
      const result = await backend.query({
        entityType: "Case",
        fields: ["title"],
      });
      expect(result.entities[0].properties).toHaveProperty("title");
      expect(result.entities[0].properties).not.toHaveProperty("status");
    });

    it("returns empty for unknown entity type", async () => {
      const result = await backend.query({ entityType: "Unknown" });
      expect(result.entities).toHaveLength(0);
    });
  });

  describe("aggregate", () => {
    it("counts by group", async () => {
      const result = await backend.aggregate({
        entityType: "Case",
        aggregation: { type: "count", groupBy: ["status"] },
      });
      expect(result.groups).toHaveLength(2); // open, closed
    });
  });

  describe("write", () => {
    it("upserts a new entity", async () => {
      const result = await backend.write({
        entityType: "Case",
        operation: "upsert",
        properties: { title: "New Case" },
      });
      expect(result.success).toBe(true);
      expect(result.entityId).toBeDefined();

      const stored = await backend.query({ entityType: "Case" });
      expect(stored.entities).toHaveLength(4);
    });

    it("patches an existing entity", async () => {
      const result = await backend.write({
        entityType: "Case",
        entityId: "c1",
        operation: "patch",
        properties: { status: "acknowledged" },
      });
      expect(result.success).toBe(true);

      const stored = await backend.query({
        entityType: "Case",
        filters: [{ field: "id", op: "eq", value: "c1" }],
      });
      // MemoryBackend stores by ID in map, so query filters check properties
      // Let's check directly
      const entity = backend.getStore().get("Case")?.get("c1");
      expect(entity?.properties["status"]).toBe("acknowledged");
    });

    it("returns error when patching non-existent entity", async () => {
      const result = await backend.write({
        entityType: "Case",
        entityId: "nonexistent",
        operation: "patch",
        properties: { status: "closed" },
      });
      expect(result.success).toBe(false);
      expect(result.error).toBe("Entity not found");
    });

    it("deletes an entity", async () => {
      const result = await backend.write({
        entityType: "Case",
        entityId: "c1",
        operation: "delete",
      });
      expect(result.success).toBe(true);

      const stored = await backend.query({ entityType: "Case" });
      expect(stored.entities).toHaveLength(2);
    });
  });

  describe("schema", () => {
    it("returns schema from sample entity", async () => {
      const schema = await backend.schema("Case");
      expect(schema.entityType).toBe("Case");
      expect(schema.primaryKey).toBe("id");
      expect(schema.fields.length).toBeGreaterThan(0);
    });
  });

  describe("health", () => {
    it("reports healthy", async () => {
      const health = await backend.health();
      expect(health.ok).toBe(true);
    });
  });
});
