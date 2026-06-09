import { resolve, sep } from "node:path";
import { resolveWithinDirectory } from "@daemon/context-ports";
import { configsPath } from "../paths.js";

/** Ontology entity/relation/junction type names map to single YAML files. */
export const ONTOLOGY_TYPE_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9]*$/;

export function assertSafeOntologyTypeName(
  kind: "entity" | "relation" | "junction",
  name: string,
): void {
  if (!ONTOLOGY_TYPE_NAME_PATTERN.test(name)) {
    throw new Error(`invalid ${kind} type name: ${name}`);
  }
}

export function assertPackDirectoryUnderConfigs(packDir: string): void {
  const packsRoot = resolve(configsPath("ontology", "packs"));
  const resolved = resolve(packDir);
  if (resolved !== packsRoot && !resolved.startsWith(packsRoot + sep)) {
    throw new Error(
      `pack directory must be under configs/ontology/packs: ${packDir}`,
    );
  }
}

export function resolvePackManifestPath(packDir: string): string {
  assertPackDirectoryUnderConfigs(packDir);
  return resolveWithinDirectory(packDir, "pack.yaml");
}

export function resolvePackTypeYamlPath(
  packDir: string,
  subdir: "entities" | "relations" | "junctions",
  typeName: string,
  kind: "entity" | "relation" | "junction",
): string {
  assertPackDirectoryUnderConfigs(packDir);
  assertSafeOntologyTypeName(kind, typeName);
  return resolveWithinDirectory(packDir, subdir, `${typeName}.yaml`);
}

export function assertSafePackYamlFilename(filename: string): string {
  if (
    !filename.endsWith(".yaml") ||
    filename.includes(sep) ||
    filename.includes("..")
  ) {
    throw new Error(`invalid pack yaml filename: ${filename}`);
  }
  const typeName = filename.replace(/\.yaml$/, "");
  if (!ONTOLOGY_TYPE_NAME_PATTERN.test(typeName)) {
    throw new Error(`invalid pack yaml filename: ${filename}`);
  }
  return typeName;
}
