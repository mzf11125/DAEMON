import { Controller, Get } from "@nestjs/common";
import { Protected } from "../auth/protected.decorator";
import { PolicyCheck } from "../auth/policy-check.decorator";
import { DaemonScope } from "../auth/daemon-scope.decorator";
import type { TenantContextHeaders } from "../platform/tenant-context";
import { DataHealthService } from "./data-health.service";

@Controller("v1/data-health")
export class DataHealthController {
  constructor(private readonly dataHealth: DataHealthService) {}

  @Get("summary")
  @Protected()
  @PolicyCheck("read", "data-health")
  summary(@DaemonScope() ctx: TenantContextHeaders) {
    return this.dataHealth.summary(ctx);
  }
}
