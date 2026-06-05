import { Body, Controller, Post } from "@nestjs/common";
import { Protected } from "../auth/protected.decorator";
import { PolicyCheck } from "../auth/policy-check.decorator";
import { DaemonScope } from "../auth/daemon-scope.decorator";
import { Session } from "../auth/session.decorator";
import type { DaemonSession } from "@daemon/platform-types";
import type { TenantContextHeaders } from "../platform/tenant-context";
import { PolicyService } from "./policy.service";

@Controller("v1/policy")
export class PolicyController {
  constructor(private readonly policy: PolicyService) {}

  @Post("check")
  @Protected()
  @PolicyCheck("read", "entity")
  check(
    @Session() session: DaemonSession,
    @DaemonScope() scope: TenantContextHeaders,
    @Body() body: { action: string; resource: string },
  ) {
    return this.policy.check({
      action: body.action,
      resource: body.resource,
      principal: {
        subjectId: session.subjectId,
        tenantId: session.tenantId,
        roles: session.roles ?? [],
      },
      resourceScope: {
        tenantId: scope.tenantId,
        domainId: scope.domainId,
      },
    });
  }
}
