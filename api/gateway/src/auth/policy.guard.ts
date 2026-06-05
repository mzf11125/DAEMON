import {
  ForbiddenException,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { DaemonSession } from "@daemon/platform-types";
import { PolicyService, type PolicyCheckInput } from "../policy/policy.service";
import { PROTECTED_KEY } from "./protected.decorator";
import { POLICY_CHECK_KEY, type PolicyCheckSpec } from "./policy-check.decorator";
import { PUBLIC_KEY } from "./public.decorator";
import { WEBHOOK_AUTH_KEY } from "./webhook-auth.decorator";
import type { TenantContextHeaders } from "../platform/tenant-context";

interface PolicyRequest {
  method?: string;
  daemonSession?: DaemonSession;
  daemonScope?: TenantContextHeaders;
}

const METHOD_ACTIONS: Record<string, string> = {
  GET: "read",
  HEAD: "read",
  POST: "write",
  PUT: "write",
  PATCH: "write",
  DELETE: "delete",
};

/**
 * Enforces a policy decision when {@link Protected} or {@link PolicyCheck} is present.
 */
@Injectable()
export class PolicyGuard implements CanActivate {
  constructor(
    private readonly policy: PolicyService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const isProtected = this.reflector.getAllAndOverride<boolean>(PROTECTED_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const policySpec = this.reflector.getAllAndOverride<PolicyCheckSpec | undefined>(
      POLICY_CHECK_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!isProtected && !policySpec) {
      return true;
    }

    const request = context.switchToHttp().getRequest<PolicyRequest>();
    const isWebhookAuth = this.reflector.getAllAndOverride<boolean>(WEBHOOK_AUTH_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const spec = this.resolveSpec(context, request);
    const input = this.buildInput(request, spec, isWebhookAuth);
    const decision = await this.policy.check(input);
    if (decision.effect !== "allow") {
      throw new ForbiddenException(
        decision.reason ?? `policy denied ${spec.action}:${spec.resource}`,
      );
    }
    return true;
  }

  private buildInput(
    request: PolicyRequest,
    spec: PolicyCheckSpec,
    isWebhookAuth: boolean,
  ): PolicyCheckInput {
    const scope = request.daemonScope;
    const session = request.daemonSession;

    const principal = session
      ? {
          subjectId: session.subjectId,
          tenantId: session.tenantId,
          roles: session.roles ?? [],
        }
      : isWebhookAuth && scope
        ? {
            subjectId: "machine:ingest",
            tenantId: scope.tenantId,
            roles: ["ingest-webhook"],
          }
        : {
            subjectId: "anonymous",
            tenantId: scope?.tenantId ?? "default",
            roles: [] as string[],
          };

    return {
      action: spec.action,
      resource: spec.resource,
      principal,
      resourceScope: {
        tenantId: scope?.tenantId ?? principal.tenantId,
        domainId: scope?.domainId ?? "foundation",
      },
    };
  }

  private resolveSpec(context: ExecutionContext, request: PolicyRequest): PolicyCheckSpec {
    const declared = this.reflector.getAllAndOverride<PolicyCheckSpec>(POLICY_CHECK_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (declared) {
      return declared;
    }
    const method = (request.method ?? "POST").toUpperCase();
    return { action: METHOD_ACTIONS[method] ?? "write", resource: "entity" };
  }
}
