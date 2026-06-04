/**
 * OpenAPI 3.1 description of the REST surface. This mirrors the gateway's
 * read/write contract so the same handlers can be validated against a single
 * schema in {@link file://../../../tests/contract/api-contract.test.ts}.
 */

/** Scoped v1 operations accept optional tenant/domain headers (full enforcement on Nest gateway). */
const TENANCY_HEADER_PARAMS = [
  { $ref: "#/components/parameters/DaemonTenantHeader" },
  { $ref: "#/components/parameters/DaemonDomainHeader" },
] as const;

export const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "Daemon REST API",
    version: "0.1.0",
    description:
      "Read/write access to the Daemon ontology registry over HTTP. " +
      "Optional headers X-Daemon-Tenant and X-Daemon-Domain scope requests; the NestJS gateway enforces tenant registry and enabled domains. " +
      "REST may read X-Daemon-Tenant for session defaults but does not fully mirror gateway domain validation.",
  },
  paths: {
    "/health": {
      get: {
        operationId: "health",
        summary: "Liveness probe",
        responses: {
          "200": {
            description: "Service is up",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Health" },
              },
            },
          },
        },
      },
    },
    "/v1/entities/{id}": {
      get: {
        operationId: "readEntity",
        summary: "Resolve an entity by id",
        parameters: [
          ...TENANCY_HEADER_PARAMS,
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
          {
            name: "ontologyId",
            in: "query",
            required: false,
            schema: { type: "string", default: "foundation" },
          },
        ],
        responses: {
          "200": {
            description: "Entity record",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/EntityRecord" },
              },
            },
          },
          "404": {
            description: "Entity not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    },
    "/v1/analytics/search": {
      get: {
        operationId: "analyticsSearchReport",
        summary: "Search entities and return an analytics report",
        parameters: [
          ...TENANCY_HEADER_PARAMS,
          { name: "q", in: "query", schema: { type: "string" } },
          { name: "ontologyId", in: "query", schema: { type: "string" } },
          { name: "limit", in: "query", schema: { type: "integer" } },
          { name: "property", in: "query", schema: { type: "string" } },
          { name: "propertyValue", in: "query", schema: { type: "string" } },
          { name: "reportTitle", in: "query", schema: { type: "string" } },
        ],
        responses: {
          "200": {
            description: "Analytics report",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AnalyticsReport" },
              },
            },
          },
        },
      },
    },
    "/v1/analytics/entities": {
      get: {
        operationId: "analyticsSearchEntities",
        summary: "Search entities (raw records)",
        parameters: [
          ...TENANCY_HEADER_PARAMS,
          { name: "q", in: "query", schema: { type: "string" } },
          { name: "ontologyId", in: "query", schema: { type: "string" } },
          { name: "limit", in: "query", schema: { type: "integer" } },
          { name: "property", in: "query", schema: { type: "string" } },
          { name: "propertyValue", in: "query", schema: { type: "string" } },
        ],
        responses: {
          "200": {
            description: "Matching entity records",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/EntityRecord" },
                },
              },
            },
          },
        },
      },
    },
    "/v1/analytics/dashboard": {
      get: {
        operationId: "analyticsDashboard",
        summary: "Build a dashboard spec for an ontology",
        parameters: [
          ...TENANCY_HEADER_PARAMS,
          { name: "ontologyId", in: "query", schema: { type: "string" } },
          { name: "breakdownField", in: "query", schema: { type: "string" } },
        ],
        responses: {
          "200": {
            description: "Dashboard specification",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/DashboardSpec" },
              },
            },
          },
        },
      },
    },
    "/v1/automations/run": {
      post: {
        operationId: "automationsRun",
        summary: "Run workflow steps and optionally commit a write loop",
        parameters: [...TENANCY_HEADER_PARAMS],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AutomationsRunRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Workflow and optional loop outcome",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AutomationRunResult" },
              },
            },
          },
        },
      },
    },
    "/v1/automations/evaluate": {
      post: {
        operationId: "automationsEvaluate",
        summary: "Evaluate approval requirements for a patch",
        parameters: [...TENANCY_HEADER_PARAMS],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AutomationsEvaluateRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Approval decision",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApprovalDecision" },
              },
            },
          },
        },
      },
    },
    "/v1/automations/approve": {
      post: {
        operationId: "automationsApprove",
        summary: "Commit an approval-gated write loop",
        parameters: [...TENANCY_HEADER_PARAMS],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AutomationsApproveRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Loop committed",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/WriteResult" },
              },
            },
          },
        },
      },
    },
    "/v1/governance/pack/validate-change": {
      post: {
        operationId: "validatePackSchemaChange",
        summary: "Evaluate a proposed pack/schema change against governance policies",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SchemaChangeRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Gate evaluation result",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SchemaChangeGate" },
              },
            },
          },
        },
      },
    },
    "/v1/write": {
      post: {
        operationId: "writeEntity",
        summary: "Apply a patch to an entity",
        parameters: [...TENANCY_HEADER_PARAMS],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/WriteCommand" },
            },
          },
        },
        responses: {
          "200": {
            description: "Write committed",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/WriteResult" },
              },
            },
          },
          "404": {
            description: "Entity not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    },
  },
  components: {
    parameters: {
      DaemonTenantHeader: {
        name: "X-Daemon-Tenant",
        in: "header",
        required: false,
        schema: { type: "string", default: "default" },
        description:
          "Tenant id from configs/tenancy.yaml (e.g. default, inst-alpha, ent-beta).",
      },
      DaemonDomainHeader: {
        name: "X-Daemon-Domain",
        in: "header",
        required: false,
        schema: { type: "string", default: "foundation" },
        description:
          "Domain id from configs/ontology/domains/catalog.yaml; must be enabled for the tenant on the gateway.",
      },
    },
    schemas: {
      Health: {
        type: "object",
        required: ["status"],
        properties: { status: { type: "string", enum: ["ok"] } },
      },
      EntityRecord: {
        type: "object",
        required: ["entityId", "ontologyId", "properties", "version", "updatedAt"],
        properties: {
          entityId: { type: "string" },
          ontologyId: { type: "string" },
          properties: { type: "object", additionalProperties: true },
          version: { type: "integer" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      WriteCommand: {
        type: "object",
        required: ["entityId", "ontologyId", "patch"],
        properties: {
          entityId: { type: "string" },
          ontologyId: { type: "string" },
          patch: { type: "object", additionalProperties: true },
          idempotencyKey: { type: "string" },
        },
      },
      WriteResult: {
        type: "object",
        required: ["writeId", "status", "version"],
        properties: {
          writeId: { type: "string" },
          status: { type: "string", enum: ["committed"] },
          version: { type: "integer" },
        },
      },
      Error: {
        type: "object",
        required: ["code", "message"],
        properties: {
          code: { type: "string" },
          message: { type: "string" },
        },
      },
      AnalyticsReport: {
        type: "object",
        required: ["id", "title", "rowCount", "columns", "rows"],
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          rowCount: { type: "integer" },
          columns: { type: "array", items: { type: "string" } },
          rows: { type: "array", items: { type: "object", additionalProperties: true } },
        },
      },
      DashboardSpec: {
        type: "object",
        required: ["ontologyId", "widgets"],
        properties: {
          ontologyId: { type: "string" },
          widgets: {
            type: "array",
            items: {
              type: "object",
              required: ["id", "title", "kind", "data"],
              properties: {
                id: { type: "string" },
                title: { type: "string" },
                kind: { type: "string" },
                data: { type: "object", additionalProperties: true },
              },
            },
          },
        },
      },
      AutomationsRunRequest: {
        type: "object",
        required: ["steps"],
        properties: {
          steps: {
            type: "array",
            items: {
              type: "object",
              required: ["id", "action"],
              properties: {
                id: { type: "string" },
                action: { type: "string" },
              },
            },
          },
          loop: { $ref: "#/components/schemas/WriteCommand" },
          loopFirst: {
            type: "boolean",
            description:
              "When true with loop, run write loop before workflow steps (LOOP then WF). Default false.",
          },
        },
      },
      AutomationsEvaluateRequest: {
        type: "object",
        required: ["patch"],
        properties: {
          patch: { type: "object", additionalProperties: true },
          approvals: { type: "array", items: { type: "string" } },
        },
      },
      AutomationsApproveRequest: {
        type: "object",
        required: ["loop", "approvals"],
        properties: {
          loop: { $ref: "#/components/schemas/WriteCommand" },
          approvals: { type: "array", items: { type: "string" } },
        },
      },
      AutomationRunResult: {
        type: "object",
        required: ["workflowResults"],
        properties: {
          workflowResults: { type: "array", items: { type: "string" } },
          loop: { $ref: "#/components/schemas/WriteResult" },
        },
      },
      ApprovalDecision: {
        type: "object",
        required: ["requiresApproval", "approved"],
        properties: {
          requiresApproval: { type: "boolean" },
          approved: { type: "boolean" },
          reasons: { type: "array", items: { type: "string" } },
        },
      },
      SchemaChangeRequest: {
        type: "object",
        required: ["packId"],
        properties: {
          packId: { type: "string" },
          proposedPackDir: {
            type: "string",
            description: "Relative path under configs/ontology/packs for proposed pack YAML",
          },
          proposedOverrides: {
            type: "object",
            properties: {
              entities: {
                type: "object",
                additionalProperties: {
                  type: "object",
                  properties: {
                    fields: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          name: { type: "string" },
                          type: { type: "string" },
                          required: { type: "boolean" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          changeType: {
            type: "string",
            enum: [
              "field_add",
              "field_remove",
              "type_rename",
              "relation_add",
              "relation_remove",
              "junction_add",
              "junction_remove",
            ],
          },
          breaking: { type: "boolean" },
          semverBump: { type: "string", enum: ["major", "minor", "patch"] },
          approvals: { type: "array", items: { type: "string" } },
        },
      },
      PackDiffSummary: {
        type: "object",
        properties: {
          breaking: { type: "boolean" },
          semverBump: { type: "string", enum: ["major", "minor", "patch"] },
          changes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                changeType: { type: "string" },
                entityType: { type: "string" },
                field: { type: "string" },
                detail: { type: "string" },
              },
            },
          },
        },
      },
      SchemaChangeGate: {
        type: "object",
        required: ["allowed", "auditAction"],
        properties: {
          allowed: { type: "boolean" },
          reason: { type: "string" },
          obligations: { type: "array", items: { type: "string" } },
          auditAction: {
            type: "string",
            enum: ["ontology.schema.change", "ontology.schema.change.pending"],
          },
          diff: { $ref: "#/components/schemas/PackDiffSummary" },
        },
      },
    },
  },
} as const;
