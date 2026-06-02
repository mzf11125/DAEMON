import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { Badge, Card } from "../src/index.js";

describe("Badge", () => {
  it("renders children text", () => {
    render(React.createElement(Badge, null, "Test Badge"));
    expect(screen.getByText("Test Badge")).toBeDefined();
  });

  it("renders with default tone", () => {
    const { container } = render(React.createElement(Badge, null, "Default"));
    const span = container.querySelector("span");
    expect(span?.style.background).toBe("rgb(45, 58, 77)");
  });

  it("renders with high tone", () => {
    const { container } = render(
      React.createElement(Badge, { tone: "high" }, "High"),
    );
    const span = container.querySelector("span");
    expect(span?.style.background).toBe("rgb(92, 43, 43)");
    expect(span?.style.color).toBe("rgb(255, 180, 180)");
  });

  it("renders inline-block span", () => {
    const { container } = render(React.createElement(Badge, null, "Inline"));
    const span = container.querySelector("span");
    expect(span?.style.display).toBe("inline-block");
  });

  it("renders with correct border radius", () => {
    const { container } = render(React.createElement(Badge, null, "Rounded"));
    const span = container.querySelector("span");
    expect(span?.style.borderRadius).toBe("4px");
  });
});

describe("Card", () => {
  it("renders title and children", () => {
    render(React.createElement(Card, { title: "My Card" }, "Card content"));
    expect(screen.getByText("My Card")).toBeDefined();
    expect(screen.getByText("Card content")).toBeDefined();
  });

  it("renders as an article element", () => {
    const { container } = render(
      React.createElement(Card, { title: "Test" }, "Content"),
    );
    const article = container.querySelector("article");
    expect(article).toBeDefined();
    expect(article?.tagName).toBe("ARTICLE");
  });

  it("has dark background styling", () => {
    const { container } = render(
      React.createElement(Card, { title: "Dark" }, "Style"),
    );
    const article = container.querySelector("article");
    expect(article?.style.background).toBe("rgb(21, 27, 36)");
    expect(article?.style.border).toBe("1px solid rgb(42, 53, 68)");
  });

  it("renders title as bold text", () => {
    const { container } = render(
      React.createElement(Card, { title: "Bold Title" }, ""),
    );
    const strong = container.querySelector("strong");
    expect(strong).toBeDefined();
    expect(strong?.textContent).toBe("Bold Title");
  });

  it("renders content area with muted color", () => {
    render(React.createElement(Card, { title: "Title" }, "Muted content"));
    const content = screen.getByText("Muted content");
    expect(content).toBeDefined();
  });
});
