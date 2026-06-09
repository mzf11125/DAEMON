import type { DaemonSession, EntityId, OntologyId } from "@daemon/platform-types";
import { globalRegistry } from "@daemon/ontology";
import type { OntologyStore, OntologyScope } from "@daemon/context-ports";
import {
  DEFAULT_DOMAIN_ID,
  DEFAULT_TENANT_ID,
} from "@daemon/context-ports";
import { MutationValidator } from "./mutation-validator.js";

export interface WriteCommand {
  session: DaemonSession;
  tenantId?: string;
  domainId?: string;
  ontologyId: OntologyId;
  entityId: EntityId;
  patch: Record<string, unknown>;
  idempotencyKey?: string;
}

export interface WriteResult {
  writeId: string;
  status: "committed";
  version: number;
}

export class CommandGateway {
  private readonly validator = new MutationValidator();
  private readonly idempotency = new Map<string, WriteResult>();

  constructor(private readonly store: OntologyStore = globalRegistry) {}

  submit(cmd: WriteCommand): WriteResult {
    if (cmd.idempotencyKey) {
      const cached = this.idempotency.get(cmd.idempotencyKey);
      if (cached) return cached;
    }
    this.validator.validate(cmd);
    const scope: OntologyScope = {
      tenantId: cmd.tenantId ?? DEFAULT_TENANT_ID,
      domainId: cmd.domainId ?? DEFAULT_DOMAIN_ID,
    };
    const updated = this.store.patch({
      scope,
      ontologyId: cmd.ontologyId,
      entityId: cmd.entityId,
      patch: cmd.patch,
    });
    const result: WriteResult = {
      writeId: `w-${Date.now()}`,
      status: "committed",
      version: updated.version,
    };
    if (cmd.idempotencyKey) {
      this.idempotency.set(cmd.idempotencyKey, result);
    }
    return result;
  }
}
