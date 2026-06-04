import { OntologyGovernance } from "@daemon/ontology/governance/ontology-governance.js";
import {
  diffPackChange,
  type ProposedPackOverrides,
} from "@daemon/ontology/packs/pack-diff.js";

export interface SchemaChangeInput {
  packId: string;
  changeType?: "field_add" | "field_remove" | "type_rename";
  breaking?: boolean;
  approvals?: string[];
  proposedPackDir?: string;
  proposedOverrides?: ProposedPackOverrides;
}

/**
 * CLI entry: evaluate a proposed pack/schema change against governance-policies.yaml.
 */
export function validateSchemaChange(change: SchemaChangeInput): void {
  const governance = OntologyGovernance.load();
  const diff =
    change.proposedPackDir || change.proposedOverrides
      ? diffPackChange({
          packId: change.packId,
          proposedPackDir: change.proposedPackDir,
          proposedOverrides: change.proposedOverrides,
        })
      : undefined;
  const gate = governance.assertSchemaChange({
    packId: change.packId,
    changeType: change.changeType,
    breaking: change.breaking,
    approvals: change.approvals,
    diff,
  });
  if (!gate.allowed) {
    const obligations = gate.obligations?.join(", ") ?? "collect-approvals";
    console.error(`Schema change blocked: requires approval — ${obligations}`);
    if (gate.diff) {
      console.error(
        `Diff: breaking=${String(gate.diff.breaking)} semver=${gate.diff.semverBump} changes=${gate.diff.changes.length}`,
      );
    }
    process.exit(1);
  }
  const label =
    change.changeType ??
    (gate.diff ? `diff(${gate.diff.changes.length} changes)` : "schema-change");
  const breaking =
    change.breaking ?? gate.diff?.breaking ?? false;
  console.log(`Schema change allowed (${label}, breaking=${String(breaking)})`);
}
