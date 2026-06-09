import { readFileSync, existsSync } from "node:fs";
import { parse as parseYaml } from "yaml";
import { configsPath } from "../paths.js";
import type { PackDiffSummary } from "../packs/pack-diff.js";

export type SchemaChangeType =
  | "field_add"
  | "field_remove"
  | "type_rename"
  | "relation_add"
  | "relation_remove"
  | "junction_add"
  | "junction_remove";

export interface SchemaChangeDescriptor {
  packId: string;
  changeType?: SchemaChangeType;
  breaking?: boolean;
  semverBump?: "major" | "minor" | "patch";
  approvals?: string[];
  diff?: PackDiffSummary;
}

export interface SchemaChangeGateResult {
  allowed: boolean;
  reason?: string;
  obligations?: string[];
  auditAction: "ontology.schema.change" | "ontology.schema.change.pending";
  diff?: PackDiffSummary;
}

export interface GovernancePoliciesManifest {
  version?: string;
  approvalGates?: { resource: string; approvers: number }[];
  escalation?: { trigger: string; channel: string; severity: string }[];
  audit?: { enabled?: boolean; backend?: string; retentionDays?: number };
  retention?: { resource: string; days: number }[];
}

export class GovernancePolicyLoader {
  constructor(private readonly manifest: GovernancePoliciesManifest) {}

  static load(): GovernancePolicyLoader {
    const path = configsPath("policies", "governance-policies.yaml");
    if (!existsSync(path)) {
      return new GovernancePolicyLoader({});
    }
    const raw = parseYaml(
      readFileSync(path, "utf8"),
    ) as GovernancePoliciesManifest;
    return new GovernancePolicyLoader(raw);
  }

  schemaChangeApprovers(): number {
    const gate = this.manifest.approvalGates?.find(
      (g) => g.resource === "schema-change",
    );
    return gate?.approvers ?? 2;
  }

  externalSystemApprovers(): number {
    const gate = this.manifest.approvalGates?.find(
      (g) => g.resource === "external-system",
    );
    return gate?.approvers ?? 1;
  }

  resolveObligations(context: {
    kind: "schema-change";
    diff?: PackDiffSummary;
    breaking: boolean;
  }): string[] {
    const obligations: string[] = [];
    if (context.kind === "schema-change" && context.breaking) {
      obligations.push("collect-approvals");
      const required = this.schemaChangeApprovers();
      obligations.push(`approvals-required:${required}`);
    }
    if (context.diff?.semverBump === "major") {
      obligations.push("semver-major");
    }
    if (
      context.diff?.changes.some((c) =>
        ["relation_add", "relation_remove"].includes(c.changeType),
      )
    ) {
      obligations.push("relation-change");
    }
    return obligations;
  }

  assertSchemaChange(change: SchemaChangeDescriptor): SchemaChangeGateResult {
    const diff = change.diff;
    const breaking =
      change.breaking ?? diff?.breaking ?? inferBreakingFromChangeType(change.changeType);
    const obligations = this.resolveObligations({
      kind: "schema-change",
      diff,
      breaking,
    });

    if (!breaking) {
      return {
        allowed: true,
        auditAction: "ontology.schema.change",
        diff,
        obligations: obligations.length > 0 ? obligations : undefined,
      };
    }
    const required = this.schemaChangeApprovers();
    const approvals = change.approvals ?? [];
    if (approvals.length >= required) {
      return {
        allowed: true,
        auditAction: "ontology.schema.change",
        diff,
        obligations,
      };
    }
    return {
      allowed: false,
      reason: `breaking schema change requires ${required} approval(s); got ${approvals.length}`,
      obligations,
      auditAction: "ontology.schema.change.pending",
      diff,
    };
  }
}

function inferBreakingFromChangeType(
  changeType: SchemaChangeType | undefined,
): boolean {
  if (!changeType) return false;
  return ["field_remove", "type_rename", "relation_remove", "junction_remove"].includes(
    changeType,
  );
}
