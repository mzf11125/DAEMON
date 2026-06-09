import type { LoadedOntologyPack } from "./load-pack.js";

/**
 * Merges foundation with an extension pack. Extension may only add entity/relation/junction
 * types; duplicate keys are rejected to avoid silent overrides.
 */
export function mergeOntologyPacks(
  base: LoadedOntologyPack,
  extension: LoadedOntologyPack,
): LoadedOntologyPack {
  if (base.manifest.ontologyId !== extension.manifest.ontologyId) {
    throw new Error(
      `extension ontologyId ${extension.manifest.ontologyId} must match base ${base.manifest.ontologyId}`,
    );
  }

  const models = new Map(base.models);
  for (const [name, model] of extension.models) {
    if (models.has(name)) {
      throw new Error(`extension cannot override foundation entity type: ${name}`);
    }
    models.set(name, model);
  }

  const relations = new Map(base.relations);
  for (const [name, model] of extension.relations) {
    if (relations.has(name)) {
      throw new Error(`extension cannot override foundation relation: ${name}`);
    }
    relations.set(name, model);
  }

  const junctions = new Map(base.junctions);
  for (const [name, model] of extension.junctions) {
    if (junctions.has(name)) {
      throw new Error(`extension cannot override foundation junction: ${name}`);
    }
    junctions.set(name, model);
  }

  const entityTypes = [
    ...new Set([
      ...base.manifest.entityTypes,
      ...extension.manifest.entityTypes,
    ]),
  ];
  const relationTypes = [
    ...new Set([
      ...(base.manifest.relationTypes ?? []),
      ...(extension.manifest.relationTypes ?? []),
    ]),
  ];
  const junctionTypes = [
    ...new Set([
      ...(base.manifest.junctionTypes ?? []),
      ...(extension.manifest.junctionTypes ?? []),
    ]),
  ];

  return {
    manifest: {
      ontologyId: base.manifest.ontologyId,
      version: extension.manifest.version,
      description: extension.manifest.description ?? base.manifest.description,
      entityTypes,
      relationTypes: relationTypes.length ? relationTypes : undefined,
      junctionTypes: junctionTypes.length ? junctionTypes : undefined,
    },
    models,
    relations,
    junctions,
  };
}
