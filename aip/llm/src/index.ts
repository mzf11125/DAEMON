import http from "node:http";

const port = Number(process.env.LLM_GATEWAY_PORT ?? 8092);
const timeoutMs = Number(process.env.LLM_GATEWAY_TIMEOUT_MS ?? 60_000);

function allowedModel(model: string): boolean {
  const allow = process.env.LLM_MODEL_ALLOWLIST;
  if (!allow) return true;
  return allow.split(",").map((m) => m.trim()).includes(model);
}

function upstreamBase(provider: string): string {
  switch (provider) {
    case "ollama":
      return (process.env.OLLAMA_BASE_URL ?? "http://localhost:11434/v1").replace(/\/$/, "");
    case "lmstudio":
      return (process.env.LMSTUDIO_BASE_URL ?? "http://localhost:1234/v1").replace(/\/$/, "");
    default:
      return (process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1").replace(
        /\/$/,
        "",
      );
  }
}

function upstreamKey(): string {
  return (
    process.env.OPENROUTER_API_KEY ??
    process.env.OPENAI_API_KEY ??
    process.env.OLLAMA_API_KEY ??
    "not-needed"
  );
}

async function proxyChat(body: unknown): Promise<Response> {
  const provider = (process.env.LLM_PROVIDER ?? "openrouter").toLowerCase();
  const parsed = body as { model?: string };
  const model = parsed.model ?? process.env.LLM_MODEL ?? "openai/gpt-4o-mini";
  if (!allowedModel(model)) {
    return new Response(
      JSON.stringify({ error: { code: "MODEL_NOT_ALLOWED", message: model } }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${upstreamBase(provider)}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${upstreamKey()}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await res.text();
    return new Response(text, {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  } finally {
    clearTimeout(timer);
  }
}

const server = http.createServer(async (req, res) => {
  if (req.url === "/health" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", service: "llm-gateway" }));
    return;
  }
  if (req.url === "/v1/chat/completions" && req.method === "POST") {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    const upstream = await proxyChat(body);
    res.writeHead(upstream.status, { "Content-Type": "application/json" });
    res.end(await upstream.text());
    return;
  }
  res.writeHead(404);
  res.end();
});

server.listen(port, () => {
  console.log(`llm-gateway listening on :${port}`);
});
