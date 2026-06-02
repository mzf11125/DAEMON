import { describe, it, expect } from "vitest";

describe("MCP Ontology — config", () => {
  describe("config values", () => {
    it("MCP_TOOL_SCHEMA_VERSION is defined", async () => {
      const { MCP_TOOL_SCHEMA_VERSION } = await import("../src/config.js");
      expect(MCP_TOOL_SCHEMA_VERSION).toBeDefined();
      expect(typeof MCP_TOOL_SCHEMA_VERSION).toBe("string");
    });

    it("default URLs are localhost-based", async () => {
      const { ontologyUrl, platformUrl, caseUrl } =
        await import("../src/config.js");
      expect(ontologyUrl).toContain("localhost");
      expect(platformUrl).toContain("localhost");
      expect(caseUrl).toContain("localhost");
    });

    it("tenantId has a default value", async () => {
      const { tenantId } = await import("../src/config.js");
      expect(tenantId).toBeDefined();
    });

    it("rateLimitPerMin is a positive number", async () => {
      const { rateLimitPerMin } = await import("../src/config.js");
      expect(rateLimitPerMin).toBeGreaterThan(0);
      expect(typeof rateLimitPerMin).toBe("number");
    });
  });

  describe("range service functions", () => {
    it("rangeScreenAddress is a function", async () => {
      const { rangeScreenAddress } = await import("../src/range.js");
      expect(typeof rangeScreenAddress).toBe("function");
    });

    it("rangeGetTransfers is a function", async () => {
      const { rangeGetTransfers } = await import("../src/range.js");
      expect(typeof rangeGetTransfers).toBe("function");
    });

    it("rangeScreenAddress returns expected structure", async () => {
      const { rangeScreenAddress } = await import("../src/range.js");
      const result = await rangeScreenAddress("0xTest");
      expect(result).toHaveProperty("address");
    });

    it("rangeGetTransfers returns paginated structure", async () => {
      const { rangeGetTransfers } = await import("../src/range.js");
      const result = await rangeGetTransfers("0xTest", 5);
      expect(result).toHaveProperty("address");
    });
  });

  describe("express cargo functions", () => {
    it("loadIntakeFixture is a function", async () => {
      const { loadIntakeFixture } = await import("../src/express-cargo.js");
      expect(typeof loadIntakeFixture).toBe("function");
    });

    it("buildIntakeProposal is a function", async () => {
      const { buildIntakeProposal } = await import("../src/express-cargo.js");
      expect(typeof buildIntakeProposal).toBe("function");
    });

    it("repoRoot returns a string", async () => {
      const { repoRoot } = await import("../src/express-cargo.js");
      expect(typeof repoRoot()).toBe("string");
    });
  });
});
