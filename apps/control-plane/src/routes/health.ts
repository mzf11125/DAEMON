import type { FastifyPluginAsync } from 'fastify';
import { getTenantStatuses } from '../store/tenants.js';

export const healthRoutes: FastifyPluginAsync = async (app) => {
  // GET /health — aggregate health of all registered DAEMON services
  app.get('/', async (_req, reply) => {
    const statuses = getTenantStatuses();
    const allHealthy = statuses.every((s) => s.healthy);
    return reply.status(allHealthy ? 200 : 207).send({
      healthy: allHealthy,
      services: statuses,
      checkedAt: new Date().toISOString(),
    });
  });

  // GET /health/:serviceId — individual service health
  app.get<{ Params: { serviceId: string } }>('/:serviceId', async (req, reply) => {
    const statuses = getTenantStatuses();
    const svc = statuses.find((s) => s.id === req.params.serviceId);
    if (!svc) return reply.status(404).send({ error: 'SERVICE_NOT_FOUND' });
    return reply.status(svc.healthy ? 200 : 503).send(svc);
  });
};
