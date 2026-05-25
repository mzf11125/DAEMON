import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { registerService, listServices, removeService } from '../store/tenants.js';

const RegisterBody = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  url: z.string().url(),
  tags: z.array(z.string()).optional().default([]),
});

export const tenantRoutes: FastifyPluginAsync = async (app) => {
  // GET /tenants — list all registered services
  app.get('/', async () => ({ services: listServices() }));

  // POST /tenants — register a DAEMON service for health tracking
  app.post('/', async (req, reply) => {
    const parsed = RegisterBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'INVALID_BODY', details: parsed.error.flatten() });
    }
    registerService(parsed.data);
    return reply.status(201).send({ registered: parsed.data.id });
  });

  // DELETE /tenants/:id — deregister a service
  app.delete<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const removed = removeService(req.params.id);
    if (!removed) return reply.status(404).send({ error: 'SERVICE_NOT_FOUND' });
    return { deregistered: req.params.id };
  });
};
