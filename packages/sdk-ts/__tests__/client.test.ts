import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createClient, type DaemonClientConfig } from "../src/index.js";

const mockConfig: DaemonClientConfig = {
  platformApiUrl: "http://localhost:8080",
  ontologyServiceUrl: "http://localhost:8081",
  caseServiceUrl: "http://localhost:8084",
  tenantId: "tenant-test",
  bearerToken: "test-token",
};

function setupMockFetch(responseOverrides: Record<string, unknown> = {}) {
  const defaults: Array<[string, unknown]> = [
    ["/v1/me", { tenantId: "tenant-test", userId: "user-1" }],
    [
      "/v1/ontology/v2/manifest",
      { version: "2.0", domain: "enterprise-operations" },
    ],
    [
      "/v1/objects/Signal?limit=10&offset=20",
      {
        items: [
          {
            rid: "r1",
            primaryKey: "sig-1",
            properties: { signalId: "sig-1", summary: "Test" },
          },
        ],
        meta: { total: 1, limit: 10, offset: 20, hasMore: false, returned: 1 },
      },
    ],
    [
      "/v1/objects/Signal",
      {
        items: [
          {
            rid: "r1",
            primaryKey: "sig-1",
            properties: { signalId: "sig-1", summary: "Test" },
          },
        ],
        meta: { total: 1, limit: 100, offset: 0, hasMore: false, returned: 1 },
      },
    ],
    [
      "/v1/cases/case-1",
      { caseId: "case-1", title: "Test Case", status: "open" },
    ],
    [
      "/v1/cases",
      {
        items: [{ caseId: "case-1", title: "Test Case", status: "open" }],
        meta: { total: 1, limit: 100, offset: 0, hasMore: false, returned: 1 },
      },
    ],
    ["/v1/actions/OpenCase", { caseId: "case-new", status: "open" }],
    ["/v1/actions/RecordDecision", { caseId: "case-1", outcome: "resolved" }],
    ["/v1/geo/map", { sites: [], assets: [], signals: [] }],
    [
      "/v1/audit/events",
      {
        items: [{ eventId: "e1", action: "OpenCase" }],
        meta: { total: 1, limit: 100, offset: 0, hasMore: false, returned: 1 },
      },
    ],
  ];

  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string | URL, _init?: RequestInit) => {
      const urlStr = typeof url === "string" ? url : url.toString();
      const allPatterns = [...defaults, ...Object.entries(responseOverrides)];
      for (const [pattern, data] of allPatterns) {
        if (urlStr.includes(pattern)) {
          return new Response(JSON.stringify({ data }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
      }
      return new Response(JSON.stringify({ data: null }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }),
  );
}

function resetMockFetch() {
  vi.unstubAllGlobals();
}

function createTestClient(config?: Partial<DaemonClientConfig>) {
  return createClient({ ...mockConfig, ...config });
}

describe("createClient", () => {
  beforeEach(() => {
    setupMockFetch();
  });

  afterEach(() => {
    resetMockFetch();
  });

  it("creates a client with all expected methods", () => {
    const client = createTestClient();
    expect(client).toHaveProperty("me");
    expect(client).toHaveProperty("manifest");
    expect(client).toHaveProperty("listSignals");
    expect(client).toHaveProperty("listCases");
    expect(client).toHaveProperty("openCase");
    expect(client).toHaveProperty("getCase");
    expect(client).toHaveProperty("recordDecision");
    expect(client).toHaveProperty("listAuditEvents");
    expect(client).toHaveProperty("listObjects");
    expect(client).toHaveProperty("listSites");
    expect(client).toHaveProperty("geoMap");
    expect(client).toHaveProperty("listAttachments");
    expect(client).toHaveProperty("uploadAttachment");
    expect(client).toHaveProperty("executeAction");
    expect(client).toHaveProperty("createShipmentDraft");
    expect(client).toHaveProperty("confirmShipment");
    expect(client).toHaveProperty("createWorkOrder");
    expect(client).toHaveProperty("executeWorkOrder");
    expect(client).toHaveProperty("summarizeCaseContext");
    expect(client).toHaveProperty("createJob");
    expect(client).toHaveProperty("getJob");
  });

  it("me() returns tenant data", async () => {
    const client = createTestClient();
    const result = await client.me();
    expect(result).toEqual({ tenantId: "tenant-test", userId: "user-1" });
  });

  it("manifest() returns manifest data", async () => {
    const client = createTestClient();
    const result = await client.manifest();
    expect(result).toEqual({ version: "2.0", domain: "enterprise-operations" });
  });

  it("listSignals() returns signal items", async () => {
    const client = createTestClient();
    const result = await client.listSignals();
    expect(result.items).toHaveLength(1);
    expect(result.items[0].primaryKey).toBe("sig-1");
    expect(result.meta?.total).toBe(1);
  });

  it("listSignals() accepts pagination params", async () => {
    const client = createTestClient();
    const result = await client.listSignals({ limit: 10, offset: 20 });
    expect(result.items).toHaveLength(1);
  });

  it("listCases() returns case items", async () => {
    const client = createTestClient();
    const result = await client.listCases();
    expect(result.items).toHaveLength(1);
  });

  it("openCase() creates a case", async () => {
    const client = createTestClient();
    const result = await client.openCase({
      title: "New Case",
      signalIds: ["sig-1"],
    });
    expect(result).toEqual({ caseId: "case-new", status: "open" });
  });

  it("getCase() fetches a case by ID", async () => {
    const client = createTestClient();
    const result = await client.getCase("case-1");
    expect(result.caseId).toBe("case-1");
    expect(result.status).toBe("open");
  });

  it("recordDecision() records a decision", async () => {
    const client = createTestClient();
    const result = await client.recordDecision({
      caseId: "case-1",
      outcome: "resolved",
      rationale: "Issue fixed",
    });
    expect(result.outcome).toBe("resolved");
  });

  it("listAuditEvents() returns audit events", async () => {
    const client = createTestClient();
    const result = await client.listAuditEvents({
      resourceType: "Case",
      resourceId: "case-1",
    });
    expect(result.items).toHaveLength(1);
  });

  it("listObjects() queries by object type", async () => {
    const client = createTestClient();
    const result = await client.listObjects("Signal");
    expect(result.items).toHaveLength(1);
  });

  it("geoMap() returns geo data", async () => {
    const client = createTestClient();
    const result = await client.geoMap();
    expect(result.sites).toEqual([]);
    expect(result.signals).toEqual([]);
  });

  it("executeAction() calls an action", async () => {
    setupMockFetch({
      "/v1/actions/AssignCase": { caseId: "case-1", assignee: "user-2" },
    });
    const client = createTestClient();
    const result = await client.executeAction("AssignCase", {
      caseId: "case-1",
      assignee: "user-2",
    });
    expect(result).toHaveProperty("caseId");
  });

  it("createWorkOrder() creates a work order", async () => {
    setupMockFetch({
      "/v1/actions/CreateWorkOrder": { workOrderId: "wo-1", status: "pending" },
    });
    const client = createTestClient();
    const result = await client.createWorkOrder({
      title: "Repair pump",
      assetId: "asset-1",
    });
    expect(result).toHaveProperty("workOrderId");
  });

  it("summarizeCaseContext() returns summary", async () => {
    setupMockFetch({
      "/v1/functions/summarizeCaseContext": {
        summary: "Case summary",
        caseId: "case-1",
        signalCount: 3,
      },
    });
    const client = createTestClient();
    const result = await client.summarizeCaseContext("case-1");
    expect(result.summary).toBe("Case summary");
    expect(result.signalCount).toBe(3);
  });

  it("handles error responses", async () => {
    vi.unstubAllGlobals();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(
          JSON.stringify({
            error: { code: "NOT_FOUND", message: "Resource not found" },
          }),
          { status: 404, headers: { "Content-Type": "application/json" } },
        );
      }),
    );
    const client = createTestClient();
    await expect(client.getCase("nonexistent")).rejects.toThrow(
      "Resource not found",
    );
  });

  it("handles network errors", async () => {
    vi.unstubAllGlobals();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("Network error");
      }),
    );
    const client = createTestClient();
    await expect(client.me()).rejects.toThrow("Network error");
  });
});
