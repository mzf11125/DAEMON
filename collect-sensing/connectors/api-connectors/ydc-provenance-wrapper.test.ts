/** Spec: collect-sensing/connectors/api-connectors/ydc-provenance-wrapper.test.ts | BigPlan Phase 1.3 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { SigningAdapter } from "../signing-adapter.js";
import { wrapWithYdcProvenance } from "./ydc-provenance-wrapper.js";
import type { SourceConnector } from "../connector.js";

function testSigningKey() {
  const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
  const privateKeyPem = privateKey.export({ type: "pkcs8", format: "pem" }) as string;
  const publicKeyPem = publicKey.export({ type: "spki", format: "pem" }) as string;
  return {
    privateKeyPem,
    publicKeyPem,
    keyId: SigningAdapter.computeKeyId(publicKeyPem),
  };
}

describe("YDCProvenanceWrapper", () => {
  it("signs fetched records via SigningAdapter (happy path)", async () => {
    const { privateKeyPem, publicKeyPem, keyId } = testSigningKey();
    const inner: SourceConnector = {
      kind: "api",
      sourceId: "ydc-intelligence",
      fetch: async () => [
        { sourceId: "ydc-intelligence", recordId: "s1", payload: { query: "test", hits: 1 } },
      ],
    };
    const wrapper = wrapWithYdcProvenance(inner, { privateKeyPem, keyId });
    const records = await wrapper.fetch();
    assert.equal(records.length, 1);
    assert.ok(typeof records[0]?.payload.__source_sig === "string");
    assert.equal(
      SigningAdapter.verifyRecord(records[0]!, publicKeyPem),
      true,
    );
  });

  it("throws when inner connector fails (error case)", async () => {
    const { privateKeyPem, keyId } = testSigningKey();
    const inner: SourceConnector = {
      kind: "api",
      sourceId: "ydc-intelligence",
      fetch: async () => {
        throw new Error("upstream YDC failure");
      },
    };
    const wrapper = wrapWithYdcProvenance(inner, { privateKeyPem, keyId });
    await assert.rejects(() => wrapper.fetch(), /upstream YDC failure/);
  });
});
