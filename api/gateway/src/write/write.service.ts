import { Injectable } from "@nestjs/common";
import type { DaemonSession } from "@daemon/platform-types";
import { DaemonRuntime } from "../platform/daemon-runtime";
import type { TenantContextHeaders } from "../platform/tenant-context";

@Injectable()
export class WriteService {
  constructor(private readonly runtime: DaemonRuntime) {}

  async submit(
    session: DaemonSession,
    ctx: TenantContextHeaders,
    body: {
      entityId: string;
      ontologyId: string;
      patch: Record<string, unknown>;
      idempotencyKey?: string;
    },
  ) {
    const scope = { tenantId: ctx.tenantId, domainId: ctx.domainId };
    const outcome = await this.runtime.runWriteLoop(scope, {
      session,
      ontologyId: body.ontologyId,
      entityId: body.entityId,
      patch: body.patch,
      idempotencyKey: body.idempotencyKey,
    });
    return {
      writeId: `loop-${Date.now()}`,
      status: "committed" as const,
      version: outcome.version,
      state: outcome.state,
    };
  }
}
