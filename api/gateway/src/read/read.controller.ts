import { Controller, Get, Param, Query } from "@nestjs/common";
import { Protected } from "../auth/protected.decorator";
import { PolicyCheck } from "../auth/policy-check.decorator";
import { DaemonScope } from "../auth/daemon-scope.decorator";
import type { TenantContextHeaders } from "../platform/tenant-context";
import { ReadService } from "./read.service";

@Controller("v1/read")
export class ReadController {
  constructor(private readonly reads: ReadService) {}

  @Get("entities")
  @Protected()
  @PolicyCheck("read", "entity")
  listEntities(
    @DaemonScope() ctx: TenantContextHeaders,
    @Query("ontologyId") ontologyId: string,
    @Query("entityType") entityType?: string,
    @Query("limit") limit?: string,
    @Query("cursor") cursor?: string,
    @Query("updatedAfter") updatedAfter?: string,
  ) {
    return this.reads.listEntities(ctx, {
      ontologyId: ontologyId ?? "foundation",
      entityType,
      limit: limit ? Number(limit) : undefined,
      cursor,
      updatedAfter,
    });
  }

  @Get("entities/:entityId")
  @Protected()
  @PolicyCheck("read", "entity")
  getEntity(
    @DaemonScope() ctx: TenantContextHeaders,
    @Param("entityId") entityId: string,
    @Query("ontologyId") ontologyId: string,
  ) {
    return this.reads.getEntity(ctx, ontologyId ?? "foundation", entityId);
  }
}
