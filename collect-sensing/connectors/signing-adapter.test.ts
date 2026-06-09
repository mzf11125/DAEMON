/**
 * Unit tests for OSINT SigningAdapter.
 * Uses Node.js built-in crypto — no external deps, no DB required.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import {
  SigningAdapter,
  canonicalizePayload,
  type SigningKey,
} from "./signing-adapter.js";
import type { SourceConnector, RawRecord } from "./connector.js";

// ─── Key generation helpers ───────────────────────────────────────────────────

function generateTestKeyPair(): { privateKeyPem: string; publicKeyPem: string; keyId: string } {
  const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
  const privateKeyPem = privateKey.export({ type: "pkcs8", format: "pem" }) as string;
  const publicKeyPem = publicKey.export({ type: "spki", format: "pem" }) as string;
  const keyId = SigningAdapter.computeKeyId(publicKeyPem);
  return { privateKeyPem, publicKeyPem, keyId };
}

// ─── Mock connector ───────────────────────────────────────────────────────────

function mockConnector(records: RawRecord[]): SourceConnector {
  return {
    kind: "mock",
    sourceId: "test-source",
    fetch: async () => records,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("canonicalizePayload", () => {
  it("sorts keys alphabetically", () => {
    const result = canonicalizePayload({ z: 1, a: 2, m: 3 });
    assert.equal(result, JSON.stringify({ a: 2, m: 3, z: 1 }));
  });

  it("strips DAEMON metadata fields (__prefixed)", () => {
    const result = canonicalizePayload({
      name: "Alice",
      __source_sig: "should-be-stripped",
      __epoch_root: "also-stripped",
      value: 42,
    });
    const parsed = JSON.parse(result);
    assert.deepEqual(parsed, { name: "Alice", value: 42 });
  });

  it("handles nested objects deterministically", () => {
    const r1 = canonicalizePayload({ b: { d: 1, c: 2 }, a: 3 });
    const r2 = canonicalizePayload({ a: 3, b: { c: 2, d: 1 } });
    assert.equal(r1, r2, "same content in different order should produce same canonical string");
  });

  it("handles arrays without sorting", () => {
    const result = canonicalizePayload({ items: [3, 1, 2] });
    const parsed = JSON.parse(result);
    assert.deepEqual(parsed.items, [3, 1, 2], "arrays should not be sorted");
  });
});

describe("SigningAdapter", () => {
  it("has correct kind and sourceId", () => {
    const { privateKeyPem, keyId } = generateTestKeyPair();
    const key: SigningKey = { privateKeyPem, keyId };
    const adapter = new SigningAdapter(mockConnector([]), key);
    assert.equal(adapter.kind, "signed:mock");
    assert.equal(adapter.sourceId, "test-source");
  });

  it("adds __source_sig, __source_key_id, __signed_at, __payload_hash to payload", async () => {
    const { privateKeyPem, keyId } = generateTestKeyPair();
    const key: SigningKey = { privateKeyPem, keyId };
    const records: RawRecord[] = [
      { sourceId: "test-source", recordId: "r1", payload: { name: "Alice", age: 30 } },
    ];

    const adapter = new SigningAdapter(mockConnector(records), key);
    const signed = await adapter.fetch();

    assert.equal(signed.length, 1);
    const { payload } = signed[0]!;
    assert.ok(typeof payload.__source_sig === "string", "__source_sig must be present");
    assert.equal(payload.__source_key_id, keyId, "__source_key_id must match");
    assert.ok(typeof payload.__signed_at === "string", "__signed_at must be present");
    assert.ok(typeof payload.__payload_hash === "string", "__payload_hash must be present");
    assert.equal(payload.__payload_hash.length, 64, "payload hash must be 64-char hex");
    // Original payload fields preserved
    assert.equal(payload.name, "Alice");
    assert.equal(payload.age, 30);
  });

  it("preserves recordId from original record", async () => {
    const { privateKeyPem, keyId } = generateTestKeyPair();
    const adapter = new SigningAdapter(
      mockConnector([{ sourceId: "s", recordId: "rec-123", payload: { x: 1 } }]),
      { privateKeyPem, keyId },
    );
    const [signed] = await adapter.fetch();
    assert.equal(signed!.recordId, "rec-123");
  });

  it("works for records without recordId", async () => {
    const { privateKeyPem, keyId } = generateTestKeyPair();
    const adapter = new SigningAdapter(
      mockConnector([{ sourceId: "s", payload: { x: 1 } }]),
      { privateKeyPem, keyId },
    );
    const [signed] = await adapter.fetch();
    assert.equal(signed!.recordId, undefined);
  });
});

describe("SigningAdapter.verifyRecord", () => {
  it("verifies a valid signed record", async () => {
    const { privateKeyPem, publicKeyPem, keyId } = generateTestKeyPair();
    const adapter = new SigningAdapter(
      mockConnector([{ sourceId: "s", payload: { secret: "data", id: 42 } }]),
      { privateKeyPem, keyId },
    );
    const [signed] = await adapter.fetch();
    const valid = SigningAdapter.verifyRecord(signed!, publicKeyPem);
    assert.ok(valid, "valid signed record must verify");
  });

  it("rejects record with tampered payload value", async () => {
    const { privateKeyPem, publicKeyPem, keyId } = generateTestKeyPair();
    const adapter = new SigningAdapter(
      mockConnector([{ sourceId: "s", payload: { amount: 100 } }]),
      { privateKeyPem, keyId },
    );
    const [signed] = await adapter.fetch();

    // Tamper: change amount after signing
    const tampered = { payload: { ...signed!.payload, amount: 999 } };
    const valid = SigningAdapter.verifyRecord(tampered, publicKeyPem);
    assert.equal(valid, false, "tampered payload must fail verification");
  });

  it("rejects record with wrong public key", async () => {
    const { privateKeyPem, keyId } = generateTestKeyPair();
    const { publicKeyPem: wrongPublicKey } = generateTestKeyPair();

    const adapter = new SigningAdapter(
      mockConnector([{ sourceId: "s", payload: { x: 1 } }]),
      { privateKeyPem, keyId },
    );
    const [signed] = await adapter.fetch();
    const valid = SigningAdapter.verifyRecord(signed!, wrongPublicKey);
    assert.equal(valid, false, "wrong public key must fail verification");
  });

  it("rejects record with missing signature fields", () => {
    const { publicKeyPem } = generateTestKeyPair();
    const noSig = { payload: { name: "test" } };
    assert.equal(SigningAdapter.verifyRecord(noSig, publicKeyPem), false);
  });

  it("two different records produce different signatures", async () => {
    const { privateKeyPem, keyId } = generateTestKeyPair();
    const adapter = new SigningAdapter(
      mockConnector([
        { sourceId: "s", payload: { id: 1 } },
        { sourceId: "s", payload: { id: 2 } },
      ]),
      { privateKeyPem, keyId },
    );
    const [r1, r2] = await adapter.fetch();
    assert.notEqual(r1!.payload.__source_sig, r2!.payload.__source_sig,
      "different records must produce different signatures");
  });
});

describe("SigningAdapter.computeKeyId", () => {
  it("returns a 16-char hex fingerprint", () => {
    const { publicKeyPem } = generateTestKeyPair();
    const keyId = SigningAdapter.computeKeyId(publicKeyPem);
    assert.equal(keyId.length, 16);
    assert.match(keyId, /^[0-9a-f]+$/);
  });

  it("is deterministic for same key", () => {
    const { publicKeyPem } = generateTestKeyPair();
    assert.equal(
      SigningAdapter.computeKeyId(publicKeyPem),
      SigningAdapter.computeKeyId(publicKeyPem),
    );
  });

  it("differs for different keys", () => {
    const { publicKeyPem: k1 } = generateTestKeyPair();
    const { publicKeyPem: k2 } = generateTestKeyPair();
    assert.notEqual(SigningAdapter.computeKeyId(k1), SigningAdapter.computeKeyId(k2));
  });
});
