import { readFileSync, existsSync } from "node:fs";
import { parse as parseYaml } from "yaml";
import { configsPath } from "../paths.js";

export interface TenantDefinition {
  id: string;
  displayName: string;
  kind?: string;
  enabledDomains: string[];
  quotas?: {
    maxEntities?: number;
    maxWritesPerMinute?: number;
  };
}

interface TenancyFile {
  tenants: TenantDefinition[];
}

export function tenancyConfigPath(): string {
  return configsPath("tenancy.yaml");
}

export class TenantRegistry {
  private readonly tenants = new Map<string, TenantDefinition>();

  constructor(definitions: TenantDefinition[]) {
    for (const t of definitions) {
      if (!t.id?.trim()) throw new Error("tenant id required");
      if (!t.enabledDomains?.length) {
        throw new Error(`tenant ${t.id} must have enabledDomains`);
      }
      this.tenants.set(t.id, t);
    }
  }

  static fromYamlFile(path = tenancyConfigPath()): TenantRegistry {
    if (!existsSync(path)) {
      throw new Error(`tenancy config not found: ${path}`);
    }
    const raw = parseYaml(readFileSync(path, "utf8")) as TenancyFile;
    return new TenantRegistry(raw.tenants ?? []);
  }

  get(tenantId: string): TenantDefinition | undefined {
    return this.tenants.get(tenantId);
  }

  require(tenantId: string): TenantDefinition {
    const t = this.get(tenantId);
    if (!t) throw new Error(`unknown tenant: ${tenantId}`);
    return t;
  }

  list(): TenantDefinition[] {
    return [...this.tenants.values()];
  }
}
