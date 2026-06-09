#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";

const path = join(import.meta.dirname, "..", "configs", "tenancy.yaml");
if (!existsSync(path)) {
  console.error("configs/tenancy.yaml missing");
  process.exit(1);
}

const raw = parseYaml(readFileSync(path, "utf8"));
const ids = new Set();
let failed = false;
for (const t of raw.tenants ?? []) {
  if (ids.has(t.id)) {
    console.error(`duplicate tenant id ${t.id}`);
    failed = true;
  }
  ids.add(t.id);
  if (!t.enabledDomains?.length) {
    console.error(`tenant ${t.id} missing enabledDomains`);
    failed = true;
  }
}

for (const required of ["default", "inst-alpha", "ent-beta"]) {
  if (!ids.has(required)) {
    console.error(`missing tenant ${required}`);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log("tenancy config OK");
