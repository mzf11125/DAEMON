import { SetMetadata } from "@nestjs/common";

export const WEBHOOK_AUTH_KEY = "daemon:webhook-auth";

/**
 * Machine ingress routes (webhooks, listeners). No user session required;
 * tenant scope is derived from the source catalog, not client headers.
 */
export const WebhookAuth = () => SetMetadata(WEBHOOK_AUTH_KEY, true);
