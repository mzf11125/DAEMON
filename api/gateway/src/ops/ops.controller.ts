import { Controller, Get } from "@nestjs/common";
import { OpsService } from "./ops.service";
import { Public } from "../auth/public.decorator";
import { Protected } from "../auth/protected.decorator";
import { DaemonScope } from "../auth/daemon-scope.decorator";
import type { TenantContextHeaders } from "../platform/tenant-context";

@Controller("v1/ops")
export class OpsController {
  constructor(private readonly ops: OpsService) {}

  @Get("health")
  @Public()
  health() {
    return this.ops.health();
  }

  @Get("connectors")
  @Protected()
  connectors() {
    return this.ops.listConnectors();
  }

  @Get("jobs")
  @Protected()
  jobs(@DaemonScope() ctx: TenantContextHeaders) {
    return this.ops.listJobs(ctx);
  }
}
