import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { SourceCatalog } from "@daemon/collect-sensing/orchestrator/source-catalog.js";
import { DaemonError, ErrorCodes } from "@daemon/platform-types";
import type { DaemonSession } from "@daemon/platform-types";
import { TenantContextService, type TenantContextHeaders } from "../platform/tenant-context";
import { PUBLIC_KEY } from "./public.decorator";
import { WEBHOOK_AUTH_KEY } from "./webhook-auth.decorator";

interface ScopedRequest {
  headers: Record<string, string | string[] | undefined>;
  params?: Record<string, string>;
  daemonSession?: DaemonSession;
  daemonScope?: TenantContextHeaders;
}

/**
 * Binds tenant/domain scope onto the request after authentication.
 * Prevents cross-tenant header spoofing for session-backed routes.
 */
@Injectable()
export class TenantScopeGuard implements CanActivate {
  private readonly catalog = SourceCatalog.fromYamlFile();

  constructor(
    private readonly tenants: TenantContextService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<ScopedRequest>();
    const isWebhook = this.reflector.getAllAndOverride<boolean>(WEBHOOK_AUTH_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    try {
      if (isWebhook) {
        const sourceId =
          request.params?.sourceId ?? request.params?.listenerId ?? "";
        let source = sourceId ? this.catalog.get(sourceId) : undefined;
        if (!source?.scope && request.params?.listenerId) {
          source = this.catalog.get(`listener:${request.params.listenerId}`);
        }
        const scope = source?.scope;
        if (!scope?.tenantId) {
          throw new DaemonError(
            ErrorCodes.VALIDATION,
            `source ${sourceId || "(unknown)"} has no scope.tenantId in sources.yaml`,
            400,
          );
        }
        request.daemonScope = this.tenants.resolveBound(request.headers ?? {}, undefined, {
          forcedTenantId: scope.tenantId,
          forcedDomainId: scope.domainId,
        });
      } else {
        request.daemonScope = this.tenants.resolveBound(
          request.headers ?? {},
          request.daemonSession,
        );
      }
    } catch (error) {
      if (error instanceof DaemonError) {
        if (error.status === 403) {
          throw new ForbiddenException(error.message);
        }
        if (error.status === 400) {
          throw new BadRequestException(error.message);
        }
        throw new ForbiddenException(error.message);
      }
      throw error;
    }
    return true;
  }
}
