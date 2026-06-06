/**
 * Unit tests for EpochScheduler.
 * All DB and EpochManager interactions are mocked — no live DB required.
 */
import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { EpochScheduler } from "./epoch-scheduler.js";
import type { SchedulerLogger, OpenEpochScope } from "./epoch-scheduler.js";

// ─── Mock helpers ─────────────────────────────────────────────────────────────

function makeLogger(): SchedulerLogger & {
  infoCalls: Array<{ msg: string; ctx?: Record<string, unknown> }>;
  errorCalls: Array<{ msg: string; ctx?: Record<string, unknown> }>;
} {
  const infoCalls: Array<{ msg: string; ctx?: Record<string, unknown> }> = [];
  const errorCalls: Array<{ msg: string; ctx?: Record<string, unknown> }> = [];
  return {
    infoCalls,
    errorCalls,
    info(msg, ctx) { infoCalls.push({ msg, ctx }); },
    error(msg, ctx) { errorCalls.push({ msg, ctx }); },
  };
}

function makeEpochManager(overrides: Partial<{
  closeEpoch: (epochId: number) => Promise<{ epochId: number; epochRoot: string; entityCount: number }>;
  openEpoch: (tenantId: string, domainId: string) => Promise<number>;
}> = {}) {
  return {
    closeEpoch: overrides.closeEpoch ?? (async (epochId) => ({
      epochId,
      epochRoot: "a".repeat(64),
      entityCount: 3,
    })),
    openEpoch: overrides.openEpoch ?? (async (_tenantId, _domainId) => 99),
  } as unknown as import("./epoch-manager.js").EpochManager;
}

