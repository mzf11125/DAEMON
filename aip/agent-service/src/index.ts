import { buildAgentServer } from './server.js';
import { buildDaemonBridgeServer } from './daemon-bridge.server.js';

const daemonBridge =
  process.env.AGENT_DAEMON_BRIDGE === 'true' ||
  process.env.AGENT_DAEMON_BRIDGE === '1';

if (daemonBridge) {
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
} else {

const config = {
  port: Number(process.env.AGENT_PORT ?? '3001'),
  modelConfig: {
    agentModel: process.env.AGENT_MODEL ?? 'openai:gpt-4o',
    temperature: Number(process.env.AGENT_TEMPERATURE ?? '0'),
  },
  dbHost: process.env.DB_HOST ?? 'localhost',
  dbPort: Number(process.env.DB_PORT ?? '5433'),
  dbUser: process.env.DB_USER ?? 'daemon',
  dbPassword: process.env.DB_PASSWORD ?? 'daemon_test',
  dbName: process.env.DB_NAME ?? 'daemon_test',
  redisHost: process.env.REDIS_HOST ?? 'localhost',
  redisPort: Number(process.env.REDIS_PORT ?? '6381'),
  schemaDir: process.env.SCHEMA_DIR ?? './schemas',
  defaultTenantId: process.env.TENANT_ID ?? 'default',
  monitoringEnabled: process.env.MONITORING_ENABLED === 'true',
  monitoringIntervalMs: Number(process.env.MONITORING_INTERVAL_MS ?? '300000'),
  controlPlaneUrl: process.env.CONTROL_PLANE_URL,
  controlPlaneSecret: process.env.CONTROL_PLANE_SECRET,
};

const app = await buildAgentServer(config);

try {
  await app.listen({ port: config.port, host: '0.0.0.0' });
  console.log(`Agent service running on port ${config.port}`);
  console.log(`Model: ${config.modelConfig.agentModel}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
}
