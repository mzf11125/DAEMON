import { Body, Controller, Param, Post } from "@nestjs/common";
import { FunctionsService } from "./functions.service";
import { Protected } from "../auth/protected.decorator";
import { DaemonScope } from "../auth/daemon-scope.decorator";
import type { TenantContextHeaders } from "../platform/tenant-context";

@Controller("v1/functions")
export class FunctionsController {
  constructor(private readonly functions: FunctionsService) {}

  @Post(":functionId/invoke")
  @Protected()
  invoke(
    @DaemonScope() ctx: TenantContextHeaders,
    @Param("functionId") functionId: string,
    @Body() body: { input?: Record<string, unknown> },
  ) {
    return this.functions.invoke(ctx, functionId, body?.input ?? {});
  }
}
