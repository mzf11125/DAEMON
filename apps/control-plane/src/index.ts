import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { healthRoutes } from './routes/health.js';
import { tenantRoutes } from './routes/tenants.js';
import { logRoutes } from './routes/logs.js';
import { startHealthPoller } from './poller/health-poller.js';

const PORT = parseInt(process.env['PORT'] ?? '4000', 10);

export const app = Fastify({ logger: true });

await app.register(cors, { origin: true });
await app.register(websocket);
await app.register(healthRoutes, { prefix: '/health' });
await app.register(tenantRoutes, { prefix: '/tenants' });
await app.register(logRoutes, { prefix: '/logs' });

// Liveness probe — no auth required
app.get('/ping', async () => ({ status: 'ok', service: 'control-plane' }));

startHealthPoller();

try {
  await app.listen({ port: PORT, host: '0.0.0.0' });
  app.log.info(`control-plane listening on :${PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
