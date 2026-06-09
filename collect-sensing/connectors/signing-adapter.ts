/**
 * DAEMON OSINT Source Signing Adapter (Phase 3.1)
 *
 * Adds ECDSA-P256 digital signatures to raw records ingested from OSINT sources.
 * This ensures that every piece of intelligence data has a verifiable origin:
 *   - The signature proves WHICH source produced the record
 *   - It can be verified without connectivity to the source
 *   - Tampering with payload is detectable
 *
 * Architecture:
 *   SourceConnector → SigningAdapter → signed RawRecord
 *                                        ↓ stored in entity properties:
 *                                        __source_sig    (base64 ECDSA signature)
 *                                        __source_key_id (key fingerprint)
 *                                        __signed_at     (ISO timestamp)
 *
 * Key management:
 *   - Each source has its own ECDSA-P256 key pair
 *   - Private keys stored in environment / secrets manager
 *   - Public keys registered in DAEMON key registry (daemon_source_keys table)
 *   - Key format: PEM (standard Node.js crypto)
 *
 * Usage:
 *   const adapter = new SigningAdapter(connector, signingKey);
 *   const signedRecords = await adapter.fetch(); // payload includes __source_sig
 *
 * Verification (at forensic query time):
 *   const valid = SigningAdapter.verifyRecord(record, publicKeyPem);
 */

import { createSign, createVerify, createHash } from "node:crypto";
import type { RawRecord, SourceConnector } from "../connectors/connector.js";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SigningKey {
  /** Private key in PEM format (ECDSA P-256) */
  privateKeyPem: string;
  /** Unique identifier for this key — stored alongside signature for lookup */
  keyId: string;
}

export interface SignedPayload extends Record<string, unknown> {
  /** Base64-encoded ECDSA-P256 signature over canonicalized payload */
  __source_sig: string;
  /** Key fingerprint for public key lookup */
  __source_key_id: string;
  /** ISO timestamp at time of signing */
  __signed_at: string;
  /** Hex SHA-256 of the canonical payload (pre-signing) */
  __payload_hash: string;
}

export type SignedRawRecord = Omit<RawRecord, "payload"> & {
  readonly payload: SignedPayload;
};

// ─── Canonical payload serialization ──────────────────────────────────────────

/**
 * Produce a deterministic, canonical JSON string of a payload for signing.
 * Rules:
 *   - Remove existing DAEMON metadata fields (__source_*, __payload_*)
 *   - Sort keys alphabetically (deep)
 *   - No whitespace
 */
export function canonicalizePayload(payload: Record<string, unknown>): string {
  // Strip DAEMON-injected fields before signing
  const stripped: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (!k.startsWith("__")) stripped[k] = v;
  }
  return JSON.stringify(sortDeep(stripped));
}

function sortDeep(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(sortDeep);
  if (obj !== null && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, sortDeep(v)]),
    );
  }
  return obj;
}

// ─── SigningAdapter ───────────────────────────────────────────────────────────

/**
 * Wraps a SourceConnector to sign each fetched record with an ECDSA-P256 key.
 * The signature is embedded in the payload as `__source_sig`.
 *
 * Implements SourceConnector so it can be used as a drop-in replacement:
 *   createConnectorForSource(source) → new SigningAdapter(connector, key)
 */
export class SigningAdapter implements SourceConnector {
  readonly kind: string;
  readonly sourceId: string;

  constructor(
    private readonly inner: SourceConnector,
    private readonly signingKey: SigningKey,
  ) {
    this.kind = `signed:${inner.kind}`;
    this.sourceId = inner.sourceId;
  }

  async fetch(): Promise<SignedRawRecord[]> {
    const records = await this.inner.fetch();
    return records.map((record) => this._sign(record));
  }

  private _sign(record: RawRecord): SignedRawRecord {
    const canonical = canonicalizePayload(record.payload);
    const payloadHash = createHash("sha256").update(canonical).digest("hex");
    const signedAt = new Date().toISOString();

    // Sign: SHA-256 of (canonical + signedAt) — bind timestamp to signature
    const dataToSign = `${canonical}\n${signedAt}`;
    const signer = createSign("SHA256");
    signer.update(dataToSign);
    const signature = signer.sign(this.signingKey.privateKeyPem, "base64");

    const signedPayload: SignedPayload = {
      ...record.payload,
      __source_sig: signature,
      __source_key_id: this.signingKey.keyId,
      __signed_at: signedAt,
      __payload_hash: payloadHash,
    };

    return {
      sourceId: record.sourceId,
      ...(record.recordId !== undefined ? { recordId: record.recordId } : {}),
      payload: signedPayload,
    };
  }

  // ─── Static verification ─────────────────────────────────────────────────

  /**
   * Verify that a record's signature is valid.
   * Call this at forensic query time to confirm the record came from a trusted source.
   *
   * @param record       - The (potentially stored) signed record
   * @param publicKeyPem - The ECDSA-P256 public key corresponding to __source_key_id
   * @returns true if signature is valid and payload was not tampered with
   */
  static verifyRecord(
    record: { payload: Record<string, unknown> },
    publicKeyPem: string,
  ): boolean {
    const payload = record.payload;
    const sig = payload.__source_sig;
    const signedAt = payload.__signed_at;
    const storedHash = payload.__payload_hash;

    if (typeof sig !== "string" || typeof signedAt !== "string" || typeof storedHash !== "string") {
      return false;
    }

    try {
      // Reconstruct canonical payload (strip DAEMON fields)
      const canonical = canonicalizePayload(payload);

      // Verify payload hash hasn't changed
      const currentHash = createHash("sha256").update(canonical).digest("hex");
      if (currentHash !== storedHash) return false;

      // Verify ECDSA signature
      const dataToVerify = `${canonical}\n${signedAt}`;
      const verifier = createVerify("SHA256");
      verifier.update(dataToVerify);
      return verifier.verify(publicKeyPem, sig, "base64");
    } catch {
      return false;
    }
  }

  /**
   * Compute the fingerprint (SHA-256 of public key PEM) for use as keyId.
   * Use this when generating new key pairs to get a stable keyId.
   */
  static computeKeyId(publicKeyPem: string): string {
    return createHash("sha256").update(publicKeyPem).digest("hex").slice(0, 16);
  }
}
