import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { Protected } from "../auth/protected.decorator";
import { PolicyCheck } from "../auth/policy-check.decorator";
import { DaemonScope } from "../auth/daemon-scope.decorator";
import type { TenantContextHeaders } from "../platform/tenant-context";
import { IngestScheduleService } from "./ingest-schedule.service";

interface CreateScheduleBody {
  sourceId: string;
  cronExpr: string;
  enabled?: boolean;
}

interface PatchScheduleBody {
  sourceId?: string;
  cronExpr?: string;
  enabled?: boolean;
}

@Controller("v1/ingest/schedules")
export class IngestSchedulesController {
  constructor(private readonly schedules: IngestScheduleService) {}

  @Get()
  @Protected()
  @PolicyCheck("ingest", "ingest-schedule")
  list(@DaemonScope() ctx: TenantContextHeaders) {
    return this.schedules.list(ctx);
  }

  @Post()
  @Protected()
  @PolicyCheck("ingest", "ingest-schedule")
  create(@DaemonScope() ctx: TenantContextHeaders, @Body() body: CreateScheduleBody) {
    return this.schedules.create(ctx, body);
  }

  @Patch(":id")
  @Protected()
  @PolicyCheck("ingest", "ingest-schedule")
  patch(
    @DaemonScope() ctx: TenantContextHeaders,
    @Param("id") id: string,
    @Body() body: PatchScheduleBody,
  ) {
    return this.schedules.patch(ctx, id, body);
  }
}
