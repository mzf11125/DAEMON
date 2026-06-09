import type { EntityRecord } from "@daemon/context-ports";

export type ReadParityReason =
  | "match"
  | "projection_missing"
  | "registry_missing"
  | "version_mismatch"
  | "entity_type_mismatch"
  | "properties_mismatch";

export interface ReadParityReport {
  status: "match" | "mismatch";
  reason: ReadParityReason;
  tenantId: string;
  domainId: string;
  ontologyId: string;
  entityId: string;
  details?: string;
}

/** Stable JSON for property comparison (sorted keys). */
export function stablePropertiesJson(properties: Record<string, unknown>): string {
  return JSON.stringify(properties, Object.keys(properties).sort());
}

/**
 * Compares registry (store) and projection snapshots for the same entity key.
 */
export function compareReadParity(
  registry: EntityRecord | undefined,
  projection: EntityRecord | undefined,
  key: {
    tenantId: string;
    domainId: string;
    ontologyId: string;
    entityId: string;
  },
): ReadParityReport {
  const base = {
    tenantId: key.tenantId,
    domainId: key.domainId,
    ontologyId: key.ontologyId,
    entityId: key.entityId,
  };

  if (!registry && !projection) {
    return {
      ...base,
      status: "mismatch",
      reason: "registry_missing",
      details: "both paths empty",
    };
  }
  if (!registry) {
    return {
      ...base,
      status: "mismatch",
      reason: "registry_missing",
      details: "projection row without registry record",
    };
  }
  if (!projection) {
    return {
      ...base,
      status: "mismatch",
      reason: "projection_missing",
      details: "registry record without projection row",
    };
  }

  if (registry.version !== projection.version) {
    return {
      ...base,
      status: "mismatch",
      reason: "version_mismatch",
      details: `registry=${registry.version} projection=${projection.version}`,
    };
  }
  if (registry.entityType !== projection.entityType) {
    return {
      ...base,
      status: "mismatch",
      reason: "entity_type_mismatch",
      details: `registry=${registry.entityType} projection=${projection.entityType}`,
    };
  }
  const regProps = stablePropertiesJson(registry.properties);
  const projProps = stablePropertiesJson(projection.properties);
  if (regProps !== projProps) {
    return {
      ...base,
      status: "mismatch",
      reason: "properties_mismatch",
      details: "properties differ",
    };
  }

  return { ...base, status: "match", reason: "match" };
}
