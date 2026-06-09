import { Controller, Get, Query } from "@nestjs/common";
import { Protected } from "../auth/protected.decorator";
import { PolicyCheck } from "../auth/policy-check.decorator";
import { DaemonScope } from "../auth/daemon-scope.decorator";
import type { TenantContextHeaders } from "../platform/tenant-context";
import { AnalyticsService } from "./analytics.service";

/**
 * Analytics workflows over the ontology registry (search, reports, dashboards).
 */
@Controller("v1/analytics")
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get("search")
  @Protected()
  @PolicyCheck("query", "analytics")
  searchReport(
    @DaemonScope() ctx: TenantContextHeaders,
    @Query("q") q: string,
    @Query("ontologyId") ontologyId?: string,
    @Query("limit") limit?: string,
    @Query("property") property?: string,
    @Query("propertyValue") propertyValue?: string,
    @Query("reportTitle") reportTitle?: string,
  ) {
    return this.analytics.searchReport(ctx, {
      q: q ?? "",
      ontologyId,
      limit: limit ? Number(limit) : undefined,
      property,
      propertyValue,
      reportTitle,
    });
  }

  @Get("entities")
  @Protected()
  @PolicyCheck("query", "analytics")
  searchEntities(
    @DaemonScope() ctx: TenantContextHeaders,
    @Query("q") q: string,
    @Query("ontologyId") ontologyId?: string,
    @Query("limit") limit?: string,
    @Query("property") property?: string,
    @Query("propertyValue") propertyValue?: string,
  ) {
    return this.analytics.searchEntities(ctx, {
      q: q ?? "",
      ontologyId,
      limit: limit ? Number(limit) : undefined,
      property,
      propertyValue,
    });
  }

  @Get("dashboard")
  @Protected()
  @PolicyCheck("query", "analytics")
  dashboard(
    @DaemonScope() ctx: TenantContextHeaders,
    @Query("ontologyId") ontologyId?: string,
    @Query("breakdownField") breakdownField?: string,
  ) {
    return this.analytics.dashboard(ctx, { ontologyId, breakdownField });
  }

  @Get("lakehouse")
  @Protected()
  @PolicyCheck("query", "analytics")
  lakehouseSummary(
    @DaemonScope() ctx: TenantContextHeaders,
    @Query("since") since?: string,
    @Query("reportTitle") reportTitle?: string,
  ) {
    return this.analytics.lakehouseSummary(ctx, { since, reportTitle });
  }
}
