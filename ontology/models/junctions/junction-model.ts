import { DaemonError, ErrorCodes } from "@daemon/platform-types";

export interface JunctionDefinition {
  junctionType: string;
  endpoints: [string, string];
}

export class JunctionModel {
  constructor(private readonly def: JunctionDefinition) {}

  get junctionType(): string {
    return this.def.junctionType;
  }

  get endpoints(): [string, string] {
    return [...this.def.endpoints] as [string, string];
  }

  validateMembership(props: Record<string, unknown>): {
    valid: boolean;
    issues: { field: string; message: string }[];
  } {
    const issues: { field: string; message: string }[] = [];
    const jt = props.junctionType;
    if (typeof jt !== "string" || jt !== this.def.junctionType) {
      issues.push({
        field: "junctionType",
        message: `expected junctionType ${this.def.junctionType}`,
      });
    }
    const leftType = props.leftEntityType;
    const rightType = props.rightEntityType;
    const [a, b] = this.def.endpoints;
    if (typeof leftType === "string" && leftType !== a && leftType !== b) {
      issues.push({
        field: "leftEntityType",
        message: `must be ${a} or ${b}`,
      });
    }
    if (typeof rightType === "string" && rightType !== a && rightType !== b) {
      issues.push({
        field: "rightEntityType",
        message: `must be ${a} or ${b}`,
      });
    }
    for (const field of ["leftEntityId", "rightEntityId"] as const) {
      if (typeof props[field] !== "string" || !String(props[field]).trim()) {
        issues.push({ field, message: "required string" });
      }
    }
    return { valid: issues.length === 0, issues };
  }
}

export function parseJunctionDefinition(raw: {
  junctionType: string;
  endpoints?: string[];
  entities?: string[];
}): JunctionDefinition {
  const junctionType = raw.junctionType?.trim();
  if (!junctionType) {
    throw new DaemonError(ErrorCodes.VALIDATION, "junctionType required", 400);
  }
  const endpoints = (raw.endpoints ?? raw.entities ?? []) as string[];
  if (endpoints.length !== 2) {
    throw new DaemonError(
      ErrorCodes.VALIDATION,
      `junction ${junctionType}: exactly two endpoint entity types required`,
      400,
    );
  }
  return { junctionType, endpoints: [endpoints[0], endpoints[1]] };
}
