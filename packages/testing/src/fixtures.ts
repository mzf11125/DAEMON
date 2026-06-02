import type {
  OntologySchema,
  ObjectTypeDefinition,
} from "@daemon/ontology-language";

export function createTestObjectType(
  overrides?: Partial<ObjectTypeDefinition>,
): ObjectTypeDefinition {
  return {
    apiName: "Signal",
    label: "Signal",
    description: "An operational signal",
    primaryKey: "signalId",
    titleProperty: "summary",
    properties: [
      { name: "signalId", type: "string", required: true },
      { name: "summary", type: "string", required: true },
      {
        name: "severity",
        type: "enum",
        required: false,
        enumValues: ["low", "medium", "high", "critical"],
      },
      { name: "status", type: "string", required: false },
      { name: "priority", type: "number", required: false },
      { name: "openedAt", type: "timestamp", required: false },
      { name: "ownerId", type: "string", required: false },
    ],
    ...overrides,
  };
}

export function createTestOntology(
  overrides?: Partial<OntologySchema>,
): OntologySchema {
  return {
    objectTypes: [createTestObjectType()],
    linkTypes: [],
    actionTypes: [],
    ...overrides,
  };
}

export function createTestManifest() {
  return {
    version: "2.0.0",
    domain: "enterprise-operations",
    description: "Test manifest",
    defaultPack: "core",
    objectTypes: [
      {
        apiName: "Signal",
        label: "Signal",
        primaryKey: "signalId",
        titleProperty: "summary",
        properties: [],
      },
    ],
    linkTypes: [],
    actionTypes: [],
    functions: [],
    availablePacks: ["core"],
  };
}

export function createTestSignal(overrides?: Record<string, unknown>) {
  return {
    signalId: "sig-test-001",
    summary: "Test signal",
    severity: "medium",
    status: "open",
    priority: 1,
    openedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function createTestCase(overrides?: Record<string, unknown>) {
  return {
    caseId: "case-test-001",
    title: "Test case",
    status: "open",
    priority: "medium",
    openedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function createTestWorkOrder(overrides?: Record<string, unknown>) {
  return {
    workOrderId: "wo-test-001",
    title: "Test work order",
    status: "pending",
    priority: "medium",
    ...overrides,
  };
}

export function createTestObject(
  typeApiName: string,
  properties: Record<string, unknown>,
) {
  return {
    id: crypto.randomUUID(),
    typeApiName,
    properties,
    legalEntityId: "test-entity",
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };
}
