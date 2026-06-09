/** BigPlan Phase 4.3 | Sanctions Screener — DTTOT + UN + OFAC + EU CSL */

export type SanctionsList =
  | "DTTOT"
  | "UN_SC"
  | "OFAC_SDN"
  | "EU_CSL"
  | "PPATK_AML";

export interface SanctionEntry {
  listId: SanctionsList;
  entryId: string;
  names: string[];
  aliases: string[];
  dateOfBirth?: string;
  nationality?: string;
  identifiers?: {
    type: "PASSPORT" | "NATIONAL_ID" | "TAX_ID" | "OTHER";
    value: string;
    country?: string;
  }[];
  listedDate: string;
  program?: string;
  remarks?: string;
}

export interface ScreeningResult {
  entityName: string;
  entityId?: string;
  screened: boolean;
  hits: {
    list: SanctionsList;
    entryId: string;
    matchedName: string;
    similarity: number;
    matchType: "EXACT" | "FUZZY" | "ALIAS";
    sanctionEntry: SanctionEntry;
  }[];
  screenedAt: string;
  listsChecked: SanctionsList[];
}

export interface SanctionsScreenerConfig {
  fuzzyThreshold: number;
  enabledLists: SanctionsList[];
  dataSourcePaths: Partial<Record<SanctionsList, string>>;
}

export class SanctionsScreener {
  private readonly entries: Map<SanctionsList, SanctionEntry[]> = new Map();
  private readonly config: SanctionsScreenerConfig;

  constructor(config: Partial<SanctionsScreenerConfig> = {}) {
    this.config = {
      fuzzyThreshold: config.fuzzyThreshold ?? 0.92,
      enabledLists: config.enabledLists ?? ["DTTOT", "UN_SC", "OFAC_SDN"],
      dataSourcePaths: config.dataSourcePaths ?? {},
    };
  }

  async loadList(listId: SanctionsList, entries: SanctionEntry[]): Promise<void> {
    this.entries.set(listId, entries);
  }

  async screen(entityName: string, entityId?: string): Promise<ScreeningResult> {
    const hits: ScreeningResult["hits"] = [];
    const screenedAt = new Date().toISOString();
    const listsChecked: SanctionsList[] = [];

    for (const listId of this.config.enabledLists) {
      const listEntries = this.entries.get(listId) ?? [];
      listsChecked.push(listId);

      for (const entry of listEntries) {
        const allNames = [...entry.names, ...entry.aliases];

        for (const sanctionName of allNames) {
          const similarity = this.jaroWinkler(
            this.normalizeName(entityName),
            this.normalizeName(sanctionName),
          );

          if (similarity >= this.config.fuzzyThreshold) {
            hits.push({
              list: listId,
              entryId: entry.entryId,
              matchedName: sanctionName,
              similarity,
              matchType:
                similarity === 1.0
                  ? "EXACT"
                  : entry.aliases.includes(sanctionName)
                    ? "ALIAS"
                    : "FUZZY",
              sanctionEntry: entry,
            });
            break;
          }
        }
      }
    }

    return {
      entityName,
      entityId,
      screened: true,
      hits,
      screenedAt,
      listsChecked,
    };
  }

  async screenBatch(
    entities: { name: string; entityId?: string }[],
  ): Promise<ScreeningResult[]> {
    return Promise.all(entities.map((e) => this.screen(e.name, e.entityId)));
  }

  private normalizeName(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, " ")
      .replace(/[^a-z0-9\s]/g, "");
  }

  private jaroWinkler(s1: string, s2: string): number {
    if (s1 === s2) return 1.0;
    if (!s1.length || !s2.length) return 0.0;

    const matchWindow = Math.floor(Math.max(s1.length, s2.length) / 2) - 1;
    const s1Matches = new Array<boolean>(s1.length).fill(false);
    const s2Matches = new Array<boolean>(s2.length).fill(false);
    let matches = 0;
    let transpositions = 0;

    for (let i = 0; i < s1.length; i++) {
      const start = Math.max(0, i - matchWindow);
      const end = Math.min(i + matchWindow + 1, s2.length);
      for (let j = start; j < end; j++) {
        if (s2Matches[j] || s1[i] !== s2[j]) continue;
        s1Matches[i] = true;
        s2Matches[j] = true;
        matches++;
        break;
      }
    }

    if (matches === 0) return 0.0;
    let k = 0;
    for (let i = 0; i < s1.length; i++) {
      if (!s1Matches[i]) continue;
      while (!s2Matches[k]) k++;
      if (s1[i] !== s2[k]) transpositions++;
      k++;
    }

    const jaro =
      (matches / s1.length +
        matches / s2.length +
        (matches - transpositions / 2) / matches) /
      3;
    let prefix = 0;
    for (let i = 0; i < Math.min(4, Math.min(s1.length, s2.length)); i++) {
      if (s1[i] === s2[i]) prefix++;
      else break;
    }
    return jaro + prefix * 0.1 * (1 - jaro);
  }
}
