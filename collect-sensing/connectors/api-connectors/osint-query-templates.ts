/** Spec: collect-sensing/connectors/api-connectors/osint-query-templates.ts | BigPlan Phase 1.2 */
export const OSINT_QUERY_TEMPLATES = {
  entitySearch: (name: string, aliases: string[] = []): string =>
    `"${name}" ${aliases.map((a) => `OR "${a}"`).join(" ")} -site:facebook.com`.trim(),

  corporateRegistry: (companyName: string): string =>
    `site:ahu.go.id OR site:oss.go.id "${companyName}"`,

  adverseMedia: (entity: string): string =>
    `"${entity}" (penipuan OR fraud OR korupsi OR money laundering OR TPPU OR arrested)`,

  darkwebSignals: (entityName: string): string =>
    `"${entityName}" (darkweb OR "dark web" OR onion OR ".onion" OR tor OR illegal)`,

  dataLeakCheck: (domain: string): string =>
    `site:pastebin.com OR site:raidforums.com OR site:breachforums.com "${domain}"`,

  walletOsint: (address: string): string =>
    `"${address}" (scam OR hack OR stolen OR sanctioned OR OFAC OR blacklist)`,
} as const;

export type OsintQueryTemplateKey = keyof typeof OSINT_QUERY_TEMPLATES;

export function buildOsintQuery(template: OsintQueryTemplateKey, ...args: [string, ...string[]]): string {
  switch (template) {
    case "entitySearch":
      return OSINT_QUERY_TEMPLATES.entitySearch(args[0] ?? "", args.slice(1));
    case "corporateRegistry":
      return OSINT_QUERY_TEMPLATES.corporateRegistry(args[0] ?? "");
    case "adverseMedia":
      return OSINT_QUERY_TEMPLATES.adverseMedia(args[0] ?? "");
    case "darkwebSignals":
      return OSINT_QUERY_TEMPLATES.darkwebSignals(args[0] ?? "");
    case "dataLeakCheck":
      return OSINT_QUERY_TEMPLATES.dataLeakCheck(args[0] ?? "");
    case "walletOsint":
      return OSINT_QUERY_TEMPLATES.walletOsint(args[0] ?? "");
    default:
      throw new Error(`unknown OSINT template: ${String(template)}`);
  }
}
