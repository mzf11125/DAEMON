#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { assertSafeScopeSegment } from "@daemon/context-ports";

function usage(): void {
  console.error(`Usage: daemon-agent push --file <path> --source <sourceId> [options]

Options:
  --gateway <url>     Gateway base URL (default DAEMON_GATEWAY_URL or http://127.0.0.1:3000)
  --api-key <key>     DAEMON_API_KEY or --api-key (required)
  --tenant <id>       X-Daemon-Tenant (default: default)
  --domain <id>       X-Daemon-Domain (default: foundation)
  --ontology <id>     ontologyId when sending raw JSONL rows
  --entity-type <t>   entityType for all rows
`);
  process.exit(1);
}

function parseArgs(argv: string[]) {
  const opts: Record<string, string> = {};
  const positional: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "push") {
      positional.push(a);
      continue;
    }
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        opts[key] = next;
        i++;
      } else {
        opts[key] = "true";
      }
    }
  }
  return { opts, positional };
}

function resolveIngestFile(pathArg: string): string {
  if (pathArg.includes("\0")) {
    throw new Error("invalid file path");
  }
  return resolve(pathArg);
}

async function main(): Promise<void> {
  const { opts, positional } = parseArgs(process.argv.slice(2));
  if (positional[0] !== "push" || !opts.file) usage();

  const gateway =
    opts.gateway ??
    process.env.DAEMON_GATEWAY_URL ??
    "http://127.0.0.1:3000";
  const apiKey = opts["api-key"] ?? process.env.DAEMON_API_KEY;
  if (!apiKey) {
    console.error("DAEMON_API_KEY or --api-key is required");
    process.exit(1);
  }
  const sourceId = opts.source ?? "agent";
  const tenant = opts.tenant ?? "default";
  const domain = opts.domain ?? "foundation";
  assertSafeScopeSegment("tenantId", tenant);
  assertSafeScopeSegment("domainId", domain);
  const ontologyId = opts.ontology;
  const entityType = opts["entity-type"];

  const filePath = resolveIngestFile(opts.file);
  const text = readFileSync(filePath, "utf8");
  const records: Record<string, unknown>[] = [];
  if (filePath.endsWith(".json")) {
    const parsed = JSON.parse(text) as unknown;
    if (Array.isArray(parsed)) {
      for (const row of parsed) {
        if (typeof row === "object" && row !== null) {
          records.push(row as Record<string, unknown>);
        }
      }
    }
  } else {
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      records.push(JSON.parse(trimmed) as Record<string, unknown>);
    }
  }

  const body = ontologyId
    ? {
        sourceId,
        records: records.map((row) => ({
          ontologyId,
          entityId: String(row.id ?? row.entityId ?? `${basename(filePath)}-${records.indexOf(row)}`),
          entityType: entityType ?? (row.entityType as string | undefined),
          properties: row,
        })),
      }
    : { sourceId, records };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
    "X-Daemon-Tenant": tenant,
    "X-Daemon-Domain": domain,
  };

  const res = await fetch(`${gateway.replace(/\/$/, "")}/v1/ingest/records`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    console.error(`ingest failed (HTTP ${res.status})`);
    process.exit(1);
  }
  const json = await res.json().catch(() => ({}));
  console.log(JSON.stringify(json, null, 2));
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : "unexpected error";
  console.error(message.replace(/[\r\n]/g, " "));
  process.exit(1);
});
