import { DaemonError, ErrorCodes } from "@daemon/platform-types";

export type Cardinality = "one" | "many";

export interface RelationDefinition {
  relationType: string;
  fromEntityTypes: string[];
  toEntityTypes: string[];
  cardinality?: Cardinality;
}

export class RelationModel {
  constructor(private readonly def: RelationDefinition) {}

  get relationType(): string {
    return this.def.relationType;
  }

  get fromEntityTypes(): string[] {
    return [...this.def.fromEntityTypes];
  }

  get toEntityTypes(): string[] {
    return [...this.def.toEntityTypes];
  }

  validateLinkProperties(props: Record<string, unknown>): {
    valid: boolean;
    issues: { field: string; message: string }[];
  } {
    const issues: { field: string; message: string }[] = [];
    if (typeof props.linkType !== "string" || !String(props.linkType).trim()) {
      issues.push({ field: "linkType", message: "linkType required" });
    }
    const fromType = props.fromEntityType;
    const toType = props.toEntityType;
    if (typeof fromType === "string" && !this.def.fromEntityTypes.includes(fromType)) {
      issues.push({
        field: "fromEntityType",
        message: `from entity type must be one of ${this.def.fromEntityTypes.join(", ")}`,
      });
    }
    if (typeof toType === "string" && !this.def.toEntityTypes.includes(toType)) {
      issues.push({
        field: "toEntityType",
        message: `to entity type must be one of ${this.def.toEntityTypes.join(", ")}`,
      });
    }
    for (const field of ["fromEntityId", "toEntityId"] as const) {
      if (typeof props[field] !== "string" || !String(props[field]).trim()) {
        issues.push({ field, message: "required string" });
      }
    }
    return { valid: issues.length === 0, issues };
  }
}

export function parseRelationDefinition(raw: {
  relationType: string;
  from?: string[];
  to?: string[];
  fromEntityTypes?: string[];
  toEntityTypes?: string[];
  cardinality?: Cardinality;
}): RelationDefinition {
  const relationType = raw.relationType?.trim();
  if (!relationType) {
    throw new DaemonError(ErrorCodes.VALIDATION, "relationType required", 400);
  }
  const fromEntityTypes = raw.fromEntityTypes ?? raw.from ?? [];
  const toEntityTypes = raw.toEntityTypes ?? raw.to ?? [];
  if (!fromEntityTypes.length || !toEntityTypes.length) {
    throw new DaemonError(
      ErrorCodes.VALIDATION,
      `relation ${relationType}: from/to entity types required`,
      400,
    );
  }
  return {
    relationType,
    fromEntityTypes,
    toEntityTypes,
    cardinality: raw.cardinality,
  };
}
