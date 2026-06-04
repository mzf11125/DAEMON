import { Injectable } from "@nestjs/common";
import { entityId, ontologyId } from "@daemon/platform-types";
import { DaemonRuntime } from "../platform/daemon-runtime";
import type { TenantContextHeaders } from "../platform/tenant-context";

@Injectable()
export class ReadService {
  constructor(private readonly runtime: DaemonRuntime) {}

  ensureSeed(ctx: TenantContextHeaders) {
    const scope = { tenantId: ctx.tenantId, domainId: ctx.domainId };
    const ont = ontologyId("foundation");
    const id = entityId("ent-1");
    if (!this.runtime.store.get(scope, ont, id)) {
      this.runtime.store.register({
        scope,
        ontologyId: ont,
        properties: { name: "Seed", entityType: "Party" },
        entityId: id,
        entityType: "Party",
      });
    }
  }

  getEntity(ctx: TenantContextHeaders, ont: string, id: string) {
    this.ensureSeed(ctx);
    return this.runtime.reads.route({
      tenantId: ctx.tenantId,
      domainId: ctx.domainId,
      ontologyId: ontologyId(ont),
      entityId: entityId(id),
    });
  }
}
