import { Injectable, type CanActivate, type ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { verifyWebhookHmacSignature } from "../ingest/webhook-hmac";
import { WEBHOOK_AUTH_KEY } from "./webhook-auth.decorator";

/**
 * Runs HMAC verification on {@link WebhookAuth} routes before tenant/policy guards.
 */
@Injectable()
export class WebhookHmacGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isWebhook = this.reflector.getAllAndOverride<boolean>(WEBHOOK_AUTH_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!isWebhook) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const body = request.body;
    const raw = typeof body === "string" ? body : JSON.stringify(body ?? {});
    const sig = request.headers["x-daemon-signature"];
    verifyWebhookHmacSignature(
      raw,
      typeof sig === "string" ? sig : Array.isArray(sig) ? sig[0] : undefined,
    );
    return true;
  }
}
