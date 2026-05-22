import {
  ontologyUrl,
  platformUrl,
  caseUrl,
  tenantId,
  rateLimitPerMin,
} from "./config.js";

const rateBuckets = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(key: string): void {
  const now = Date.now();
  const bucket = rateBuckets.get(key) ?? { count: 0, resetAt: now + 60_000 };
  if (now > bucket.resetAt) {
    bucket.count = 0;
    bucket.resetAt = now + 60_000;
  }
  bucket.count += 1;
  rateBuckets.set(key, bucket);
  if (bucket.count > rateLimitPerMin) {
    throw new Error(
      JSON.stringify({ code: "RATE_LIMITED", message: "too many requests", retryable: true }),
    );
  }
}

function baseHeaders(authHeader?: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Tenant-Id": tenantId,
  };
  if (authHeader) {
    headers.Authorization = authHeader;
  }
  return headers;
}

async function fetchJSON(
  base: string,
  path: string,
  authHeader?: string,
  init?: RequestInit,
): Promise<unknown> {
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: { ...baseHeaders(authHeader), ...(init?.headers as Record<string, string>) },
  });
  const ct = res.headers.get("content-type") ?? "";
  let body: unknown;
  if (ct.includes("application/json")) {
    body = await res.json();
  } else {
    const text = await res.text();
    if (!res.ok) {
      throw new Error(text.slice(0, 500));
    }
    throw new Error(`expected JSON from ${path}, got ${ct || "unknown"}`);
  }
  if (!res.ok) {
    throw new Error(JSON.stringify(body));
  }
  if (body && typeof body === "object" && body !== null && "data" in body) {
    const envelope = body as { data?: unknown; error?: unknown };
    if (envelope.error) {
      throw new Error(JSON.stringify(envelope.error));
    }
    if (envelope.data !== undefined) {
      return envelope.data;
    }
  }
  return body;
}

export async function ontologyFetch(path: string, authHeader?: string, init?: RequestInit) {
  return fetchJSON(ontologyUrl, path, authHeader, init);
}

export async function platformFetch(path: string, authHeader?: string, init?: RequestInit) {
  return fetchJSON(platformUrl, path, authHeader, init);
}

export async function caseFetch(path: string, authHeader?: string, init?: RequestInit) {
  return fetchJSON(caseUrl, path, authHeader, init);
}
