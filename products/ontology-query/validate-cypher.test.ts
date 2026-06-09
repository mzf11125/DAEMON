import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  validateReadOnlyCypher,
  assertTenantScopedCypher,
  CypherValidationError,
  MAX_CYPHER_QUERY_LENGTH,
  hasMultipleCypherStatements,
} from "./validate-cypher.js";

describe("validate-cypher", () => {
  it("allows read queries with tenant params", () => {
    const cypher = `MATCH (c:Entity:Case { tenantId: $tenantId, domainId: $domainId })
RETURN c.entityId LIMIT 10`;
    assert.doesNotThrow(() => validateReadOnlyCypher(cypher));
    assert.doesNotThrow(() => assertTenantScopedCypher(cypher));
  });

  it("blocks write keywords", () => {
    assert.throws(
      () => validateReadOnlyCypher("CREATE (n:Entity) RETURN n"),
      CypherValidationError,
    );
  });

  it("requires tenant parameters", () => {
    assert.throws(
      () => assertTenantScopedCypher("MATCH (n) RETURN n"),
      CypherValidationError,
    );
  });

  it("rejects queries over max length", () => {
    const long = `MATCH (c:Entity { tenantId: $tenantId, domainId: $domainId })
WHERE c.note = '${"x".repeat(MAX_CYPHER_QUERY_LENGTH)}' RETURN c LIMIT 1`;
    assert.throws(() => validateReadOnlyCypher(long), CypherValidationError);
  });

  it("allows semicolons inside string literals", () => {
    const cypher = `MATCH (c:Entity { tenantId: $tenantId, domainId: $domainId })
WHERE c.note = 'a;b' RETURN c LIMIT 1`;
    assert.equal(hasMultipleCypherStatements(cypher), false);
    assert.doesNotThrow(() => validateReadOnlyCypher(cypher));
  });

  it("blocks multiple statements separated by semicolon", () => {
    const cypher = `MATCH (c:Entity { tenantId: $tenantId, domainId: $domainId }) RETURN c;
MATCH (d:Entity) RETURN d`;
    assert.equal(hasMultipleCypherStatements(cypher), true);
    assert.throws(() => validateReadOnlyCypher(cypher), CypherValidationError);
  });
});
