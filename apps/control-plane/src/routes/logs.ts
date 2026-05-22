import type { FastifyPluginAsync } from 'fastify';
import { logBuffer, pushLog, type LogEntry } from '../store/logs.js';

export const logRoutes: FastifyPluginAsync = async (app) => {
  // POST /logs — agent-service and Go services push structured logs here
  app.post<{ Body: LogEntry }>('/', async (req, reply) => {
    pushLog(req.body);
    return reply.status(202).send({ accepted: true });
  });

  // GET /logs — return last N log entries
  app.get<{ Querystring: { limit?: string } }>('/', async (req) => {
    const limit = Math.min(parseInt(req.query.limit ?? '100', 10), 500);
    return { logs: logBuffer.slice(-limit) };
  });

  // WebSocket /logs/stream — realtime log streaming to console-web
  app.get('/stream', { websocket: true }, (socket) => {
    const interval = setInterval(() => {
      const latest = logBuffer.at(-1);
      if (latest) socket.send(JSON.stringify(latest));
    }, 1000);
    socket.on('close', () => clearInterval(interval));
  });
};
