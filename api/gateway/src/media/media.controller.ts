import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { Protected } from "../auth/protected.decorator";
import { PolicyCheck } from "../auth/policy-check.decorator";
import { DaemonScope } from "../auth/daemon-scope.decorator";
import type { TenantContextHeaders } from "../platform/tenant-context";
import { MediaService } from "./media.service";

@Controller("v1/media")
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Get("objects")
  @Protected()
  @PolicyCheck("read", "media")
  list(@DaemonScope() ctx: TenantContextHeaders, @Query("limit") limit?: string) {
    return this.media.list(ctx, limit ? Number(limit) : 50);
  }

  @Post("objects")
  @Protected()
  @PolicyCheck("write", "media")
  register(
    @DaemonScope() ctx: TenantContextHeaders,
    @Body()
    body: {
      uri: string;
      checksum?: string;
      mimeType?: string;
      sizeBytes?: number;
      metadata?: Record<string, unknown>;
    },
  ) {
    return this.media.register(ctx, body);
  }
}
