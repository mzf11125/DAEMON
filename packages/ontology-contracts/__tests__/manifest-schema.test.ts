import { describe, it, expect } from "vitest";
import {
  ontologyManifestSchema,
  ONTOLOGY_DOMAIN,
  OBJECT_TYPES,
  ACTION_TYPES,
  type ObjectTypeName,
} from "../src/index.js";

describe("OntologyContracts", () => {
  describe("ONTOLOGY_DOMAIN", () => {
    it("is enterprise-operations", () => {
      expect(ONTOLOGY_DOMAIN).toBe("enterprise-operations");
    });
  });

  describe("OBJECT_TYPES", () => {
    it("contains all core object types", () => {
      expect(OBJECT_TYPES).toContain("Signal");
      expect(OBJECT_TYPES).toContain("Case");
      expect(OBJECT_TYPES).toContain("WorkOrder");
      expect(OBJECT_TYPES).toContain("Organization");
      expect(OBJECT_TYPES).toContain("Site");
      expect(OBJECT_TYPES).toContain("Asset");
      expect(OBJECT_TYPES).toContain("Party");
      expect(OBJECT_TYPES).toContain("Observation");
      expect(OBJECT_TYPES).toContain("Decision");
    });

    it("has 9 object types", () => {
      expect(OBJECT_TYPES).toHaveLength(9);
    });

    it("is a readonly tuple", () => {
      const typeName: ObjectTypeName = "Signal";
      expect(OBJECT_TYPES.includes(typeName)).toBe(true);
    });
  });

  describe("ACTION_TYPES", () => {
    it("contains all core action types", () => {
      expect(ACTION_TYPES).toContain("RecordObservation");
      expect(ACTION_TYPES).toContain("OpenCase");
      expect(ACTION_TYPES).toContain("AssignCase");
      expect(ACTION_TYPES).toContain("EscalateSignal");
      expect(ACTION_TYPES).toContain("ExecuteWorkOrder");
      expect(ACTION_TYPES).toContain("RecordDecision");
      expect(ACTION_TYPES).toContain("CloseCase");
    });

    it("has 7 action types", () => {
      expect(ACTION_TYPES).toHaveLength(7);
    });
  });

  describe("ontologyManifestSchema", () => {
    it("validates a valid manifest object", () => {
      const manifest = {
        version: "2.0.0",
        domain: "enterprise-operations",
        description: "Test manifest",
        defaultPack: "core",
        objectTypes: ["Signal", "Case"],
        linkTypes: ["SignalLinkedToCase"],
        actionTypes: ["OpenCase"],
        functions: ["summarizeCaseContext"],
        availablePacks: ["core"],
      };
      const result = ontologyManifestSchema.safeParse(manifest);
      expect(result.success).toBe(true);
    });

    it("rejects a manifest missing objectTypes", () => {
      const manifest = {
        version: "2.0.0",
        domain: "enterprise-operations",
        description: "Bad manifest",
        defaultPack: "core",
        linkTypes: ["SignalLinkedToCase"],
        actionTypes: ["OpenCase"],
        functions: ["summarizeCaseContext"],
        availablePacks: ["core"],
      };
      const result = ontologyManifestSchema.safeParse(manifest);
      expect(result.success).toBe(false);
    });

    it("rejects a manifest with empty objectTypes array", () => {
      const manifest = {
        version: "2.0.0",
        domain: "enterprise-operations",
        description: "Empty objects",
        defaultPack: "core",
        objectTypes: [],
        linkTypes: [],
        actionTypes: [],
        functions: [],
        availablePacks: ["core"],
      };
      const result = ontologyManifestSchema.safeParse(manifest);
      expect(result.success).toBe(false);
    });

    it("rejects a manifest with invalid version type", () => {
      const manifest = {
        version: 2,
        domain: "enterprise-operations",
        description: "Invalid version",
        defaultPack: "core",
        objectTypes: ["Signal"],
        linkTypes: [],
        actionTypes: [],
        functions: [],
        availablePacks: ["core"],
      };
      const result = ontologyManifestSchema.safeParse(manifest);
      expect(result.success).toBe(false);
    });

    it("accepts a manifest with optional fields omitted", () => {
      const manifest = {
        version: "2.0.0",
        domain: "enterprise-operations",
        objectTypes: ["Signal"],
        linkTypes: [],
        actionTypes: [],
        functions: [],
      };
      const result = ontologyManifestSchema.safeParse(manifest);
      expect(result.success).toBe(true);
    });
  });
});
