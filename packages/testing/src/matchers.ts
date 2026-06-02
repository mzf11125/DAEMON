import { expect } from "vitest";

export interface CustomMatchers<R = unknown> {
  toBeValidDashboard(): R;
  toBeValidOntologySchema(): R;
}

export const customMatchers = {
  toBeValidDashboard(received: unknown) {
    if (typeof received !== "object" || received === null) {
      return {
        pass: false,
        message: () => `expected ${received} to be a valid dashboard object`,
      };
    }
    const d = received as Record<string, unknown>;
    const hasUid = typeof d.uid === "string";
    const hasTitle = typeof d.title === "string";
    const hasPanels = Array.isArray(d.panels);
    const pass = hasUid && hasTitle && hasPanels;
    return {
      pass,
      message: () =>
        pass
          ? `expected ${JSON.stringify(received)} not to be a valid dashboard`
          : `expected ${JSON.stringify(received)} to be a valid dashboard (missing uid/title/panels)`,
    };
  },

  toBeValidOntologySchema(received: unknown) {
    if (typeof received !== "object" || received === null) {
      return {
        pass: false,
        message: () => `expected ${received} to be a valid ontology schema`,
      };
    }
    const s = received as Record<string, unknown>;
    const hasObjects = Array.isArray(s.objectTypes);
    const hasLinks = Array.isArray(s.linkTypes);
    const hasActions = Array.isArray(s.actionTypes);
    const pass = hasObjects && hasLinks && hasActions;
    return {
      pass,
      message: () =>
        pass
          ? `expected ${JSON.stringify(received)} not to be a valid ontology schema`
          : `expected ${JSON.stringify(received)} to be a valid ontology schema (missing objectTypes/linkTypes/actionTypes)`,
    };
  },
};
