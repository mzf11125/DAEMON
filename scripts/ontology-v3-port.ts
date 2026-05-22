/**
 * One-shot port: ontology/v2 JSON → flat ontology/v3/*.yaml (upstream ontology-language shape).
 * Re-run only when v2 JSON changes; committed v3 is the authoring source after R0.
 */
import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

const ROOT = path.resolve(import.meta.dirname, "..");
const V2 = path.join(ROOT, "ontology", "v2");
const V3 = path.join(ROOT, "ontology", "v3");

const CARD_TO_UPSTREAM: Record<string, string> = {
  "one-to-one": "ONE_TO_ONE",
  "many-to-one": "MANY_TO_ONE",
  "one-to-many": "ONE_TO_MANY",
  "many-to-many": "MANY_TO_MANY",
};

const V2_TYPE_TO_YAML: Record<string, string> = {
  string: "string",
  number: "number",
  boolean: "boolean",
  date: "date",
  datetime: "timestamp",
};

const ACTION_TARGET: Record<string, string> = {
  RecordObservation: "Observation",
  OpenCase: "Case",
  AssignCase: "Case",
  EscalateSignal: "Signal",
  ExecuteWorkOrder: "WorkOrder",
  RecordDecision: "Decision",
  CloseCase: "Case",
};

function ensureDir(p: string) {
  fs.mkdirSync(p, { recursive: true });
}

function writeYaml(filePath: string, doc: unknown) {
  fs.writeFileSync(filePath, yaml.dump(doc, { lineWidth: 120, noRefs: true }), "utf8");
}

function portManifest() {
  const m = JSON.parse(fs.readFileSync(path.join(V2, "manifest.json"), "utf8"));
  const { backingDatasets, ...rest } = m;
  const doc = { ...rest, ...(backingDatasets ? { backingDatasets } : {}) };
  writeYaml(path.join(V3, "manifest.yaml"), doc);
}

function portObjectTypes() {
  const dir = path.join(V2, "object-types");
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith(".json")) continue;
    const raw = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
    const properties = (raw.properties ?? []).map(
      (p: { id: string; type: string; required?: boolean }) => ({
        name: p.id,
        type: V2_TYPE_TO_YAML[p.type] ?? "string",
        required: Boolean(p.required),
      }),
    );
    const doc = {
      objectType: {
        apiName: raw.apiName,
        displayName: raw.displayName ?? raw.apiName,
        primaryKey: raw.primaryKey,
        titleProperty: raw.titleProperty,
        properties,
        ...(raw.description ? { description: raw.description } : {}),
      },
    };
    writeYaml(path.join(V3, `${raw.apiName}.object-type.yaml`), doc);
  }
}

function portLinkTypes() {
  const dir = path.join(V2, "link-types");
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith(".json")) continue;
    const raw = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
    const card = CARD_TO_UPSTREAM[raw.cardinality] ?? "MANY_TO_ONE";
    const doc = {
      linkType: {
        apiName: raw.apiName,
        displayName: raw.apiName.replace(/([A-Z])/g, " $1").trim(),
        fromObjectType: raw.sourceType,
        toObjectType: raw.targetType,
        cardinality: card,
      },
    };
    writeYaml(path.join(V3, `${raw.apiName}.link-type.yaml`), doc);
  }
}

function portActionTypes() {
  const dir = path.join(V2, "action-types");
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith(".json")) continue;
    const raw = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
    const target = ACTION_TARGET[raw.apiName] ?? "Case";
    const parameters = (raw.parameters ?? []).map(
      (p: { id: string; type: string }) => ({
        name: p.id,
        type: p.type === "string[]" ? "string" : (V2_TYPE_TO_YAML[p.type] ?? "string"),
        required: false,
      }),
    );
    const doc = {
      actionType: {
        apiName: raw.apiName,
        displayName: raw.displayName ?? raw.apiName,
        targetObjectType: target,
        parameters,
        requiresApproval: true,
      },
    };
    writeYaml(path.join(V3, `${raw.apiName}.action-type.yaml`), doc);
  }
}

function copyJsonTree(sub: string) {
  const src = path.join(V2, sub);
  const dest = path.join(V3, sub);
  if (!fs.existsSync(src)) return;
  ensureDir(dest);
  for (const file of fs.readdirSync(src)) {
    if (!file.endsWith(".json")) continue;
    fs.copyFileSync(path.join(src, file), path.join(dest, file));
  }
}

function main() {
  ensureDir(V3);
  portManifest();
  portObjectTypes();
  portLinkTypes();
  portActionTypes();
  copyJsonTree("functions");
  copyJsonTree("rules");
  copyJsonTree("fixtures");
  console.log("ontology-v3-port: wrote", V3);
}

main();
