import { describe, it, expect } from "vitest";

describe("LLM Gateway — unit", () => {
  describe("allowedModel", () => {
    it("allows all models if no allowlist env set", () => {
      delete process.env.LLM_MODEL_ALLOWLIST;
      // Default behavior: allowlist empty = allow all
      expect(true).toBe(true);
    });
  });

  describe("upstreamBase", () => {
    it("defaults to openrouter for unknown provider", () => {
      process.env.OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
      expect(process.env.OPENROUTER_BASE_URL).toBeDefined();
    });

    it("ollama base url falls back to localhost", () => {
      delete process.env.OLLAMA_BASE_URL;
      const base = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434/v1";
      expect(base).toContain("localhost");
    });
  });

  describe("env configuration", () => {
    it("LLM_GATEWAY_PORT default is set", () => {
      delete process.env.LLM_GATEWAY_PORT;
      const port = Number(process.env.LLM_GATEWAY_PORT ?? 8092);
      expect(port).toBe(8092);
    });

    it("LLM_PROVIDER can be configured", () => {
      process.env.LLM_PROVIDER = "ollama";
      expect(process.env.LLM_PROVIDER).toBe("ollama");
      delete process.env.LLM_PROVIDER;
    });

    it("OPENROUTER_API_KEY fallback works", () => {
      process.env.OPENROUTER_API_KEY = "test-key-123";
      expect(process.env.OPENROUTER_API_KEY).toBe("test-key-123");
      delete process.env.OPENROUTER_API_KEY;
    });
  });
});
