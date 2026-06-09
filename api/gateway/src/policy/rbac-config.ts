import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { parse as parseYaml } from "yaml";
import { Rbac } from "@daemon/security-governance/policy/rbac.js";
import { Authorizer } from "@daemon/security-governance/identity/authz.js";
import { PLATFORM_ADMIN_ROLE } from "../platform/platform-roles.js";

interface RbacYaml {
  roles?: Array<{
    role: string;
    permissions: string[];
    inherits?: string[];
  }>;
}

const RBAC_RELATIVE = join("configs", "governance", "rbac.yaml");

function findRepoRootFrom(start: string): string | undefined {
  let dir = start;
  for (;;) {
    if (existsSync(join(dir, RBAC_RELATIVE))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
}

function rbacConfigPath(): string {
  const root =
    process.env.DAEMON_REPO_ROOT ??
    findRepoRootFrom(process.cwd()) ??
    process.cwd();
  return join(root, RBAC_RELATIVE);
}

export function createGatewayAuthorizer(): Authorizer {
  const text = readFileSync(rbacConfigPath(), "utf8");
  const doc = parseYaml(text) as RbacYaml;
  const rbac = new Rbac();
  for (const entry of doc.roles ?? []) {
    rbac.define({
      role: entry.role,
      permissions: entry.permissions ?? [],
      inherits: entry.inherits,
    });
  }
  return new Authorizer(rbac);
}

/** Cross-tenant ABAC deny unless principal has platform-admin or admin. */
export function crossTenantDenied(
  principalTenantId: string,
  resourceTenantId: string,
  roles: readonly string[],
): boolean {
  if (principalTenantId === resourceTenantId) {
    return false;
  }
  return (
    !roles.includes(PLATFORM_ADMIN_ROLE) &&
    !roles.includes("admin") &&
    !roles.includes("platform-admin")
  );
}
