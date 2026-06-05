import { createHmac, timingSafeEqual } from "node:crypto";
import { DaemonError, ErrorCodes } from "@daemon/platform-types";
import { isProductionPolicyMode } from "../policy/policy-mode";

/** Verifies `X-Daemon-Signature` for machine ingress webhooks; fail-closed when required. */
export function verifyWebhookHmacSignature(
  rawBody: string,
  signatureHeader: string | undefined,
  env: NodeJS.ProcessEnv = process.env,
): void {
  const secret = env.DAEMON_WEBHOOK_HMAC_SECRET;
  const requireHmac =
    env.DAEMON_WEBHOOK_REQUIRE_HMAC === "1" || isProductionPolicyMode(env);
  if (!secret) {
    if (requireHmac) {
      throw new DaemonError(
        ErrorCodes.UNAUTHORIZED,
        "webhook-auth-unconfigured",
        env.NODE_ENV === "production" ? 503 : 401,
      );
    }
    return;
  }
  if (!signatureHeader) {
    throw new DaemonError(
      ErrorCodes.UNAUTHORIZED,
      "missing X-Daemon-Signature",
      401,
    );
  }
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const provided = signatureHeader.replace(/^sha256=/, "");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(provided, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new DaemonError(ErrorCodes.UNAUTHORIZED, "invalid webhook signature", 401);
  }
}
