import { Module } from "@nestjs/common";
import { IngestController } from "./ingest.controller";
import { IngestService } from "./ingest.service";
import { IngestPipelineService } from "./ingest-pipeline.service";
import { DaemonRuntime } from "../platform/daemon-runtime";

@Module({
  controllers: [IngestController],
  providers: [
    {
      provide: IngestService,
      useFactory: (runtime: DaemonRuntime) =>
        IngestService.create(runtime, process.env),
      inject: [DaemonRuntime],
    },
    {
      provide: IngestPipelineService,
      useFactory: (ingest: IngestService) =>
        IngestPipelineService.create(ingest, process.env),
      inject: [IngestService],
    },
  ],
})
export class IngestModule {}
