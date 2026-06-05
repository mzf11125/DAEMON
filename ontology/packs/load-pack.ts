import { readFileSync, readdirSync, existsSync } from "node:fs";
import { parse as parseYaml } from "yaml";
import { configsPath } from "../paths.js";
import { assertValidExtensionPackId } from "./extension-pack-id.js";
import {
  assertPackDirectoryUnderConfigs,
  assertSafeOntologyTypeName,
  assertSafePackYamlFilename,
  resolvePackManifestPath,
  resolvePackTypeYamlPath,
} from "./safe-pack-path.js";
import { resolveWithinDirectory } from "@daemon/context-ports";
import { EntityModel, type EntityModelDefinition } from "../models/entities/entity-model.js";
import {
  RelationModel,
  parseRelationDefinition,
} from "../models/relations/relation-model.js";
import {
  JunctionModel,
  parseJunctionDefinition,
} from "../models/junctions/junction-model.js";

export interface PackManifest {
  ontologyId: string;
  version: string;
  description?: string;
  entityTypes: string[];
  relationTypes?: string[];
  junctionTypes?: string[];
}

export interface LoadedOntologyPack {
  manifest: PackManifest;
  models: Map<string, EntityModel>;
  relations: Map<string, RelationModel>;
  junctions: Map<string, JunctionModel>;
}

export function foundationPackRoot(): string {
  return configsPath("ontology", "packs", "foundation");
}

export function extensionPackRoot(extensionId: string): string {
  assertValidExtensionPackId(extensionId);
  return resolveWithinDirectory(
    configsPath("ontology", "packs", "extensions"),
    extensionId,
  );
}

export function loadExtensionPack(extensionId: string): LoadedOntologyPack {
  const packDir = extensionPackRoot(extensionId);
  return loadPackFromDirectory(packDir);
}

function loadEntityModels(
  packDir: string,
  manifest: PackManifest,
): Map<string, EntityModel> {
  const entitiesDir = resolveWithinDirectory(packDir, "entities");
  const models = new Map<string, EntityModel>();
  for (const entityType of manifest.entityTypes) {
    assertSafeOntologyTypeName("entity", entityType);
    const entityPath = resolvePackTypeYamlPath(
      packDir,
      "entities",
      entityType,
      "entity",
    );
    if (!existsSync(entityPath)) {
      throw new Error(`entity definition missing: ${entityPath}`);
    }
    const raw = parseYaml(readFileSync(entityPath, "utf8")) as {
      entityType: string;
      fields: EntityModelDefinition["fields"];
    };
    const def: EntityModelDefinition = {
      ontologyId: manifest.ontologyId,
      fields: raw.fields ?? [],
    };
    models.set(entityType, new EntityModel(def));
  }
  const onDisk = readdirSync(entitiesDir)
    .filter((f) => f.endsWith(".yaml"))
    .map((f) => assertSafePackYamlFilename(f));
  for (const name of onDisk) {
    if (!manifest.entityTypes.includes(name)) {
      throw new Error(
        `entity ${name} on disk but not listed in pack.yaml entityTypes`,
      );
    }
  }
  return models;
}

function loadRelationModels(
  packDir: string,
  manifest: PackManifest,
): Map<string, RelationModel> {
  const relations = new Map<string, RelationModel>();
  const relationTypes = manifest.relationTypes ?? [];
  const relationsDir = resolveWithinDirectory(packDir, "relations");
  if (!existsSync(relationsDir) && relationTypes.length > 0) {
    throw new Error(`relations directory missing: ${relationsDir}`);
  }
  if (!existsSync(relationsDir)) {
    return relations;
  }
  for (const relationType of relationTypes) {
    assertSafeOntologyTypeName("relation", relationType);
    const relationPath = resolvePackTypeYamlPath(
      packDir,
      "relations",
      relationType,
      "relation",
    );
    if (!existsSync(relationPath)) {
      throw new Error(`relation definition missing: ${relationPath}`);
    }
    const raw = parseYaml(readFileSync(relationPath, "utf8")) as Parameters<
      typeof parseRelationDefinition
    >[0];
    relations.set(relationType, new RelationModel(parseRelationDefinition(raw)));
  }
  const onDisk = readdirSync(relationsDir)
    .filter((f) => f.endsWith(".yaml"))
    .map((f) => assertSafePackYamlFilename(f));
  for (const name of onDisk) {
    if (!relationTypes.includes(name)) {
      throw new Error(
        `relation ${name} on disk but not listed in pack.yaml relationTypes`,
      );
    }
  }
  return relations;
}

function loadJunctionModels(
  packDir: string,
  manifest: PackManifest,
): Map<string, JunctionModel> {
  const junctions = new Map<string, JunctionModel>();
  const junctionTypes = manifest.junctionTypes ?? [];
  const junctionsDir = resolveWithinDirectory(packDir, "junctions");
  if (!existsSync(junctionsDir) && junctionTypes.length > 0) {
    throw new Error(`junctions directory missing: ${junctionsDir}`);
  }
  if (!existsSync(junctionsDir)) {
    return junctions;
  }
  for (const junctionType of junctionTypes) {
    assertSafeOntologyTypeName("junction", junctionType);
    const junctionPath = resolvePackTypeYamlPath(
      packDir,
      "junctions",
      junctionType,
      "junction",
    );
    if (!existsSync(junctionPath)) {
      throw new Error(`junction definition missing: ${junctionPath}`);
    }
    const raw = parseYaml(readFileSync(junctionPath, "utf8")) as Parameters<
      typeof parseJunctionDefinition
    >[0];
    junctions.set(
      junctionType,
      new JunctionModel(parseJunctionDefinition(raw)),
    );
  }
  const onDisk = readdirSync(junctionsDir)
    .filter((f) => f.endsWith(".yaml"))
    .map((f) => assertSafePackYamlFilename(f));
  for (const name of onDisk) {
    if (!junctionTypes.includes(name)) {
      throw new Error(
        `junction ${name} on disk but not listed in pack.yaml junctionTypes`,
      );
    }
  }
  return junctions;
}

export function loadPackFromDirectory(packDir: string): LoadedOntologyPack {
  assertPackDirectoryUnderConfigs(packDir);
  const manifestPath = resolvePackManifestPath(packDir);
  if (!existsSync(manifestPath)) {
    throw new Error(`pack manifest missing: ${manifestPath}`);
  }
  const manifestRaw = parseYaml(readFileSync(manifestPath, "utf8")) as PackManifest;
  if (!manifestRaw.ontologyId || !manifestRaw.entityTypes?.length) {
    throw new Error(`invalid pack manifest: ${manifestPath}`);
  }

  return {
    manifest: manifestRaw,
    models: loadEntityModels(packDir, manifestRaw),
    relations: loadRelationModels(packDir, manifestRaw),
    junctions: loadJunctionModels(packDir, manifestRaw),
  };
}

export function loadFoundationPack(): LoadedOntologyPack {
  return loadPackFromDirectory(foundationPackRoot());
}
