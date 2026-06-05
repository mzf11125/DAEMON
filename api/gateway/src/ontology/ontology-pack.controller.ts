import { Controller, Get, Query } from "@nestjs/common";
import { Protected } from "../auth/protected.decorator";
import { PolicyCheck } from "../auth/policy-check.decorator";
import { DaemonScope } from "../auth/daemon-scope.decorator";
import type { TenantContextHeaders } from "../platform/tenant-context";
import { OntologyPackService } from "./ontology-pack.service";

@Controller("v1/ontology")
export class OntologyPackController {
  constructor(private readonly packs: OntologyPackService) {}

  @Get("pack-resolution")
  @Protected()
  @PolicyCheck("read", "ontology-pack")
  packResolution(
    @DaemonScope() ctx: TenantContextHeaders,
    @Query("environment") environment?: string,
    @Query("packBranch") packBranch?: string,
  ) {
    return this.packs.packResolution(ctx, { environment, packBranch });
  }
}
