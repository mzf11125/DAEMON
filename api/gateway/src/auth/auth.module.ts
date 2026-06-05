import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { PlatformModule } from "../platform/platform.module";
import { PolicyModule } from "../policy/policy.module";
import { AuthService } from "./auth.service";
import { AuthGuard } from "./auth.guard";
import { PolicyGuard } from "./policy.guard";
import { TenantScopeGuard } from "./tenant-scope.guard";
import { WebhookHmacGuard } from "./webhook-hmac.guard";

/**
 * Registers authentication, tenant binding, and policy enforcement as global guards.
 *
 * Order: AuthGuard → WebhookHmacGuard → TenantScopeGuard → PolicyGuard.
 */
@Module({
  imports: [PlatformModule, PolicyModule],
  providers: [
    {
      provide: AuthService,
      useFactory: () => AuthService.create(process.env),
    },
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: WebhookHmacGuard },
    { provide: APP_GUARD, useClass: TenantScopeGuard },
    { provide: APP_GUARD, useClass: PolicyGuard },
  ],
  exports: [AuthService],
})
export class AuthModule {}
