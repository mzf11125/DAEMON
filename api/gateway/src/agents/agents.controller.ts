import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { AgentsService } from "./agents.service";
import { Protected } from "../auth/protected.decorator";
import { DaemonScope } from "../auth/daemon-scope.decorator";
import type { TenantContextHeaders } from "../platform/tenant-context";

@Controller("v1/agents")
export class AgentsController {
  constructor(private readonly agents: AgentsService) {}

  @Post("sessions")
  @Protected()
  createSession(
    @DaemonScope() ctx: TenantContextHeaders,
    @Body() body: { tools?: string[]; metadata?: Record<string, unknown> },
  ) {
    return this.agents.createSession(ctx, body ?? {});
  }

  @Get("sessions/:sessionId")
  @Protected()
  getSession(@Param("sessionId") sessionId: string) {
    return this.agents.getSession(sessionId) ?? { status: "not_found" };
  }

  @Post("sessions/:sessionId/tools")
  @Protected()
  invokeTool(
    @Param("sessionId") sessionId: string,
    @Body() body: { tool: string; input: Record<string, unknown> },
  ) {
    return this.agents.invokeTool(sessionId, body);
  }
}