function makePg(openEpochs: OpenEpochScope[] = []) {
  return {
    query: async () => ({
      rows: openEpochs.map((s) => ({
        epoch_id: String(s.epochId),
        tenant_id: s.tenantId,
        domain_id: s.domainId,
      })),
    }),
  } as unknown as import("../operational-store/postgres-client.js").PostgresClient;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("EpochScheduler.fromEnv", () => {
  it("returns null when DAEMON_EPOCH_INTERVAL_MS is not set", () => {
    const result = EpochScheduler.fromEnv(makeEpochManager(), makePg(), {});
    assert.equal(result, null);
  });

  it("returns null when interval is 0", () => {
    const result = EpochScheduler.fromEnv(
      makeEpochManager(), makePg(),
      { DAEMON_EPOCH_INTERVAL_MS: "0" },
    );
    assert.equal(result, null);
  });

  it("returns null for negative interval", () => {
    const result = EpochScheduler.fromEnv(
      makeEpochManager(), makePg(),
      { DAEMON_EPOCH_INTERVAL_MS: "-100" },
    );
    assert.equal(result, null);
  });

  it("returns EpochScheduler when valid interval is set", () => {
    const scheduler = EpochScheduler.fromEnv(
      makeEpochManager(), makePg(),
      { DAEMON_EPOCH_INTERVAL_MS: "60000" },
    );
    assert.ok(scheduler instanceof EpochScheduler);
    assert.equal(scheduler.isRunning, false);
  });
});

describe("EpochScheduler lifecycle", () => {
  it("starts and stops correctly", () => {
    const scheduler = new EpochScheduler(makeEpochManager(), makePg(), { intervalMs: 99999 });
    assert.equal(scheduler.isRunning, false);
    scheduler.start();
    assert.equal(scheduler.isRunning, true);
    scheduler.stop();
    assert.equal(scheduler.isRunning, false);
  });

  it("start() is idempotent — multiple calls do not create multiple timers", () => {
    const logger = makeLogger();
    const scheduler = new EpochScheduler(makeEpochManager(), makePg(), {
      intervalMs: 99999,
      logger,
    });
    scheduler.start();
    scheduler.start(); // second call should be a no-op
    scheduler.stop();

    const startLogs = logger.infoCalls.filter((c) => c.msg === "epoch_scheduler_start");
    assert.equal(startLogs.length, 1, "should only log start once");
  });

  it("stop() is idempotent — multiple calls are safe", () => {
    const scheduler = new EpochScheduler(makeEpochManager(), makePg(), { intervalMs: 99999 });
    scheduler.stop(); // stop before start — should not throw
    scheduler.start();
    scheduler.stop();
    scheduler.stop(); // second stop — should not throw
    assert.equal(scheduler.isRunning, false);
  });
});

describe("EpochScheduler._tick()", () => {
  it("does nothing when there are no open epochs", async () => {
    const logger = makeLogger();
    const closeEpoch = mock.fn(async (_id: number) => ({
      epochId: _id, epochRoot: "a".repeat(64), entityCount: 0,
    }));
    const em = makeEpochManager({ closeEpoch });
    const scheduler = new EpochScheduler(em, makePg([]), { intervalMs: 1000, logger });

    await scheduler._tick();

    assert.equal(closeEpoch.mock.calls.length, 0, "closeEpoch should not be called");
    const noopLog = logger.infoCalls.find((c) => c.msg === "epoch_scheduler_tick_noop");
    assert.ok(noopLog, "should log noop");
  });

  it("closes and re-opens each open epoch on tick", async () => {
    const logger = makeLogger();
    const closedEpochs: number[] = [];
    const openedScopes: string[] = [];

    const em = makeEpochManager({
      closeEpoch: async (epochId) => {
        closedEpochs.push(epochId);
        return { epochId, epochRoot: "b".repeat(64), entityCount: 5 };
      },
      openEpoch: async (tenantId, domainId) => {
        openedScopes.push(`${tenantId}:${domainId}`);
        return 100;
      },
    });

    const openEpochs: OpenEpochScope[] = [
      { tenantId: "tenant-a", domainId: "domain-x", epochId: 1 },
      { tenantId: "tenant-b", domainId: "domain-y", epochId: 2 },
    ];

    const scheduler = new EpochScheduler(em, makePg(openEpochs), { intervalMs: 1000, logger });
    await scheduler._tick();

    assert.deepEqual(closedEpochs, [1, 2], "should close both epochs");
    assert.deepEqual(openedScopes, ["tenant-a:domain-x", "tenant-b:domain-y"], "should open new epoch for both scopes");
    assert.equal(logger.errorCalls.length, 0, "should have no errors");
  });

  it("continues to next epoch when one epoch fails to close", async () => {
    const logger = makeLogger();
    const closedEpochs: number[] = [];

    const em = makeEpochManager({
      closeEpoch: async (epochId) => {
        if (epochId === 1) throw new Error("DB connection lost");
        closedEpochs.push(epochId);
        return { epochId, epochRoot: "c".repeat(64), entityCount: 2 };
      },
    });

    const openEpochs: OpenEpochScope[] = [
      { tenantId: "tenant-a", domainId: "domain-x", epochId: 1 }, // will fail
      { tenantId: "tenant-b", domainId: "domain-y", epochId: 2 }, // should succeed
    ];

    const scheduler = new EpochScheduler(em, makePg(openEpochs), { intervalMs: 1000, logger });
    await scheduler._tick();

    assert.deepEqual(closedEpochs, [2], "should still close epoch 2 despite epoch 1 failing");
    assert.equal(logger.errorCalls.length, 1, "should log one error");
    assert.equal(logger.errorCalls[0]!.msg, "epoch_rotate_error");
  });

  it("skips tick when previous tick is still running", async () => {
    const logger = makeLogger();
    let resolveFirstTick!: () => void;
    const firstTickPromise = new Promise<void>((r) => { resolveFirstTick = r; });

    const em = makeEpochManager({
      closeEpoch: async (epochId) => {
        await firstTickPromise;
        return { epochId, epochRoot: "d".repeat(64), entityCount: 0 };
      },
    });

    const openEpochs: OpenEpochScope[] = [
      { tenantId: "t", domainId: "d", epochId: 1 },
    ];

    const scheduler = new EpochScheduler(em, makePg(openEpochs), { intervalMs: 1000, logger });

    // Start first tick but don't await it yet
    const tick1 = scheduler._tick();
    // Start second tick immediately — should be skipped
    const tick2 = scheduler._tick();

    // Resolve the first tick
    resolveFirstTick();
    await Promise.all([tick1, tick2]);

    const skippedLog = logger.infoCalls.find((c) => c.msg === "epoch_scheduler_tick_skipped");
    assert.ok(skippedLog, "should log that second tick was skipped");
  });
});
