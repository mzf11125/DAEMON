import { Injectable } from "@nestjs/common";
import { ontologyId } from "@daemon/platform-types";
import { GptSessionStore } from "@daemon/data-platform/product-sessions/gpt-session-store";
import { ProductRuntime } from "@daemon/products/shared/product-runtime.js";
import { GptOrchestrator } from "@daemon/products/customer-gpt/gpt-orchestrator.js";
import { ShadowPricing } from "@daemon/products/analytics-workflows/shadow-pricing.js";
import { DaemonRuntime } from "../platform/daemon-runtime";
import type { TenantContextHeaders } from "../platform/tenant-context";

@Injectable()
export class ProductsService {
  private readonly gptSessions = GptSessionStore.fromEnv();

  constructor(private readonly runtime: DaemonRuntime) {}

  private productRuntime(ctx: TenantContextHeaders): ProductRuntime {
    return ProductRuntime.fromGatewayBridge({
      reads: this.runtime.reads,
      writes: this.runtime.writes,
      store: this.runtime.store,
      policy: this.runtime.policy,
      search: this.runtime.search,
      scope: { tenantId: ctx.tenantId, domainId: ctx.domainId },
    });
  }

  async customerGptChat(
    ctx: TenantContextHeaders,
    body: {
      turns: { role: "user" | "assistant"; content: string }[];
      ontologyId?: string;
      limit?: number;
    },
    sessionId?: string,
  ) {
    const scope = { tenantId: ctx.tenantId, domainId: ctx.domainId };
    const priorCitations =
      sessionId && this.gptSessions
        ? await this.gptSessions.getCitations(scope, sessionId)
        : [];

    const product = this.productRuntime(ctx);
    const orchestrator = new GptOrchestrator(product);
    const ont = body.ontologyId ? ontologyId(body.ontologyId) : undefined;
    const result = await orchestrator.converse({
      turns: body.turns,
      ontologyId: ont,
      limit: body.limit,
    });
    if (sessionId && result.guardEffect === "allow" && this.gptSessions) {
      await this.gptSessions.upsertCitations(
        scope,
        sessionId,
        result.citations,
      );
    }
    return {
      ...result,
      sessionId: sessionId ?? null,
      priorCitations,
    };
  }

  async shadowPricingSimulate(
    ctx: TenantContextHeaders,
    body: {
      ontologyId?: string;
      shipmentRef?: string;
      limit?: number;
    },
  ) {
    const product = this.productRuntime(ctx);
    const pricing = new ShadowPricing(product);
    const ont = body.ontologyId ? ontologyId(body.ontologyId) : undefined;
    return pricing.simulate({
      ontologyId: ont,
      shipmentRef: body.shipmentRef,
      limit: body.limit,
    });
  }
}
