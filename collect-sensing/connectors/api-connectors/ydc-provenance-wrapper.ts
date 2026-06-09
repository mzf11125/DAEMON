/** Spec: collect-sensing/connectors/api-connectors/ydc-provenance-wrapper.ts | BigPlan Phase 1.3 */
import {
  SigningAdapter,
  type SigningKey,
  type SignedRawRecord,
} from "../signing-adapter.js";
import type { RawRecord, SourceConnector } from "../connector.js";

export interface YDCProvenanceWrapperOptions {
  readonly inner: SourceConnector;
  readonly signingKey: SigningKey;
}

/**
 * Wraps a YDC (or any OSINT) connector with ECDSA provenance signing.
 * All OSINT evidence MUST pass through SigningAdapter per platform rules.
 */
export class YDCProvenanceWrapper implements SourceConnector {
  readonly kind: string;
  readonly sourceId: string;
  private readonly adapter: SigningAdapter;
  private readonly signingKey: SigningKey;

  constructor(options: YDCProvenanceWrapperOptions) {
    this.signingKey = options.signingKey;
    this.adapter = new SigningAdapter(options.inner, this.signingKey);
    this.kind = this.adapter.kind;
    this.sourceId = this.adapter.sourceId;
  }

  async fetch(): Promise<SignedRawRecord[]> {
    return this.adapter.fetch();
  }

  /** Sign a single ad-hoc OSINT record (e.g. agent tool output before ingest). */
  async signRecord(record: RawRecord): Promise<SignedRawRecord> {
    const inline = new SigningAdapter(
      {
        kind: "inline",
        sourceId: record.sourceId,
        fetch: async () => [record],
      },
      this.signingKey,
    );
    const [signed] = await inline.fetch();
    if (!signed) {
      throw new Error("YDCProvenanceWrapper failed to sign record");
    }
    return signed;
  }
}

export function wrapWithYdcProvenance(
  inner: SourceConnector,
  signingKey: SigningKey,
): YDCProvenanceWrapper {
  return new YDCProvenanceWrapper({ inner, signingKey });
}
