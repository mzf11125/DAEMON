import { Injectable } from "@nestjs/common";
import { DaemonRuntime } from "../platform/daemon-runtime";
import type { SchemaChangeDescriptor } from "@daemon/ontology/governance/governance-policy-loader.js";
import {
  diffPackChange,
  type ProposedPackOverrides,
} from "@daemon/ontology/packs/pack-diff.js";

export interface ValidatePackChangeRequest {
  packId: string;
  proposedPackDir?: string;
  proposedOverrides?: ProposedPackOverrides;
  approvals?: string[];
  /** Legacy descriptor fields */
  changeType?: SchemaChangeDescriptor["changeType"];
  breaking?: boolean;
}

@Injectable()
export class GovernanceService {
  constructor(private readonly runtime: DaemonRuntime) {}

  validatePackChange(body: ValidatePackChangeRequest | SchemaChangeDescriptor) {
    if ("proposedPackDir" in body || "proposedOverrides" in body) {
      return this.validateFromPackDiff(body as ValidatePackChangeRequest);
    }
    const legacy = body as SchemaChangeDescriptor;
    const gate = this.runtime.governance.assertSchemaChange(legacy);
    return {
      allowed: gate.allowed,
      reason: gate.reason,
      obligations: gate.obligations,
      auditAction: gate.auditAction,
      diff: gate.diff,
    };
  }

  private validateFromPackDiff(body: ValidatePackChangeRequest) {
    const diff = diffPackChange({
      packId: body.packId,
      proposedPackDir: body.proposedPackDir,
      proposedOverrides: body.proposedOverrides,
    });
    const gate = this.runtime.governance.assertSchemaChange({
      packId: body.packId,
      changeType: body.changeType,
      breaking: body.breaking,
      approvals: body.approvals,
      diff,
    });
    return {
      allowed: gate.allowed,
      reason: gate.reason,
      obligations: gate.obligations,
      auditAction: gate.auditAction,
      diff,
    };
  }
}
