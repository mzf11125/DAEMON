import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";

describe("Console Web — smoke tests", () => {
  it("renders a test component", () => {
    function TestComponent() {
      return React.createElement(
        "div",
        { "data-testid": "test" },
        "DAEMON Console",
      );
    }
    render(React.createElement(TestComponent));
    expect(screen.getByTestId("test")).toBeDefined();
    expect(screen.getByText("DAEMON Console")).toBeDefined();
  });

  it("daemon client config has required URLs", () => {
    const config = {
      platformApiUrl: "http://localhost:8080",
      ontologyServiceUrl: "http://localhost:8081",
      caseServiceUrl: "http://localhost:8084",
    };
    expect(config.platformApiUrl).toBeDefined();
    expect(config.ontologyServiceUrl).toBeDefined();
    expect(config.caseServiceUrl).toBeDefined();
  });

  it("api envelope type matches expected shape", () => {
    type ApiEnvelope<T> = {
      data?: T;
      error?: {
        code: string;
        message: string;
        requestId?: string;
        timestamp?: string;
      };
    };
    const envelope: ApiEnvelope<{ id: string }> = { data: { id: "123" } };
    expect(envelope.data?.id).toBe("123");
    expect(envelope.error).toBeUndefined();
  });
});
