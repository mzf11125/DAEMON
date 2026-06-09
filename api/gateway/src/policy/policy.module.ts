import { Module } from "@nestjs/common";
import { PolicyController } from "./policy.controller";
import { PolicyService } from "./policy.service";
import { createGatewayAuthorizer } from "./rbac-config";

@Module({
  controllers: [PolicyController],
  providers: [
    {
      provide: PolicyService,
      useFactory: () => new PolicyService(createGatewayAuthorizer()),
    },
  ],
  exports: [PolicyService],
})
export class PolicyModule {}
