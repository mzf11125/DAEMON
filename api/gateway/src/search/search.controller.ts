import { Controller, Get, Query } from "@nestjs/common";
import type { SearchMode } from "@daemon/ontology/search/scoped-ontology-search.js";
import { Protected } from "../auth/protected.decorator";
import { PolicyCheck } from "../auth/policy-check.decorator";
import { DaemonScope } from "../auth/daemon-scope.decorator";
import type { TenantContextHeaders } from "../platform/tenant-context";
import { SearchService } from "./search.service";

@Controller("v1/search")
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @Protected()
  @PolicyCheck("query", "ontology-search")
  search(
    @DaemonScope() ctx: TenantContextHeaders,
    @Query("q") q: string,
    @Query("ontologyId") ontologyId?: string,
    @Query("limit") limit?: string,
    @Query("mode") mode?: string,
  ) {
    const parsedMode =
      mode === "keyword" || mode === "hybrid" ? (mode as SearchMode) : undefined;
    return this.searchService.search(ctx, {
      q: q ?? "",
      ontologyId,
      limit: limit ? Number(limit) : undefined,
      mode: parsedMode,
    });
  }
}
