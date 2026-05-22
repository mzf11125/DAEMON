/**
 * Compile ontology/v3 YAML (+ JSON functions/rules) → ontology/v2-compiled/ for Go runtime.
 */
import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import {
  loadOntologyFromDirectory,
  type ObjectTypeDefinition,
  type LinkTypeDefinition,
  type ActionTypeDefinition,
} from "@daemon/ontology-language";

const ROOT = path.resolve(import.meta.dirname, "..");
const V3 = path.join(ROOT, "ontology", "v3");
const V2_SRC = path.join(ROOT, "ontology", "v2");
const OUT = path.join(ROOT, "ontology", "v2-compiled");

const CARD_TO_V2: Record<string, string> = {
  ONE_TO_ONE: "one-to-one",
  ONE_TO_MANY: "one-to-many",
  MANY_TO_ONE: "many-to-one",
  MANY_TO_MANY: "many-to-many",
};

const YAML_TYPE_TO_V2: Record<string, string> = {
  string: "string",
  number: "number",
  boolean: "boolean",
  date: "date",
  timestamp: "datetime",
};

function rmrf(p: string) {
  if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
}

function ensureDir(p: string) {
  fs.mkdirSync(p, { recursive: true });
}

function writeJson(filePath: string, data: unknown) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function readV2Json<T>(subdir: string, name: string): T | null {
  const p = path.join(V2_SRC, subdir, `${name}.json`);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf8")) as T;
}

function objectToV2(def: ObjectTypeDefinition, apiName: string) {
  const v2 = readV2Json<Record<string, unknown>>("object-types", apiName);
  const properties = def.properties.map((p) => {
    const v2Prop = (v2?.properties as { id: string; type: string }[] | undefined)?.find(
      (x) => x.id === p.name,
    );
    return {
      id: p.name,
      type: v2Prop?.type ?? YAML_TYPE_TO_V2[p.type] ?? "string",
      ...(p.required ? { required: true } : {}),
    };
  });
  return {
    apiName: def.apiName,
    displayName: def.displayName,
    primaryKey: def.primaryKey,
    titleProperty: def.titleProperty,
    ...(v2?.backingDataset ? { backingDataset: v2.backingDataset } : {}),
    ...(v2?.implements ? { implements: v2.implements } : {}),
    properties,
  };
}

function linkToV2(def: LinkTypeDefinition) {
  return {
    apiName: def.apiName,
    sourceType: def.fromObjectType,
    targetType: def.toObjectType,
    cardinality: CARD_TO_V2[def.cardinality] ?? "many-to-one",
  };
}

function actionToV2(def: ActionTypeDefinition, apiName: string) {
  const v2 = readV2Json<Record<string, unknown>>("action-types", apiName);
  return {
    apiName: def.apiName,
    displayName: def.displayName,
    ...(v2?.requiredRoles ? { requiredRoles: v2.requiredRoles } : { requiredRoles: ["analyst"] }),
    parameters:
      (v2?.parameters as unknown[]) ??
      def.parameters.map((p) => ({
        id: p.name,
        type: YAML_TYPE_TO_V2[p.type] ?? p.type,
      })),
  };
}

function copyJsonDir(sub: string) {
  const src = path.join(V3, sub);
  const dest = path.join(OUT, sub);
  if (!fs.existsSync(src)) return;
  ensureDir(dest);
  for (const file of fs.readdirSync(src)) {
    if (!file.endsWith(".json")) continue;
    fs.copyFileSync(path.join(src, file), path.join(dest, file));
  }
}

async function main() {
  if (!fs.existsSync(V3)) {
    console.error("compile-schemas: missing ontology/v3 — run: pnpm ontology:port-v3");
    process.exit(1);
  }

  const manifestYaml = yaml.load(
    fs.readFileSync(path.join(V3, "manifest.yaml"), "utf8"),
  ) as Record<string, unknown>;

  const schema = await loadOntologyFromDirectory(V3);

  rmrf(OUT);
  ensureDir(path.join(OUT, "object-types"));
  ensureDir(path.join(OUT, "link-types"));
  ensureDir(path.join(OUT, "action-types"));

  for (const def of schema.objectTypes) {
    writeJson(
      path.join(OUT, "object-types", `${def.apiName}.json`),
      objectToV2(def, def.apiName),
    );
  }
  for (const def of schema.linkTypes) {
    writeJson(path.join(OUT, "link-types", `${def.apiName}.json`), linkToV2(def));
  }
  for (const def of schema.actionTypes) {
    writeJson(
      path.join(OUT, "action-types", `${def.apiName}.json`),
      actionToV2(def, def.apiName),
    );
  }

  copyJsonDir("functions");
  copyJsonDir("rules");
  copyJsonDir("fixtures");

  const manifestOut = {
    ...manifestYaml,
    objectTypes: schema.objectTypes.map((o) => o.apiName),
    linkTypes: schema.linkTypes.map((l) => l.apiName),
    actionTypes: schema.actionTypes.map((a) => a.apiName),
    functions: (manifestYaml.functions as string[]) ?? [],
  };
  writeJson(path.join(OUT, "manifest.json"), manifestOut);

  console.log(
    `compile-schemas: ${schema.objectTypes.length} objects, ${schema.linkTypes.length} links, ${schema.actionTypes.length} actions → ${OUT}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
