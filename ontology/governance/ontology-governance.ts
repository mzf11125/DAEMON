import { readFileSync, existsSync } from "node:fs";
import { parse as parseYaml } from "yaml";
import { DaemonError, ErrorCodes } from "@daemon/platform-types";
import { configsPath } from "../paths.js";
import type { EntityModel } from "../models/entities/entity-model.js";
import type { ValidationResult } from "../models/entities/entity-model.js";
import type { RelationModel } from "../models/relations/relation-model.js";
import type { JunctionModel } from "../models/junctions/junction-model.js";
import {
  GovernancePolicyLoader,
  type SchemaChangeDescriptor,
  type SchemaChangeGateResult,
} from "./governance-policy-loader.js";

export interface GovernanceManifest {
  version: string;
  rules: {
    id: string;
    trigger: string;
    propagate: string[];
    entityTypes?: string[];
  }[];
}

export class OntologyGovernance {
  constructor(
    private readonly propagation: GovernanceManifest,
    private readonly policies: GovernancePolicyLoader,
  ) {}

  static load(): OntologyGovernance {
    const path = configsPath("governance", "propagation.yaml");
    let propagation: GovernanceManifest = { version: "0", rules: [] };
    if (existsSync(path)) {
      propagation = parseYaml(readFileSync(path, "utf8")) as GovernanceManifest;
    }
    return new OntologyGovernance(
      propagation,
      GovernancePolicyLoader.load(),
    );
  }

  propagationRules(): GovernanceManifest["rules"] {
    return [...this.propagation.rules];
  }

  validateEntityProperties(
    model: EntityModel | undefined,
    properties: Record<string, unknown>,
  ): ValidationResult {
    if (!model) {
      return { valid: true, issues: [] };
    }
    return model.validate(properties);
  }

  validateRelation(
    model: RelationModel | undefined,
    properties: Record<string, unknown>,
  ): ValidationResult {
    if (!model) {
      return { valid: true, issues: [] };
    }
    return model.validateLinkProperties(properties);
  }

  validateJunction(
    model: JunctionModel | undefined,
    properties: Record<string, unknown>,
  ): ValidationResult {
    if (!model) {
      return { valid: true, issues: [] };
    }
    return model.validateMembership(properties);
  }

  assertSchemaChange(change: SchemaChangeDescriptor): SchemaChangeGateResult {
    return this.policies.assertSchemaChange(change);
  }

  /** Throws when schema change requires approval and none was supplied. */
  enforceSchemaChange(change: SchemaChangeDescriptor): void {
    const gate = this.assertSchemaChange(change);
    if (!gate.allowed) {
      const obligationHint = gate.obligations?.length
        ? ` (${gate.obligations.join(", ")})`
        : "";
      throw new DaemonError(
        ErrorCodes.POLICY_DENIED,
        `${gate.reason ?? "schema change denied"}${obligationHint}`,
        403,
      );
    }
  }
}
