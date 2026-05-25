import { listServices, updateHealth } from '../store/tenants.js';

const POLL_INTERVAL_MS = parseInt(process.env['HEALTH_POLL_INTERVAL_MS'] ?? '30000', 10);

export function startHealthPoller(): void {
  console.log(`[health-poller] starting, interval=${POLL_INTERVAL_MS}ms`);
  setInterval(() => void pollAll(), POLL_INTERVAL_MS);
  // Run immediately on startup
  void pollAll();
}

async function pollAll(): Promise<void> {
  const services = listServices();
  await Promise.allSettled(
    services.map(async (svc) => {
      try {
        const res = await fetch(`${svc.url}/health`, {
          signal: AbortSignal.timeout(5000),
        });
        updateHealth(svc.id, res.ok);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        updateHealth(svc.id, false, msg);
      }
    })
  );
}
