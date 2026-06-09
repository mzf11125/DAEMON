import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { TenantContextHeaders } from "../platform/tenant-context";

/**
 * Injects tenant scope bound by {@link TenantScopeGuard} on the request.
 */
export const DaemonScope = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TenantContextHeaders => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ daemonScope?: TenantContextHeaders }>();
    if (!request.daemonScope) {
      throw new Error("daemonScope missing — TenantScopeGuard must run first");
    }
    return request.daemonScope;
  },
);
