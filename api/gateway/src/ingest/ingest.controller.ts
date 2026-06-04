import { Body, Controller, Get, Headers, Param, Post } from "@nestjs/common";
import { IngestService, type IngestRecord } from "./ingest.service";
import { IngestPipelineService } from "./ingest-pipeline.service";
import { Protected } from "../auth/protected.decorator";
import { PolicyCheck } from "../auth/policy-check.decorator";
import { TenantContextService } from "../platform/tenant-context";

interface StartJobBody {
  sourceId: string;
}

interface IngestRecordsBody {
  sourceId?: string;
  records?: IngestRecord[];
  ontologyId?: string;
  entityId?: string;
  entityType?: string;
  properties?: Record<string, unknown>;
  payload?: Record<string, unknown>;
}

function normalizeIngestRecords(body: IngestRecordsBody): IngestRecord[] {
  if (body.records?.length) {
    return body.records;
  }
  if (body.ontologyId) {
    return [
      {
        ontologyId: body.ontologyId,
        entityId: body.entityId,
        entityType: body.entityType,
        properties: body.properties ?? body.payload ?? {},
      },
    ];
  }
  return [];
}

@Controller("v1/ingest")
export class IngestController {
  constructor(
    private readonly ingest: IngestService,
    private readonly pipeline: IngestPipelineService,
    private readonly tenantContext: TenantContextService,
  ) {}

  @Post("jobs")
  @Protected()
  @PolicyCheck("ingest", "ingest-job")
  startJob(@Body() body: StartJobBody) {
    return this.ingest.startJob(body.sourceId);
  }

  @Get("jobs/:id")
  getJob(@Param("id") id: string) {
    return this.ingest.getJob(id);
  }

  @Post("sources/:sourceId/run")
  @Protected()
  @PolicyCheck("ingest", "ingest-source")
  runSource(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param("sourceId") sourceId: string,
  ) {
    const ctx = this.tenantContext.resolve(headers);
    return this.pipeline.runSource(ctx, sourceId);
  }

  @Post("records")
  @Protected()
  @PolicyCheck("ingest", "ingest-record")
  ingestRecords(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Body() body: IngestRecordsBody,
  ) {
    const ctx = this.tenantContext.resolve(headers);
    const records = normalizeIngestRecords(body);
    return this.ingest.ingestRecords(ctx, body.sourceId ?? "gateway", records);
  }
}
