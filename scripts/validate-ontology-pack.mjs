#!/usr/bin/env node
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";

const root = join(import.meta.dirname, "..");
const packDir = join(root, "configs", "ontology", "packs", "foundation");
const manifestPath = join(packDir, "pack.yaml");

if (!existsSync(manifestPath)) {
  console.error("foundation pack.yaml missing");
  process.exit(1);
}

const manifest = parseYaml(readFileSync(manifestPath, "utf8"));
const requiredEntities = [
  "Party",
  "Organization",
  "Case",
  "Event",
  "Link",
  "Document",
];
const requiredRelations = ["Link"];
const requiredJunctions = ["CaseEvent"];
let failed = false;

function fail(msg) {
  console.error(msg);
  failed = true;
}

if (manifest.ontologyId !== "foundation") {
  fail("pack ontologyId must be foundation");
}

for (const t of requiredEntities) {
  if (!manifest.entityTypes?.includes(t)) {
    fail(`pack.yaml missing entity type ${t}`);
  }
  const entityPath = join(packDir, "entities", `${t}.yaml`);
  if (!existsSync(entityPath)) {
    fail(`missing entity file ${t}.yaml`);
  }
}

const entityDir = join(packDir, "entities");
if (existsSync(entityDir)) {
  const onDisk = readdirSync(entityDir)
    .filter((f) => f.endsWith(".yaml"))
    .map((f) => f.replace(/\.yaml$/, ""));
  for (const name of onDisk) {
    if (!manifest.entityTypes?.includes(name)) {
      fail(`orphan entity file ${name}.yaml`);
    }
  }
}

for (const t of requiredRelations) {
  if (!manifest.relationTypes?.includes(t)) {
    fail(`pack.yaml missing relation type ${t}`);
  }
  const relPath = join(packDir, "relations", `${t}.yaml`);
  if (!existsSync(relPath)) {
    fail(`missing relation file ${t}.yaml`);
  } else {
    const rel = parseYaml(readFileSync(relPath, "utf8"));
    if (rel.relationType !== t) {
      fail(`relation ${t}.yaml relationType must be ${t}`);
    }
    if (!rel.fromEntityTypes?.length || !rel.toEntityTypes?.length) {
      fail(`relation ${t}.yaml must declare fromEntityTypes and toEntityTypes`);
    }
    for (const et of rel.fromEntityTypes) {
      if (!manifest.entityTypes?.includes(et)) {
        fail(`relation ${t} references unknown from entity ${et}`);
      }
    }
    for (const et of rel.toEntityTypes) {
      if (!manifest.entityTypes?.includes(et)) {
        fail(`relation ${t} references unknown to entity ${et}`);
      }
    }
  }
}

const relationsDir = join(packDir, "relations");
if (existsSync(relationsDir)) {
  for (const f of readdirSync(relationsDir).filter((x) => x.endsWith(".yaml"))) {
    const name = f.replace(/\.yaml$/, "");
    if (!manifest.relationTypes?.includes(name)) {
      fail(`orphan relation file ${f}`);
    }
  }
}

for (const t of requiredJunctions) {
  if (!manifest.junctionTypes?.includes(t)) {
    fail(`pack.yaml missing junction type ${t}`);
  }
  const jPath = join(packDir, "junctions", `${t}.yaml`);
  if (!existsSync(jPath)) {
    fail(`missing junction file ${t}.yaml`);
  } else {
    const j = parseYaml(readFileSync(jPath, "utf8"));
    if (j.junctionType !== t) {
      fail(`junction ${t}.yaml junctionType must be ${t}`);
    }
    const endpoints = j.endpoints ?? j.entities ?? [];
    if (endpoints.length !== 2) {
      fail(`junction ${t}.yaml must declare exactly two endpoints`);
    }
    for (const et of endpoints) {
      if (!manifest.entityTypes?.includes(et)) {
        fail(`junction ${t} references unknown endpoint entity ${et}`);
      }
    }
  }
}

const junctionsDir = join(packDir, "junctions");
if (existsSync(junctionsDir)) {
  for (const f of readdirSync(junctionsDir).filter((x) => x.endsWith(".yaml"))) {
    const name = f.replace(/\.yaml$/, "");
    if (!manifest.junctionTypes?.includes(name)) {
      fail(`orphan junction file ${f}`);
    }
  }
}

function validateExtensionPack(packId) {
  const extDir = join(root, "configs", "ontology", "packs", "extensions", packId);
  const manifestPath = join(extDir, "pack.yaml");
  if (!existsSync(manifestPath)) {
    fail(`${packId} extension pack.yaml missing`);
    return;
  }
  const manifest = parseYaml(readFileSync(manifestPath, "utf8"));
  if (manifest.ontologyId !== "foundation") {
    fail(`${packId} extension ontologyId must be foundation`);
  }
  for (const t of manifest.entityTypes ?? []) {
    if (requiredEntities.includes(t)) {
      fail(`${packId} extension must not redefine foundation entity ${t}`);
    }
    const entityPath = join(extDir, "entities", `${t}.yaml`);
    if (!existsSync(entityPath)) {
      fail(`${packId} missing entity file ${t}.yaml`);
    }
  }
  for (const t of manifest.junctionTypes ?? []) {
    const jPath = join(extDir, "junctions", `${t}.yaml`);
    if (!existsSync(jPath)) {
      fail(`${packId} missing junction file ${t}.yaml`);
    }
  }
}

for (const packId of ["aml-compliance", "logistics-commercial"]) {
  validateExtensionPack(packId);
}

if (failed) process.exit(1);
console.log("ontology pack validation OK");
