export interface ServiceRegistration {
  id: string;
  name: string;
  url: string;
  tags: string[];
}

export interface TenantStatus extends ServiceRegistration {
  healthy: boolean;
  lastCheckedAt: string;
  lastError?: string;
}

// In-memory store — replace with Redis persistence in Sprint 2
const registry = new Map<string, TenantStatus>();

// Bootstrap: register all DAEMON Go services from env on startup
const DAEMON_SERVICES: ServiceRegistration[] = [
  { id: 'platform-api',      name: 'Platform API',      url: process.env['DAEMON_PLATFORM_API_URL']      ?? 'http://localhost:8080', tags: ['core'] },
  { id: 'ontology-service',  name: 'Ontology Service',  url: process.env['DAEMON_ONTOLOGY_SERVICE_URL']  ?? 'http://localhost:8081', tags: ['core', 'ontology'] },
  { id: 'ingestion-service', name: 'Ingestion Service', url: process.env['DAEMON_INGESTION_SERVICE_URL'] ?? 'http://localhost:8082', tags: ['data'] },
  { id: 'rules-engine',      name: 'Rules Engine',      url: process.env['DAEMON_RULES_ENGINE_URL']      ?? 'http://localhost:8083', tags: ['rules'] },
  { id: 'case-service',      name: 'Case Service',      url: process.env['DAEMON_CASE_SERVICE_URL']      ?? 'http://localhost:8084', tags: ['cases'] },
];

for (const svc of DAEMON_SERVICES) {
  registry.set(svc.id, { ...svc, healthy: false, lastCheckedAt: new Date().toISOString() });
}

export function registerService(svc: ServiceRegistration): void {
  registry.set(svc.id, { ...svc, healthy: false, lastCheckedAt: new Date().toISOString() });
}

export function listServices(): TenantStatus[] {
  return Array.from(registry.values());
}

export function getTenantStatuses(): TenantStatus[] {
  return listServices();
}

export function updateHealth(id: string, healthy: boolean, error?: string): void {
  const existing = registry.get(id);
  if (!existing) return;
  registry.set(id, {
    ...existing,
    healthy,
    lastCheckedAt: new Date().toISOString(),
    lastError: error,
  });
}

export function removeService(id: string): boolean {
  return registry.delete(id);
}
