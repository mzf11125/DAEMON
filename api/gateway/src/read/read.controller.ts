import { Controller, Get, Headers, Param, Query } from "@nestjs/common";
import { ReadService } from "./read.service";
import { TenantContextService } from "../platform/tenant-context";

@Controller("v1/read")
export class ReadController {
  constructor(
    private readonly reads: ReadService,
    private readonly tenantContext: TenantContextService,
  ) {}

  @Get("entities/:entityId")
  getEntity(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param("entityId") entityId: string,
    @Query("ontologyId") ontologyId: string,
  ) {
    const ctx = this.tenantContext.resolve(headers);
    return this.reads.getEntity(ctx, ontologyId ?? "foundation", entityId);
  }
}
