import { buildDaemonBridgeServer } from './daemon-bridge.server.js';

const port = Number(process.env.AGENT_PORT ?? '3001');
const app = await buildDaemonBridgeServer();
try {
  await app.listen({ port, host: '0.0.0.0' });
  console.log(
    `Agent service (daemon-http-bridge) on :${port} → ${process.env.ONTOLOGY_SERVICE_URL ?? 'http://localhost:8081'}`,
  );
} catch (err) {
  console.error(err);
  process.exit(1);
}
