import { Body, Controller, Post } from "@nestjs/common";
import type { SchemaChangeDescriptor } from "@daemon/ontology/governance/governance-policy-loader.js";
import { Protected } from "../auth/protected.decorator";
import { PolicyCheck } from "../auth/policy-check.decorator";
import { GovernanceService } from "./governance.service";
import type { ValidatePackChangeRequest } from "./governance.service.js";

/**
 * Pack governance: validate and promote ontology packs (admin-only).
 */
@Controller("v1/governance/pack")
export class GovernanceController {
  constructor(private readonly governance: GovernanceService) {}

  @Post("validate-change")
  @Protected()
  @PolicyCheck("write", "ontology-pack")
  validateChange(@Body() body: ValidatePackChangeRequest | SchemaChangeDescriptor) {
    return this.governance.validatePackChange(body);
  }

  @Post("promote")
  @Protected()
  @PolicyCheck("write", "ontology-pack")
  promote(
    @Body()
    body: {
      packId: string;
      fromEnv?: string;
      toEnv: string;
      version?: string;
    },
  ) {
    return this.governance.promotePack(body);
  }
}
