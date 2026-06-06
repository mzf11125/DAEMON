/** Generated from configs/governance/action-catalog.yaml — do not edit by hand. */

export interface CatalogAction {
  action: string;
  resource: string;
  effect: string;
}

export const FOUNDATION_ACTIONS: CatalogAction[] = [
  { action: "chat", resource: "customer-gpt", effect: "allow" },
  { action: "disseminate", resource: "disclosure", effect: "allow" },
  { action: "ingest", resource: "ingest-job", effect: "allow" },
  { action: "ingest", resource: "ingest-record", effect: "allow" },
  { action: "ingest", resource: "ingest-schedule", effect: "allow" },
  { action: "ingest", resource: "ingest-source", effect: "allow" },
  { action: "ingest", resource: "ingest-webhook", effect: "allow" },
  { action: "query", resource: "analytics", effect: "allow" },
  { action: "query", resource: "ontology-nl", effect: "allow" },
  { action: "query", resource: "ontology-search", effect: "allow" },
  { action: "read", resource: "agent-session", effect: "allow" },
  { action: "read", resource: "cbcc-report", effect: "allow" },
  { action: "read", resource: "ctr-report", effect: "allow" },
  { action: "read", resource: "darkweb-intel", effect: "allow" },
  { action: "read", resource: "data-health", effect: "allow" },
  { action: "read", resource: "entity", effect: "allow" },
  { action: "read", resource: "eval", effect: "allow" },
  { action: "read", resource: "function-invoke", effect: "allow" },
  { action: "read", resource: "lakehouse", effect: "allow" },
  { action: "read", resource: "media", effect: "allow" },
  { action: "read", resource: "netintel", effect: "allow" },
  { action: "read", resource: "ontology", effect: "allow" },
  { action: "read", resource: "ontology-pack", effect: "allow" },
  { action: "read", resource: "osint", effect: "allow" },
  { action: "read", resource: "sanctions-list", effect: "allow" },
  { action: "read", resource: "str-report", effect: "allow" },
  { action: "read", resource: "wallet", effect: "allow" },
  { action: "write", resource: "darkweb-intel", effect: "allow" },
  { action: "write", resource: "entity", effect: "allow" },
  { action: "write", resource: "eval", effect: "allow" },
  { action: "write", resource: "flag", effect: "allow" },
  { action: "write", resource: "label", effect: "allow" },
  { action: "write", resource: "lakehouse-export", effect: "allow" },
  { action: "write", resource: "malware-sample", effect: "allow" },
  { action: "write", resource: "media", effect: "allow" },
  { action: "write", resource: "pipeline", effect: "allow" },
  { action: "write", resource: "sanctions-list", effect: "allow" },
  { action: "write", resource: "typology", effect: "allow" },
];

