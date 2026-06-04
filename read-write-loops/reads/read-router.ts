import type { EntityId, OntologyId } from "@daemon/platform-types";
import { DaemonError, ErrorCodes, entityId, ontologyId } from "@daemon/platform-types";
import { globalRegistry } from "@daemon/ontology";
import type { EntityRecord, OntologyStore, OntologyScope } from "@daemon/context-ports";
import {
  DEFAULT_DOMAIN_ID,
  DEFAULT_TENANT_ID,
} from "@daemon/context-ports";
import type { EntityReadModelProjection } from "@daemon/ontology/projections/read-models/entity-read-model.js";
import type { EntityReadModel } from "@daemon/ontology/projections/read-models/entity-read-model.js";
import { compareReadParity } from "./read-parity.js";
import { globalReadParityMetrics } from "./read-parity-metrics.js";
import type { ReadParityReport } from "./read-parity.js";

export interface ReadRequest {
  tenantId?: string;
  domainId?: string;
  ontologyId: OntologyId;
  entityId: EntityId;
}

export interface ReadRouterOptions {
  /** When true (or DAEMON_READ_FROM_PROJECTION=1), prefer projection before store. */
  useProjection?: boolean;
  projection?: EntityReadModelProjection;
  /** When true (or DAEMON_READ_PARITY_CHECK=1), compare registry vs projection on each read. */
  parityCheck?: boolean;
  /** Override default global parity metrics (tests). */
  parityMetrics?: typeof globalReadParityMetrics;
  /** Optional hook when parity check runs (structured logs in gateway). */
  onParityReport?: (report: ReadParityReport) => void;
}

function readFromProjectionEnabled(options?: ReadRouterOptions): boolean {
  if (options?.useProjection === true) return true;
  if (options?.useProjection === false) return false;
  return process.env.DAEMON_READ_FROM_PROJECTION === "1";
}

function readParityCheckEnabled(options?: ReadRouterOptions): boolean {
  if (options?.parityCheck === true) return true;
  if (options?.parityCheck === false) return false;
  return process.env.DAEMON_READ_PARITY_CHECK === "1";
}

function viewToRecord(view: EntityReadModel): EntityRecord {
  return {
    tenantId: view.tenantId,
    domainId: view.domainId,
    ontologyId: ontologyId(view.ontologyId),
    entityId: entityId(view.entityId),
    entityType:
      typeof view.properties.entityType === "string"
        ? view.properties.entityType
        : "Party",
    properties: { ...view.properties },
    version: view.version,
    updatedAt: view.updatedAt,
  };
}

export class ReadRouter {
  private readonly useProjection: boolean;
  private readonly parityCheck: boolean;
  private readonly parityMetrics: typeof globalReadParityMetrics;

  constructor(
    private readonly store: OntologyStore = globalRegistry,
    private readonly options: ReadRouterOptions = {},
  ) {
    this.useProjection = readFromProjectionEnabled(options);
    this.parityCheck = readParityCheckEnabled(options);
    this.parityMetrics = options.parityMetrics ?? globalReadParityMetrics;
  }

  route(req: ReadRequest): EntityRecord {
    const scope: OntologyScope = {
      tenantId: req.tenantId ?? DEFAULT_TENANT_ID,
      domainId: req.domainId ?? DEFAULT_DOMAIN_ID,
    };

    const registryRecord = this.store.get(scope, req.ontologyId, req.entityId);
    const projectionRecord = this.readFromProjection(scope, req);

    if (this.parityCheck) {
      const report = compareReadParity(registryRecord, projectionRecord, {
        tenantId: scope.tenantId,
        domainId: scope.domainId,
        ontologyId: String(req.ontologyId),
        entityId: String(req.entityId),
      });
      this.parityMetrics.record(report);
      this.options.onParityReport?.(report);
    }

    if (this.useProjection && projectionRecord) {
      return projectionRecord;
    }

    if (!registryRecord) {
      throw new DaemonError(
        ErrorCodes.NOT_FOUND,
        `not found: ${scope.tenantId}/${scope.domainId}/${req.ontologyId}/${req.entityId}`,
        404,
      );
    }
    return registryRecord;
  }

  private readFromProjection(
    scope: OntologyScope,
    req: ReadRequest,
  ): EntityRecord | undefined {
    if (!this.options.projection) return undefined;
    const view = this.options.projection.get(
      scope.tenantId,
      scope.domainId,
      String(req.ontologyId),
      String(req.entityId),
    );
    return view ? viewToRecord(view) : undefined;
  }
}
