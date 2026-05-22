export const MCP_TOOL_SCHEMA_VERSION =
  process.env.MCP_TOOL_SCHEMA_VERSION ?? "0.2.0";

export const ontologyUrl = process.env.ONTOLOGY_SERVICE_URL ?? "http://localhost:8081";
export const platformUrl = process.env.PLATFORM_API_URL ?? "http://localhost:8080";
export const caseUrl = process.env.CASE_SERVICE_URL ?? "http://localhost:8084";
export const tenantId = process.env.TENANT_ID ?? "tenant-demo";
export const rateLimitPerMin = Number(process.env.MCP_RATE_LIMIT_PER_MIN ?? 60);
