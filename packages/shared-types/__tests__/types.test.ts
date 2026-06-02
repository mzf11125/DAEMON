import { describe, it, expect } from "vitest";
import type { SignalProperties, CaseSummary } from "../src/index.js";

describe("SignalProperties", () => {
  it("accepts a valid signal", () => {
    const signal: SignalProperties = {
      signalId: "sig-001",
      summary: "High temperature alert",
      severity: "high",
      status: "open",
      priority: "1",
    };
    expect(signal.signalId).toBe("sig-001");
    expect(signal.summary).toBe("High temperature alert");
    expect(signal.severity).toBe("high");
  });

  it("allows optional fields to be undefined", () => {
    const signal: SignalProperties = {
      signalId: "sig-002",
      summary: "Minimal signal",
    };
    expect(signal.severity).toBeUndefined();
    expect(signal.status).toBeUndefined();
    expect(signal.priority).toBeUndefined();
  });

  it("has string type for priority", () => {
    const signal: SignalProperties = {
      signalId: "sig-003",
      summary: "test",
      priority: "3",
    };
    expect(typeof signal.priority).toBe("string");
  });
});

describe("CaseSummary", () => {
  it("accepts a valid case", () => {
    const c: CaseSummary = {
      caseId: "case-001",
      title: "Equipment failure at Site A",
      status: "open",
      priority: "high",
    };
    expect(c.caseId).toBe("case-001");
    expect(c.title).toBe("Equipment failure at Site A");
    expect(c.status).toBe("open");
  });

  it("allows optional ownerId", () => {
    const c: CaseSummary = {
      caseId: "case-002",
      title: "Unassigned case",
      status: "open",
    };
    expect(c.ownerId).toBeUndefined();
    expect(c.priority).toBeUndefined();
  });

  it("supports assigned case with owner", () => {
    const c: CaseSummary = {
      caseId: "case-003",
      title: "Assigned case",
      status: "in_progress",
      ownerId: "user-1",
      priority: "critical",
    };
    expect(c.ownerId).toBe("user-1");
    expect(c.priority).toBe("critical");
  });
});
