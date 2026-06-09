const FORBIDDEN_KEYWORDS =
  /\b(CREATE|MERGE|DELETE|DETACH|SET|DROP|REMOVE|LOAD\s+CSV|CALL\s+dbms|CALL\s+db\.create|FOREACH|APOC\.periodic)\b/i;

/**
 * Maximum Cypher query length accepted from LLM / API paths (UTF-16 code units).
 * Guards validation and Neo4j execution from oversized or abusive payloads.
 */
export const MAX_CYPHER_QUERY_LENGTH = 16_384;

export class CypherValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CypherValidationError";
  }
}

/**
 * Detects a second statement after the first `;` outside quoted strings.
 * Linear scan only (no regex) to avoid ReDoS on attacker-controlled input.
 */
export function hasMultipleCypherStatements(cypher: string): boolean {
  let inSingle = false;
  let inDouble = false;
  let escape = false;

  for (let i = 0; i < cypher.length; i++) {
    const ch = cypher[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\" && (inSingle || inDouble)) {
      escape = true;
      continue;
    }
    if (!inDouble && ch === "'") {
      inSingle = !inSingle;
      continue;
    }
    if (!inSingle && ch === '"') {
      inDouble = !inDouble;
      continue;
    }
    if (inSingle || inDouble) continue;
    if (ch !== ";") continue;

    for (let j = i + 1; j < cypher.length; j++) {
      const after = cypher[j];
      if (after === " " || after === "\t" || after === "\n" || after === "\r") {
        continue;
      }
      return true;
    }
    return false;
  }
  return false;
}

export function validateReadOnlyCypher(cypher: string): void {
  const trimmed = cypher.trim();
  if (!trimmed) {
    throw new CypherValidationError("empty Cypher query");
  }
  if (trimmed.length > MAX_CYPHER_QUERY_LENGTH) {
    throw new CypherValidationError(
      `Cypher query exceeds maximum length (${MAX_CYPHER_QUERY_LENGTH} characters)`,
    );
  }
  if (hasMultipleCypherStatements(trimmed)) {
    throw new CypherValidationError("multiple Cypher statements are not allowed");
  }
  if (FORBIDDEN_KEYWORDS.test(trimmed)) {
    throw new CypherValidationError("write or admin Cypher operations are not allowed");
  }
}

export function assertTenantScopedCypher(cypher: string): void {
  if (!/\$tenantId/.test(cypher) || !/\$domainId/.test(cypher)) {
    throw new CypherValidationError(
      "Cypher must reference $tenantId and $domainId parameters",
    );
  }
}
