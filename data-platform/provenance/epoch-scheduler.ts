/**
 * DAEMON Epoch Scheduler
 *
 * Auto-closes and re-opens epochs on a configurable interval.
 * This is an optional production feature — Phase 1 uses manual epoch close.
 *
 * Activation: set DAEMON_EPOCH_INTERVAL_MS in environment (e.g. 300000 = 5 min).
 * If the env var is absent or 0, EpochScheduler.fromEnv() returns null and
 * no scheduling is active.
 *
 * Design:
 *   - On each tick, query ALL open epochs across all (tenantId, domainId) scopes
 *   - For each open epoch: closeEpoch() → openEpoch() → log
 *   - Errors per-epoch are caught and logged individually (non-fatal)
 *   - The scheduler does NOT run concurrently: if a tick takes longer than
 *     intervalMs, the next tick is skipped (setInterval semantics)
 */

import type { PostgresClient } from "../operational-store/postgres-client.js";
import { EpochManager } from "./epoch-manager.js";

export interface SchedulerOptions {
  /** Interval in milliseconds between epoch rotation ticks. */
  intervalMs: number;
  /** Optional logger. Defaults to console. */
  logger?: SchedulerLogger;
}

export interface SchedulerLogger {
  info(msg: string, ctx?: Record<string, unknown>): void;
  error(msg: string, ctx?: Record<string, unknown>): void;
}

const defaultLogger: SchedulerLogger = {
  info: (msg, ctx) => console.log(JSON.stringify({ level: "info", msg, ...ctx })),
  error: (msg, ctx) => console.error(JSON.stringify({ level: "error", msg, ...ctx })),
};

/**
 * Active scope that has an open epoch.
 */
export interface OpenEpochScope {
  tenantId: string;
  domainId: string;
  epochId: number;
}

export class EpochScheduler {
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;
  private readonly logger: SchedulerLogger;

  constructor(
    private readonly epochManager: EpochManager,
    private readonly pg: PostgresClient,
    private readonly options: SchedulerOptions,
  ) {
    this.logger = options.logger ?? defaultLogger;
  }

  /**
   * Create an EpochScheduler from environment variables.
   * Returns null if DAEMON_EPOCH_INTERVAL_MS is not set or is 0.
   *
   * @param epochManager - The shared EpochManager instance
   * @param pg           - PostgresClient for querying open epochs
   * @param env          - Process environment (defaults to process.env)
   */
  static fromEnv(
    epochManager: EpochManager,
    pg: PostgresClient,
    env: NodeJS.ProcessEnv = process.env,
    logger?: SchedulerLogger,
  ): EpochScheduler | null {
    const raw = env.DAEMON_EPOCH_INTERVAL_MS;
    const ms = raw ? Number(raw) : 0;
    if (!ms || !Number.isFinite(ms) || ms <= 0) return null;
    return new EpochScheduler(epochManager, pg, { intervalMs: ms, logger });
  }

  /**
   * Start the scheduler. Safe to call multiple times — subsequent calls are no-ops.
   */
  start(): void {
    if (this.timer !== null) return;
    this.logger.info("epoch_scheduler_start", { intervalMs: this.options.intervalMs });
    this.timer = setInterval(() => {
      this._tick().catch((err) => {
        this.logger.error("epoch_scheduler_tick_error", {
          error: err instanceof Error ? err.message : String(err),
        });
      });
    }, this.options.intervalMs);
    // Prevent the timer from blocking Node.js process exit
    if (this.timer.unref) this.timer.unref();
  }

  /**
   * Stop the scheduler. Safe to call multiple times.
   */
  stop(): void {
    if (this.timer === null) return;
    clearInterval(this.timer);
    this.timer = null;
    this.logger.info("epoch_scheduler_stop", {});
  }

  /** Whether the scheduler is currently running. */
  get isRunning(): boolean {
    return this.timer !== null;
  }

  // ─── Internal ────────────────────────────────────────────────────────────

  /**
   * One scheduler tick: find all open epochs, rotate each one.
   * Errors per-epoch are caught individually so one failure doesn't block others.
   */
  async _tick(): Promise<void> {
    if (this.running) {
      this.logger.info("epoch_scheduler_tick_skipped", { reason: "previous tick still running" });
      return;
    }
    this.running = true;
    try {
      const openEpochs = await this._listOpenEpochs();
      if (openEpochs.length === 0) {
        this.logger.info("epoch_scheduler_tick_noop", { reason: "no open epochs" });
        return;
      }

      this.logger.info("epoch_scheduler_tick_start", { epochCount: openEpochs.length });

      for (const scope of openEpochs) {
        await this._rotateEpoch(scope);
      }

      this.logger.info("epoch_scheduler_tick_done", { epochCount: openEpochs.length });
    } finally {
      this.running = false;
    }
  }

  /**
   * Rotate one epoch: close it and open a new one for the same scope.
   */
  private async _rotateEpoch(scope: OpenEpochScope): Promise<void> {
    const { tenantId, domainId, epochId } = scope;
    try {
      const result = await this.epochManager.closeEpoch(epochId);
      this.logger.info("epoch_closed", {
        tenantId,
        domainId,
        epochId,
        epochRoot: result.epochRoot,
        entityCount: result.entityCount,
      });

      const newEpochId = await this.epochManager.openEpoch(tenantId, domainId);
      this.logger.info("epoch_opened", { tenantId, domainId, epochId: newEpochId });
    } catch (err) {
      this.logger.error("epoch_rotate_error", {
        tenantId,
        domainId,
        epochId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  /**
   * Query PostgreSQL for all currently open epochs.
   * Returns an array of scopes with their (tenantId, domainId, epochId).
   */
  private async _listOpenEpochs(): Promise<OpenEpochScope[]> {
    const result = await this.pg.query<{
      epoch_id: string;
      tenant_id: string;
      domain_id: string;
    }>(
      `SELECT epoch_id, tenant_id, domain_id
       FROM daemon_epoch_registry
       WHERE closed_at IS NULL
       ORDER BY epoch_id ASC`,
    );
    return result.rows.map((row) => ({
      epochId: parseInt(row.epoch_id, 10),
      tenantId: row.tenant_id,
      domainId: row.domain_id,
    }));
  }
}
