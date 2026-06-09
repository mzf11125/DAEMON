#!/usr/bin/env node
/**
 * Ensures gateway HTTP routes declare an auth surface: @Public, @Protected, or @WebhookAuth.
 * Routes with only @PolicyCheck still require credentials via AuthGuard.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const gatewaySrc = join(root, "api", "gateway", "src");

const routeDecorators = ["@Get(", "@Post(", "@Put(", "@Patch(", "@Delete("];
const authMarkers = ["@Public()", "@Protected()", "@WebhookAuth()"];
const policyMarker = "@PolicyCheck(";

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      walk(path, out);
    } else if (name.endsWith(".controller.ts")) {
      out.push(path);
    }
  }
  return out;
}

let failed = false;

for (const file of walk(gatewaySrc)) {
  const rel = file.slice(gatewaySrc.length + 1);
  const text = readFileSync(file, "utf8");
  const lines = text.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!routeDecorators.some((d) => line.includes(d))) {
      continue;
    }
    const window = lines.slice(Math.max(0, i - 4), Math.min(lines.length, i + 10)).join("\n");
    const hasAuth =
      authMarkers.some((m) => window.includes(m)) || window.includes(policyMarker);
    if (!hasAuth) {
      console.error(`${rel}:${i + 1}: route missing @Public/@Protected/@WebhookAuth/@PolicyCheck`);
      failed = true;
    }
  }
}

if (failed) process.exit(1);
console.log("route auth OK");
