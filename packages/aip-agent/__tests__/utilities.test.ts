import { describe, it, expect } from "vitest";
import { maxPromptChars, maxOutputTokens } from "../src/limits.js";
import { redactForLog } from "../src/redact.js";
import { resolveProvider } from "../src/providers.js";
import type { LLMProvider } from "../src/providers.js";
import { withRetry } from "../src/retry.js";

describe("AIP Agent — utilities", () => {
  describe("maxPromptChars", () => {
    it("returns a positive number", () => {
      expect(maxPromptChars()).toBeGreaterThan(0);
    });

    it("reads from environment", () => {
      process.env.AIP_MAX_PROMPT_CHARS = "50000";
      expect(maxPromptChars()).toBe(50000);
      delete process.env.AIP_MAX_PROMPT_CHARS;
    });
  });

  describe("maxOutputTokens", () => {
    it("returns a positive number", () => {
      expect(maxOutputTokens()).toBeGreaterThan(0);
    });
  });

  describe("redactForLog", () => {
    it("returns the same text if no secrets present", () => {
      const text = "Hello world, this is a test message.";
      expect(redactForLog(text)).toBe(text);
    });

    it("redacts email addresses", () => {
      const text = "Contact john@example.com for support.";
      const result = redactForLog(text);
      expect(result).toBe("Contact [email] for support.");
    });

    it("redacts JWT tokens", () => {
      const text =
        "Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dummy";
      const result = redactForLog(text);
      expect(result).toBe("Token: [jwt]");
    });

    it("redacts Bearer tokens", () => {
      const text = "Authorization: Bearer sk-abc123secret";
      const result = redactForLog(text);
      expect(result).toBe("Authorization: Bearer [redacted]");
    });

    it("passes plain text through unchanged", () => {
      const text = "This is a normal message with no secrets.";
      expect(redactForLog(text)).toBe(text);
    });
  });

  describe("resolveProvider", () => {
    it("defaults to openrouter", () => {
      delete process.env.LLM_PROVIDER;
      expect(resolveProvider()).toBe("openrouter");
    });

    it("reads from LLM_PROVIDER env", () => {
      process.env.LLM_PROVIDER = "ollama";
      expect(resolveProvider()).toBe("ollama");
      delete process.env.LLM_PROVIDER;
    });
  });

  describe("withRetry", () => {
    it("returns the result on first success", async () => {
      const result = await withRetry(() => Promise.resolve("success"));
      expect(result).toBe("success");
    });

    it("retries on failure", async () => {
      let calls = 0;
      const fn = () => {
        calls++;
        if (calls < 2) throw new Error("temporary error");
        return Promise.resolve("recovered");
      };
      const result = await withRetry(fn, { attempts: 3, baseMs: 1 });
      expect(result).toBe("recovered");
      expect(calls).toBe(2);
    });

    it("throws after max attempts", async () => {
      let calls = 0;
      const fn = () => {
        calls++;
        return Promise.reject(new Error("persistent error"));
      };
      await expect(withRetry(fn, { attempts: 2, baseMs: 1 })).rejects.toThrow(
        "persistent error",
      );
      expect(calls).toBe(2);
    });
  });
});
