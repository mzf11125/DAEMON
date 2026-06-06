import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { entityId, ontologyId, ErrorCodes } from "@daemon/platform-types";
import { DaemonError } from "@daemon/platform-types";
import {
  assertActionTypeAllowed,
  resetActionTypeGuardCacheForTests,
} from "./action-type-guard.js";
import type { WriteCommand } from "./command-gateway.js";

function cmd(patch: Record<string, unknown>): WriteCommand {
  return {
    session: {
      sessionId: "s1" as never,
      subjectId: "u1",
      tenantId: "abc-antero",
      roles: ["logistics-editor"],
      issuedAt: new Date().toISOString(),
    },
    ontologyId: ontologyId("foundation"),
    entityId: entityId("rd-1"),
    patch,
  };
}

describe("assertActionTypeAllowed", () => {
  beforeEach(() => {
    resetActionTypeGuardCacheForTests();
    process.env.DAEMON_REPO_ROOT = join(import.meta.dirname, "..", "..");
  });

  it("requires actionType for RoutingDecision writes", () => {
    assert.throws(
      () =>
        assertActionTypeAllowed(
          cmd({ entityType: "RoutingDecision", decisionType: "route_accept" }),
        ),
      (err: unknown) => {
        assert.ok(err instanceof DaemonError);
        assert.equal((err as DaemonError).code, ErrorCodes.VALIDATION);
        return true;
      },
    );
  });

  it("allows tp-routing-decision with shipmentRef", () => {
    assert.doesNotThrow(() =>
      assertActionTypeAllowed(
        cmd({
          entityType: "RoutingDecision",
          actionType: "tp-routing-decision",
          decisionType: "route_accept",
          shipmentRef: "SHP-ABC-001",
        }),
      ),
    );
  });

  it("rejects unknown decisionType for tp-routing-decision", () => {
    assert.throws(
      () =>
        assertActionTypeAllowed(
          cmd({
            entityType: "RoutingDecision",
            actionType: "tp-routing-decision",
            decisionType: "invalid_type",
            shipmentRef: "SHP-ABC-001",
          }),
        ),
      (err: unknown) => {
        assert.ok(err instanceof DaemonError);
        return true;
      },
    );
  });

  it("allows tp-price-simulation without shipmentRef", () => {
    assert.doesNotThrow(() =>
      assertActionTypeAllowed(
        cmd({
          entityType: "RoutingDecision",
          actionType: "tp-price-simulation",
          decisionType: "shadow_quote",
        }),
      ),
    );
  });
});
