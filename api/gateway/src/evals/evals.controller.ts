import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { EvalsService } from "./evals.service";
import { Protected } from "../auth/protected.decorator";
import { DaemonScope } from "../auth/daemon-scope.decorator";
import type { TenantContextHeaders } from "../platform/tenant-context";

@Controller("v1/evals")
export class EvalsController {
  constructor(private readonly evals: EvalsService) {}

  @Post("run")
  @Protected()
  run(
    @DaemonScope() ctx: TenantContextHeaders,
    @Body()
    body: {
      suite: {
        id: string;
        cases: Array<{
          id: string;
          question: string;
          expectContains?: string[];
        }>;
      };
    },
  ) {
    return this.evals.runEval(ctx, body.suite);
  }

  @Post("record")
  @Protected()
  record(
    @DaemonScope() ctx: TenantContextHeaders,
    @Body()
    body: {
      suiteId: string;
      name: string;
      score: number;
      threshold?: number;
      metadata?: Record<string, unknown>;
    },
  ) {
    return this.evals.record(ctx, body);
  }

  @Get("runs")
  @Protected()
  list(
    @DaemonScope() ctx: TenantContextHeaders,
    @Query("limit") limit?: string,
  ) {
    return this.evals.list(ctx, limit ? Number(limit) : 20);
  }
}
