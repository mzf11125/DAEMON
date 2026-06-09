import { Injectable } from "@nestjs/common";
import {
  DEFAULT_DOMAIN_ID,
  DEFAULT_TENANT_ID,
  type OntologyScope,
} from "@daemon/context-ports";
import { TenantRegistry } from "@daemon/ontology/tenancy/tenant-registry.js";
import { DomainCatalog } from "@daemon/ontology/tenancy/domain-catalog.js";
import { DaemonError, ErrorCodes, type DaemonSession } from "@daemon/platform-types";
import { hasPlatformAdmin } from "./platform-roles.js";

export interface TenantContextHeaders {
  tenantId: string;
  domainId: string;
}

@Injectable()
export class TenantContextService {
  readonly tenants = TenantRegistry.fromYamlFile();
  readonly domains = DomainCatalog.fromYamlFile();

  resolve(headers: Record<string, string | string[] | undefined>): TenantContextHeaders {
    return this.resolveBound(headers);
  }

  /**
   * Binds tenant/domain headers to the authenticated session when present.
   * Webhook routes pass `session: undefined` and `forcedTenant` from the source catalog.
   */
  resolveBound(
    headers: Record<string, string | string[] | undefined>,
    session?: DaemonSession,
    options?: { forcedTenantId?: string; forcedDomainId?: string },
  ): TenantContextHeaders {
    const headerTenant = headerValue(headers["x-daemon-tenant"]);
    const headerDomain = headerValue(headers["x-daemon-domain"]);

    let tenantId =
      options?.forcedTenantId ??
      headerTenant ??
      session?.tenantId ??
      DEFAULT_TENANT_ID;
    let domainId =
      options?.forcedDomainId ?? headerDomain ?? DEFAULT_DOMAIN_ID;

    if (session && headerTenant && headerTenant !== session.tenantId) {
      if (!hasPlatformAdmin(session.roles)) {
        throw new DaemonError(
          ErrorCodes.POLICY_DENIED,
          `tenant header ${headerTenant} does not match session tenant ${session.tenantId}`,
          403,
        );
      }
      tenantId = headerTenant;
    }

    return this.validateScope(tenantId, domainId);
  }

  validateScope(tenantId: string, domainId: string): TenantContextHeaders {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      throw new DaemonError(
        ErrorCodes.VALIDATION,
        `unknown tenant: ${tenantId}`,
        400,
      );
    }
    if (!this.domains.get(domainId)) {
      throw new DaemonError(
        ErrorCodes.VALIDATION,
        `unknown domain: ${domainId}`,
        400,
      );
    }
    if (!tenant.enabledDomains.includes(domainId)) {
      throw new DaemonError(
        ErrorCodes.POLICY_DENIED,
        `domain ${domainId} not enabled for tenant ${tenantId}`,
        403,
      );
    }
    return { tenantId, domainId };
  }

  toScope(ctx: TenantContextHeaders): OntologyScope {
    return { tenantId: ctx.tenantId, domainId: ctx.domainId };
  }
}

function headerValue(
  raw: string | string[] | undefined,
): string | undefined {
  if (raw === undefined) return undefined;
  return Array.isArray(raw) ? raw[0] : raw;
}
