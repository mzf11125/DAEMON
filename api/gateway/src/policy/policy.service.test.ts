import { test } from "node:test";
import assert from "node:assert/strict";
import { PolicyService, type PolicyCheckInput } from "./policy.service";

function withEnv(
  overrides: Record<string, string | undefined>,
  fn: () => Promise<void>,
): Promise<void> {
  const saved: Record<string, string | undefined> = {};
  for (const key of Object.keys(overrides)) {
    saved[key] = process.env[key];
    const value = overrides[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  return fn().finally(() => {
    for (const key of Object.keys(saved)) {
      const value = saved[key];
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });
}

function adminCheck(
  action: string,
  resource: string,
  tenantId = "inst-alpha",
): PolicyCheckInput {
  return {
    action,
    resource,
    principal: {
      subjectId: "admin-user",
      tenantId,
      roles: ["admin"],
    },
    resourceScope: { tenantId, domainId: "foundation" },
  };
}

test("admin allows read on entity via local authorizer", async () => {
  await withEnv(
    { NODE_ENV: "test", DAEMON_POLICY_MODE: undefined, POLICY_ENGINE_URL: undefined },
    async () => {
      const decision = await new PolicyService().check(adminCheck("read", "entity"));
      assert.equal(decision.effect, "allow");
    },
  );
});

test("viewer denies write on entity via RBAC", async () => {
  await withEnv(
    { NODE_ENV: "test", DAEMON_POLICY_MODE: undefined, POLICY_ENGINE_URL: undefined },
    async () => {
      const decision = await new PolicyService().check({
        action: "write",
        resource: "entity",
        principal: {
          subjectId: "viewer-1",
          tenantId: "inst-alpha",
          roles: ["viewer"],
        },
        resourceScope: { tenantId: "inst-alpha", domainId: "foundation" },
      });
      assert.equal(decision.effect, "deny");
    },
  );
});

test("cross-tenant ABAC deny for viewer even when action allowed", async () => {
  await withEnv(
    { NODE_ENV: "test", DAEMON_POLICY_MODE: undefined, POLICY_ENGINE_URL: undefined },
    async () => {
      const decision = await new PolicyService().check({
        action: "read",
        resource: "entity",
        principal: {
          subjectId: "viewer-1",
          tenantId: "inst-alpha",
          roles: ["viewer"],
        },
        resourceScope: { tenantId: "ent-beta", domainId: "foundation" },
      });
      assert.equal(decision.effect, "deny");
      assert.equal(decision.reason, "cross-tenant-denied");
    },
  );
});

test("DAEMON_POLICY_DEV_ALLOW restores legacy dev allow list", async () => {
  await withEnv(
    {
      NODE_ENV: "test",
      DAEMON_POLICY_MODE: undefined,
      POLICY_ENGINE_URL: undefined,
      DAEMON_POLICY_DEV_ALLOW: "1",
    },
    async () => {
      const decision = await new PolicyService().check("read", "entity");
      assert.equal(decision.effect, "allow");
      assert.equal(decision.reason, "dev-legacy-allow");
    },
  );
});

test("denies an unknown action/resource pair for anonymous principal", async () => {
  await withEnv(
    { NODE_ENV: "test", DAEMON_POLICY_MODE: undefined, POLICY_ENGINE_URL: undefined },
    async () => {
      const decision = await new PolicyService().check("delete", "secret");
      assert.equal(decision.effect, "deny");
    },
  );
});

test("falls back to local authorizer when policy engine is unreachable in non-prod", async () => {
  await withEnv(
    {
      NODE_ENV: "test",
      DAEMON_POLICY_MODE: undefined,
      POLICY_ENGINE_URL: "http://127.0.0.1:1",
    },
    async () => {
      const decision = await new PolicyService().check(adminCheck("write", "entity"));
      assert.equal(decision.effect, "allow");
    },
  );
});

test("production denies sensitive checks when POLICY_ENGINE_URL is unset", async () => {
  await withEnv(
    {
      NODE_ENV: "production",
      DAEMON_POLICY_MODE: undefined,
      POLICY_ENGINE_URL: undefined,
      DAEMON_POLICY_SKIP_UPSTREAM: undefined,
    },
    async () => {
      const read = await new PolicyService().check(adminCheck("read", "entity"));
      assert.equal(read.effect, "deny");
      assert.equal(read.reason, "policy-engine-unconfigured");

      const write = await new PolicyService().check(adminCheck("write", "entity"));
      assert.equal(write.effect, "deny");
      assert.equal(write.reason, "policy-engine-unconfigured");
    },
  );
});

test("production denies write when upstream is unreachable", async () => {
  await withEnv(
    {
      NODE_ENV: "production",
      POLICY_ENGINE_URL: "http://127.0.0.1:1",
      DAEMON_POLICY_SKIP_UPSTREAM: undefined,
    },
    async () => {
      const write = await new PolicyService().check(adminCheck("write", "entity"));
      assert.equal(write.effect, "deny");
      assert.equal(write.reason, "policy-engine-unreachable");
    },
  );
});

test("production denies sensitive actions when skip-upstream is set", async () => {
  await withEnv(
    {
      NODE_ENV: "production",
      POLICY_ENGINE_URL: "http://127.0.0.1:8082",
      DAEMON_POLICY_SKIP_UPSTREAM: "1",
    },
    async () => {
      const write = await new PolicyService().check(adminCheck("write", "entity"));
      assert.equal(write.effect, "deny");
      assert.equal(write.reason, "upstream-policy-required");

      const nl = await new PolicyService().check(adminCheck("query", "ontology-nl"));
      assert.equal(nl.effect, "deny");
      assert.equal(nl.reason, "upstream-policy-required");
    },
  );
});
