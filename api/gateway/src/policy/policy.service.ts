import { Injectable } from "@nestjs/common";
import type { PolicyDecision } from "@daemon/platform-types";
import type { Authorizer } from "@daemon/security-governance/identity/authz.js";
import {
  createGatewayAuthorizer,
  crossTenantDenied,
} from "./rbac-config.js";
import {
  isPolicySkipUpstream,
  isProductionPolicyMode,
  requiresUpstreamPolicyDecision,
} from "./policy-mode.js";

function devLegacyAllow(action: string, resource: string): PolicyDecision {
  const allowed =
    ((action === "read" || action === "write") && resource === "entity") ||
    (action === "query" && (resource === "analytics" || resource === "ontology-nl")) ||
    (action === "ingest" && resource.startsWith("ingest"));
  return {
    effect: allowed ? "allow" : "deny",
    reason: allowed ? "dev-legacy-allow" : "no rule",
  };
}

function denyClosed(reason: string): PolicyDecision {
  return { effect: "deny", reason };
}

export interface PolicyPrincipal {
  subjectId: string;
  tenantId: string;
  roles: string[];
}

export interface PolicyResourceScope {
  tenantId: string;
  domainId: string;
}

export interface PolicyCheckInput {
  action: string;
  resource: string;
  principal: PolicyPrincipal;
  resourceScope: PolicyResourceScope;
}

@Injectable()
export class PolicyService {
  private readonly authorizer: Authorizer;

  constructor(authorizer?: Authorizer) {
    this.authorizer = authorizer ?? createGatewayAuthorizer();
  }

  async check(input: PolicyCheckInput | string, resource?: string): Promise<PolicyDecision> {
    const normalized =
      typeof input === "string"
        ? {
            action: input,
            resource: resource ?? "entity",
            principal: {
              subjectId: "anonymous",
              tenantId: "default",
              roles: [] as string[],
            },
            resourceScope: { tenantId: "default", domainId: "foundation" },
          }
        : input;
    const { action, resource: res } = normalized;
    const env = process.env;
    const url = env.POLICY_ENGINE_URL;
    const skipUpstream = isPolicySkipUpstream(env);
    const prod = isProductionPolicyMode(env);
    const sensitive = requiresUpstreamPolicyDecision(action, res);

    if (prod && !url) {
      return denyClosed("policy-engine-unconfigured");
    }

    if (prod && sensitive && skipUpstream) {
      return denyClosed("upstream-policy-required");
    }

    let upstreamAttempted = false;
    if (url && !skipUpstream) {
      upstreamAttempted = true;
      try {
        const response = await fetch(`${url}/check`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            action,
            resource: res,
            subject: normalized.principal,
            resource_scope: normalized.resourceScope,
          }),
        });
        if (response.ok) {
          return (await response.json()) as PolicyDecision;
        }
      } catch {
        // unreachable — fail closed in production, dev fallback otherwise
      }
      if (prod) {
        return denyClosed("policy-engine-unreachable");
      }
    }

    if (!prod && (!url || skipUpstream || upstreamAttempted)) {
      if (env.DAEMON_POLICY_DEV_ALLOW === "1" || env.DAEMON_POLICY_DEV_ALLOW === "true") {
        return devLegacyAllow(action, res);
      }
      return this.authorizeLocal(normalized);
    }

    return denyClosed("policy-denied");
  }

  private authorizeLocal(input: PolicyCheckInput): PolicyDecision {
    const { principal, resourceScope, action } = input;
    if (
      crossTenantDenied(principal.tenantId, resourceScope.tenantId, principal.roles)
    ) {
      return denyClosed("cross-tenant-denied");
    }
    return this.authorizer.authorize({
      principal: {
        subjectId: principal.subjectId,
        tenantId: principal.tenantId,
        roles: principal.roles,
      },
      action,
      resource: {
        tenantId: resourceScope.tenantId,
        domainId: resourceScope.domainId,
      },
    });
  }
}
