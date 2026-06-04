import { Global, Module } from "@nestjs/common";
import { DaemonRuntime, getDaemonRuntime, initDaemonRuntime } from "./daemon-runtime";
import { TenantContextService } from "./tenant-context";

@Global()
@Module({
  providers: [
    {
      provide: DaemonRuntime,
      useFactory: async () => {
        if (process.env.DAEMON_POSTGRES_URL) {
          return initDaemonRuntime();
        }
        return getDaemonRuntime();
      },
    },
    TenantContextService,
  ],
  exports: [DaemonRuntime, TenantContextService],
})
export class PlatformModule {}
