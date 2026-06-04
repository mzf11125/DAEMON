import { Body, Controller, Post } from "@nestjs/common";
import { GovernanceService } from "./governance.service";
import type { SchemaChangeDescriptor } from "@daemon/ontology/governance/governance-policy-loader.js";
import type { ValidatePackChangeRequest } from "./governance.service.js";

/**
 * Dev/admin stub for evaluating pack schema changes against governance-policies.yaml.
 */
@Controller("v1/governance/pack")
export class GovernanceController {
  constructor(private readonly governance: GovernanceService) {}

  @Post("validate-change")
  validateChange(@Body() body: ValidatePackChangeRequest | SchemaChangeDescriptor) {
    return this.governance.validatePackChange(body);
  }
}
