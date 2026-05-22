import { createClient } from "@daemon/sdk-ts";

export function createDaemonClient(bearerToken?: string) {
  return createClient({
    platformApiUrl: process.env.NEXT_PUBLIC_PLATFORM_API_URL ?? "http://localhost:8080",
    ontologyServiceUrl: process.env.NEXT_PUBLIC_ONTOLOGY_SERVICE_URL ?? "http://localhost:8081",
    caseServiceUrl: process.env.NEXT_PUBLIC_CASE_SERVICE_URL ?? "http://localhost:8084",
    rulesEngineUrl: process.env.NEXT_PUBLIC_RULES_ENGINE_URL ?? "http://localhost:8083",
    ingestionServiceUrl: process.env.NEXT_PUBLIC_INGESTION_SERVICE_URL ?? "http://localhost:8082",
    tenantId: process.env.NEXT_PUBLIC_TENANT_ID ?? "tenant-demo",
    bearerToken,
  });
}
