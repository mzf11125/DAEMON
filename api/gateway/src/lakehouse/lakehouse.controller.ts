import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { Protected } from "../auth/protected.decorator";
import { PolicyCheck } from "../auth/policy-check.decorator";
import { DaemonScope } from "../auth/daemon-scope.decorator";
import type { TenantContextHeaders } from "../platform/tenant-context";
import { LakehouseService } from "./lakehouse.service";
import { LakehouseExportService } from "./lakehouse-export.service";

@Controller("v1/lakehouse")
export class LakehouseController {
  constructor(
    private readonly lakehouse: LakehouseService,
    private readonly exports: LakehouseExportService,
  ) {}

  @Get("events")
  @Protected()
  @PolicyCheck("read", "lakehouse")
  events(
    @DaemonScope() ctx: TenantContextHeaders,
    @Query("since") since?: string,
    @Query("limit") limit?: string,
    @Query("entityType") entityType?: string,
    @Query("ontologyId") ontologyId?: string,
    @Query("changeType") changeType?: string,
  ) {
    return this.lakehouse.listEvents(ctx, {
      since,
      limit,
      entityType,
      ontologyId,
      changeType,
    });
  }

  @Get("summary")
  @Protected()
  @PolicyCheck("read", "lakehouse")
  summary(@DaemonScope() ctx: TenantContextHeaders, @Query("since") since?: string) {
    return this.lakehouse.summarize(ctx, { since });
  }

  @Post("export")
  @Protected()
  @PolicyCheck("write", "lakehouse-export")
  startExport(
    @DaemonScope() ctx: TenantContextHeaders,
    @Body() body: { since?: string; limit?: number; format?: "jsonl" | "parquet" },
  ) {
    return this.exports.startExport(ctx, body ?? {});
  }

  @Get("exports/:exportId")
  @Protected()
  @PolicyCheck("read", "lakehouse")
  getExport(@DaemonScope() ctx: TenantContextHeaders, @Param("exportId") exportId: string) {
    return this.exports.getExport(ctx, exportId);
  }
}
