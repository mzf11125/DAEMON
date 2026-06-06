/**
 * DAEMON Provenance REST Handler
 *
 * Handles all /v1/provenance/* routes for the REST server.
 * Follows the vanilla Node.js HTTP pattern used throughout server.ts.
 *
 * Initialization: lazy — PostgresClient is created on first request using
 * DAEMON_POSTGRES_URL environment variable. This avoids blocking server startup
 * when Postgres is not yet available.
 *
 * Routes:
 *   GET  /v1/provenance/entity
 *        ?tenantId=&domainId=&entityId=
 *        → ProvenanceVerifier.checkEntityProvenance()
 *
 *   POST /v1/provenance/forensic
 *        body: { tenantId, domainId, entityId, epochId? }
 *        → ProvenanceVerifier.checkForensicAbsence()
 *
 *   GET  /v1/provenance/epoch/:epochId
 *        → EpochManager.getEpoch()
 *
 *   POST /v1/provenance/epoch/close   [operator only]
 *        body: { epochId }
 *        header: X-Daemon-Role: operator
 *        → EpochManager.closeEpoch()
 *
 *   GET  /v1/provenance/chain
 *        ?tenantId=&domainId=&fromEpochId=
 *        → EpochManager.verifyEpochChain()
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import { PostgresClient } from "@daemon/data-platform/operational-store";
import { EpochManager } from "@daemon/data-platform/provenance/epoch-manager";
import { ProvenanceVerifier } from "@daemon/data-platform/provenance/verifier";
import { DaemonError, ErrorCodes } from "@daemon/platform-types";

// ─── Request helpers (shared with server.ts) ─────────────────────────────────

function readJsonBody<T>(req: IncomingMessage): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8").trim();
      if (!raw) return resolve(undefined);
      try {
        resolve(JSON.parse(raw) as T);
      } catch {
        reject(new DaemonError(ErrorCodes.VALIDATION, "invalid JSON body", 400));
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json",
    "content-length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

// ─── ProvenanceHandler ───────────────────────────────────────────────────────

export class ProvenanceHandler {
  private _pg: PostgresClient | null = null;
  private _epochManager: EpochManager | null = null;
  private _verifier: ProvenanceVerifier | null = null;

  /**
   * Lazy-initialize services on first request.
   * Throws if DAEMON_POSTGRES_URL is not set.
   */
  private getServices(): { epochManager: EpochManager; verifier: ProvenanceVerifier } {
    if (!this._pg) {
      const url = process.env.DAEMON_POSTGRES_URL;
      if (!url) {
        throw new DaemonError(
          ErrorCodes.INTERNAL,
          "DAEMON_POSTGRES_URL is required for provenance endpoints",
          503,
        );
      }
      this._pg = new PostgresClient({ connectionString: url });
      this._epochManager = new EpochManager(this._pg);
      this._verifier = new ProvenanceVerifier(this._epochManager);
    }
    return {
      epochManager: this._epochManager!,
      verifier: this._verifier!,
    };
  }

  /**
   * Attempt to handle the request.
   * Returns true if the route was matched and handled, false otherwise.
   * The caller in server.ts should return immediately on true.
   */
  async handleRequest(
    method: string,
    pathname: string,
    url: URL,
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<boolean> {
    // ── GET /v1/provenance/entity ──────────────────────────────────────────
    if (method === "GET" && pathname === "/v1/provenance/entity") {
      const tenantId = url.searchParams.get("tenantId");
      const domainId = url.searchParams.get("domainId");
      const entityId = url.searchParams.get("entityId");

      if (!tenantId || !domainId || !entityId) {
        throw new DaemonError(
          ErrorCodes.VALIDATION,
          "tenantId, domainId, and entityId query parameters are required",
          400,
        );
      }

      const { verifier } = this.getServices();
      const result = await verifier.checkEntityProvenance(tenantId, domainId, entityId);
      sendJson(res, 200, result);
      return true;
    }

    // ── POST /v1/provenance/forensic ──────────────────────────────────────
    if (method === "POST" && pathname === "/v1/provenance/forensic") {
      const body = await readJsonBody<{
        tenantId: string;
        domainId: string;
        entityId: string;
        epochId?: number;
      }>(req);

      if (!body?.tenantId || !body.domainId || !body.entityId) {
        throw new DaemonError(
          ErrorCodes.VALIDATION,
          "tenantId, domainId, and entityId are required in request body",
          400,
        );
      }

      const { verifier } = this.getServices();
      const result = await verifier.checkForensicAbsence(
        body.tenantId,
        body.domainId,
        body.entityId,
        body.epochId,
      );
      sendJson(res, 200, result);
      return true;
    }

    // ── GET /v1/provenance/epoch/:epochId ──────────────────────────────────
    const epochMatch = pathname.match(/^\/v1\/provenance\/epoch\/(\d+)$/);
    if (method === "GET" && epochMatch) {
      const epochId = parseInt(epochMatch[1]!, 10);
      const { epochManager } = this.getServices();
      const epoch = await epochManager.getEpoch(epochId);

      if (!epoch) {
        throw new DaemonError(ErrorCodes.NOT_FOUND, `epoch ${epochId} not found`, 404);
      }

      sendJson(res, 200, epoch);
      return true;
    }

    // ── POST /v1/provenance/epoch/close  [operator only] ──────────────────
    if (method === "POST" && pathname === "/v1/provenance/epoch/close") {
      // Authorization: require X-Daemon-Role: operator header
      const role = req.headers["x-daemon-role"];
      if (role !== "operator") {
        throw new DaemonError(
          ErrorCodes.FORBIDDEN,
          "closing an epoch requires operator role (X-Daemon-Role: operator)",
          403,
        );
      }

      const body = await readJsonBody<{ epochId: number }>(req);
      if (!body || typeof body.epochId !== "number") {
        throw new DaemonError(ErrorCodes.VALIDATION, "epochId (number) is required", 400);
      }

      const { epochManager } = this.getServices();
      const result = await epochManager.closeEpoch(body.epochId);
      sendJson(res, 200, result);
      return true;
    }

    // ── GET /v1/provenance/chain ──────────────────────────────────────────
    if (method === "GET" && pathname === "/v1/provenance/chain") {
      const tenantId = url.searchParams.get("tenantId");
      const domainId = url.searchParams.get("domainId");
      const fromEpochIdRaw = url.searchParams.get("fromEpochId");

      if (!tenantId || !domainId || !fromEpochIdRaw) {
        throw new DaemonError(
          ErrorCodes.VALIDATION,
          "tenantId, domainId, and fromEpochId query parameters are required",
          400,
        );
      }

      const fromEpochId = parseInt(fromEpochIdRaw, 10);
      if (!Number.isFinite(fromEpochId)) {
        throw new DaemonError(ErrorCodes.VALIDATION, "fromEpochId must be a valid integer", 400);
      }

      const { epochManager } = this.getServices();
      const result = await epochManager.verifyEpochChain(tenantId, domainId, fromEpochId);
      sendJson(res, 200, {
        ...result,
        message: result.valid
          ? "epoch chain is intact"
          : `chain broken at epoch ${result.brokenAt}`,
      });
      return true;
    }

    // Not a provenance route
    return false;
  }

  /**
   * Gracefully close the PostgresClient on shutdown.
   */
  async close(): Promise<void> {
    if (this._pg) await this._pg.close();
  }
}
