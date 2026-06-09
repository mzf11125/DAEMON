import { Body, Controller, Post } from "@nestjs/common";
import { WriteService } from "./write.service";
import type { DaemonSession } from "@daemon/platform-types";
import { Protected } from "../auth/protected.decorator";
import { PolicyCheck } from "../auth/policy-check.decorator";
import { Session } from "../auth/session.decorator";
import { DaemonScope } from "../auth/daemon-scope.decorator";
import type { TenantContextHeaders } from "../platform/tenant-context";

@Controller("v1")
export class WriteController {
  constructor(private readonly writes: WriteService) {}

  @Post("write")
  @Protected()
  @PolicyCheck("write", "entity")
  write(
    @Session() session: DaemonSession,
    @DaemonScope() ctx: TenantContextHeaders,
    @Body()
    body: {
      entityId: string;
      ontologyId: string;
      patch: Record<string, unknown>;
      idempotencyKey?: string;
    },
  ) {
    return this.writes.submit(session, ctx, body);
  }
}
