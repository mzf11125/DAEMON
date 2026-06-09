import { Body, Controller, Param, Post } from "@nestjs/common";
import { Protected } from "../auth/protected.decorator";
import { PolicyCheck } from "../auth/policy-check.decorator";
import { DaemonScope } from "../auth/daemon-scope.decorator";
import type { TenantContextHeaders } from "../platform/tenant-context";
import { PipelinesService } from "./pipelines.service";

@Controller("v1/pipelines")
export class PipelinesController {
  constructor(private readonly pipelines: PipelinesService) {}

  @Post(":pipelineId/run")
  @Protected()
  @PolicyCheck("write", "pipeline")
  run(
    @DaemonScope() ctx: TenantContextHeaders,
    @Param("pipelineId") pipelineId: string,
    @Body() body: { dag: { nodes: Array<Record<string, unknown>> } },
  ) {
    return this.pipelines.runPipeline(ctx, pipelineId, {
      nodes: body.dag.nodes.map((n) => ({
        id: String(n.id),
        type: n.type as "source" | "map" | "filter" | "deliver-lakehouse" | "register",
        config: n.config as Record<string, unknown> | undefined,
      })),
    });
  }
}
