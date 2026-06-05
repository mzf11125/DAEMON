import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import { DaemonError, ErrorCodes } from "@daemon/platform-types";
import type { WriteCommand } from "./command-gateway.js";

interface ActionTypeSpec {
  readonly id: string;
  readonly entityType: string;
  readonly requiredPatchKeys?: readonly string[];
  readonly logicRuleId?: string;
  readonly logicPack?: string;
}

interface TpRoutingRule {
  readonly id: string;
  readonly allowedDecisionTypes?: readonly string[];
  readonly requireShipmentRef?: boolean;
}

let cachedActionTypes: ActionTypeSpec[] | null = null;
let cachedTpRules: TpRoutingRule[] | null = null;

function repoRoot(): string {
  return process.env.DAEMON_REPO_ROOT ?? process.cwd();
}

function getActionTypes(): ActionTypeSpec[] {
  if (cachedActionTypes) return cachedActionTypes;
  const path = join(repoRoot(), "configs/governance/action-types.yaml");
  if (!existsSync(path)) {
    cachedActionTypes = [];
    return cachedActionTypes;
  }
  const doc = parseYaml(readFileSync(path, "utf8")) as {
    actionTypes?: ActionTypeSpec[];
  };
  cachedActionTypes = doc.actionTypes ?? [];
  return cachedActionTypes;
}

function getTpRules(): TpRoutingRule[] {
  if (cachedTpRules) return cachedTpRules;
  const path = join(
    repoRoot(),
    "configs/ontology/packs/extensions/logistics-commercial/logic/tp-routing-rules.yaml",
  );
  if (!existsSync(path)) {
    cachedTpRules = [];
    return cachedTpRules;
  }
  const doc = parseYaml(readFileSync(path, "utf8")) as {
    rules?: TpRoutingRule[];
  };
  cachedTpRules = doc.rules ?? [];
  return cachedTpRules;
}

function resolveEntityType(cmd: WriteCommand): string | undefined {
  const fromPatch = cmd.patch.entityType;
  if (typeof fromPatch === "string" && fromPatch.trim()) {
    return fromPatch.trim();
  }
  return undefined;
}

function assertTpRule(ruleId: string, patch: Record<string, unknown>): void {
  const rule = getTpRules().find((r) => r.id === ruleId);
  if (!rule) return;
  const decisionType = patch.decisionType;
  if (typeof decisionType !== "string" || !decisionType.trim()) {
    throw new DaemonError(
      ErrorCodes.VALIDATION,
      `action type requires decisionType`,
      400,
    );
  }
  if (
    rule.allowedDecisionTypes?.length &&
    !rule.allowedDecisionTypes.includes(decisionType)
  ) {
    throw new DaemonError(
      ErrorCodes.VALIDATION,
      `decisionType ${decisionType} not allowed for rule ${ruleId}`,
      400,
    );
  }
  if (rule.requireShipmentRef) {
    const ref = patch.shipmentRef;
    if (typeof ref !== "string" || !ref.trim()) {
      throw new DaemonError(
        ErrorCodes.VALIDATION,
        `rule ${ruleId} requires shipmentRef`,
        400,
      );
    }
  }
}

/** Validates declarative action types and pack logic rules on governed writes. */
export function assertActionTypeAllowed(cmd: WriteCommand): void {
  const actionTypeRaw = cmd.patch.actionType;
  const entityType = resolveEntityType(cmd);
  const specs = getActionTypes();

  if (typeof actionTypeRaw !== "string" || !actionTypeRaw.trim()) {
    if (entityType === "RoutingDecision") {
      throw new DaemonError(
        ErrorCodes.VALIDATION,
        "RoutingDecision writes require patch.actionType",
        400,
      );
    }
    return;
  }

  const actionType = actionTypeRaw.trim();
  const spec = specs.find((s) => s.id === actionType);
  if (!spec) {
    throw new DaemonError(
      ErrorCodes.VALIDATION,
      `unknown actionType: ${actionType}`,
      400,
    );
  }
  if (entityType && entityType !== spec.entityType) {
    throw new DaemonError(
      ErrorCodes.VALIDATION,
      `actionType ${actionType} does not apply to entityType ${entityType}`,
      400,
    );
  }
  for (const key of spec.requiredPatchKeys ?? []) {
    if (!(key in cmd.patch)) {
      throw new DaemonError(
        ErrorCodes.VALIDATION,
        `actionType ${actionType} requires patch.${key}`,
        400,
      );
    }
  }
  if (spec.logicRuleId) {
    assertTpRule(spec.logicRuleId, cmd.patch);
  }
}

/** Test-only reset of cached YAML. */
export function resetActionTypeGuardCacheForTests(): void {
  cachedActionTypes = null;
  cachedTpRules = null;
}
