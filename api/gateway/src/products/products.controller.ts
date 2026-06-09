import { Body, Controller, Headers, Post } from "@nestjs/common";
import { Protected } from "../auth/protected.decorator";
import { PolicyCheck } from "../auth/policy-check.decorator";
import { DaemonScope } from "../auth/daemon-scope.decorator";
import type { TenantContextHeaders } from "../platform/tenant-context";
import { ProductsService } from "./products.service";

@Controller("v1/products")
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Post("customer-gpt/chat")
  @Protected()
  @PolicyCheck("chat", "customer-gpt")
  chat(
    @DaemonScope() ctx: TenantContextHeaders,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Body()
    body: {
      turns: { role: "user" | "assistant"; content: string }[];
      ontologyId?: string;
      limit?: number;
    },
  ) {
    const sessionHeader = headers["x-session-id"];
    const sessionId = Array.isArray(sessionHeader)
      ? sessionHeader[0]
      : sessionHeader;
    return this.products.customerGptChat(ctx, body, sessionId);
  }

  @Post("shadow-pricing/simulate")
  @Protected()
  @PolicyCheck("query", "analytics")
  shadowPricingSimulate(
    @DaemonScope() ctx: TenantContextHeaders,
    @Body()
    body: {
      ontologyId?: string;
      shipmentRef?: string;
      limit?: number;
    },
  ) {
    return this.products.shadowPricingSimulate(ctx, body);
  }
}
