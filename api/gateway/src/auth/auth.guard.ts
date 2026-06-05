import {
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { DaemonError } from "@daemon/platform-types";
import type { DaemonSession } from "@daemon/platform-types";
import { AuthService, type AuthHeaders } from "./auth.service";
import { PROTECTED_KEY } from "./protected.decorator";
import { POLICY_CHECK_KEY, type PolicyCheckSpec } from "./policy-check.decorator";
import { PUBLIC_KEY } from "./public.decorator";
import { WEBHOOK_AUTH_KEY } from "./webhook-auth.decorator";

interface RequestWithSession {
  headers: AuthHeaders;
  daemonSession?: DaemonSession;
}

/**
 * Global guard. Resolves any supplied session and attaches it to the request.
 * Routes marked with {@link Protected} or {@link PolicyCheck} require credentials
 * unless marked {@link WebhookAuth} (machine ingress).
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly auth: AuthService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithSession>();

    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    let session: DaemonSession | null = null;
    try {
      session = await this.auth.resolveSession(request.headers ?? {});
    } catch (error) {
      throw new UnauthorizedException(
        error instanceof DaemonError ? error.message : "authentication failed",
      );
    }
    request.daemonSession = session ?? undefined;

    const isWebhook = this.reflector.getAllAndOverride<boolean>(WEBHOOK_AUTH_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isWebhook) {
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
    if ((isProtected || policySpec) && !session) {
      throw new UnauthorizedException("authentication required");
    }
    return true;
  }
}
