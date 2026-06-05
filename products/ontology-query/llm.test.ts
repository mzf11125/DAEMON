import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { extractCypherBlock } from "./llm.js";

describe("extractCypherBlock", () => {
  it("extracts fenced cypher block", () => {
    const text = `Here is the query:
\`\`\`cypher
MATCH (n) RETURN n LIMIT 1
\`\`\``;
    assert.equal(
      extractCypherBlock(text),
      "MATCH (n) RETURN n LIMIT 1",
    );
  });

  it("extracts generic fenced block", () => {
    const text = `\`\`\`
MATCH (c:Entity) RETURN c
\`\`\``;
    assert.equal(extractCypherBlock(text), "MATCH (c:Entity) RETURN c");
  });

  it("returns trimmed text when no fence", () => {
    assert.equal(
      extractCypherBlock("  MATCH (n) RETURN n  "),
      "MATCH (n) RETURN n",
    );
  });
});
