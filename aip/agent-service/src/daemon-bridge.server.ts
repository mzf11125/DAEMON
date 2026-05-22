import Fastify from "fastify";

const ontologyUrl = () =>
  (process.env.ONTOLOGY_SERVICE_URL ?? "http://localhost:8081").replace(/\/$/, "");
const platformUrl = () =>
  (process.env.PLATFORM_API_URL ?? "http://localhost:8080").replace(/\/$/, "");
const caseUrl = () =>
  (process.env.CASE_SERVICE_URL ?? "http://localhost:8084").replace(/\/$/, "");
const tenantId = () => process.env.TENANT_ID ?? "tenant-demo";

async function fetchJSON(base: string, path: string): Promise<unknown> {
  const res = await fetch(`${base}${path}`, {
    headers: { "X-Tenant-Id": tenantId(), "Content-Type": "application/json" },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(JSON.stringify(body));
  }
  if (body && typeof body === "object" && body !== null && "data" in body) {
    return (body as { data: unknown }).data;
  }
  return body;
}

/** Lightweight agent-service for DAEMON: health + read-only ontology bridge to Go :8081. */
export async function buildDaemonBridgeServer() {
  const app = Fastify({ logger: false });

  const health = async () => ({
    status: "ok",
    service: "agent-service",
    mode: "daemon-http-bridge",
    ontology: ontologyUrl(),
  });

  app.get("/health", health);
  app.get("/internal/health", health);

  app.get("/v1/bridge/manifest", async () => fetchJSON(ontologyUrl(), "/v1/ontology/v2/manifest"));
  app.get("/v1/bridge/objects/:type", async (req) => {
    const { type } = req.params as { type: string };
    return fetchJSON(ontologyUrl(), `/v1/objects/${encodeURIComponent(type)}`);
  });
  app.get("/v1/bridge/signals", async () =>
    fetchJSON(platformUrl(), "/v1/signals?limit=10"),
  );
  app.get("/v1/bridge/cases", async () => fetchJSON(caseUrl(), "/v1/cases?limit=10"));

  return app;
}
