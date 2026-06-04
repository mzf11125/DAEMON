#!/usr/bin/env node
/**
 * Ensures gateway services do not import globalRegistry directly (use DaemonRuntime).
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const gatewaySrc = join(root, "api", "gateway", "src");
const forbidden = [
  { path: "read/read.service.ts", pattern: "globalRegistry" },
  { path: "write/write.service.ts", pattern: "CommandGateway" },
  { path: "ingest/ingest.service.ts", pattern: "globalRegistry" },
];

let failed = false;
for (const rule of forbidden) {
  const file = join(gatewaySrc, rule.path);
  const text = readFileSync(file, "utf8");
  if (text.includes(rule.pattern)) {
    console.error(`${rule.path} must not reference ${rule.pattern} directly`);
    failed = true;
  }
}

const platformDir = join(gatewaySrc, "platform");
if (!statSync(platformDir).isDirectory()) {
  console.error("missing api/gateway/src/platform");
  failed = true;
}

if (failed) process.exit(1);
console.log("context boundaries OK");
