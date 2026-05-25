"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { getClient } from "@/lib/client";

type Signal = { primaryKey: string; properties: Record<string, unknown> };

function confidenceLabel(properties: Record<string, unknown>): string | null {
  const conf = properties.confidence;
  if (!conf || typeof conf !== "object") {
    return null;
  }
  const score = (conf as Record<string, unknown>).score;
  const method = (conf as Record<string, unknown>).method;
  if (score == null) {
    return null;
  }
  const methodStr = method != null ? String(method) : "confidence";
  return `confidence ${score} (${methodStr})`;
}

export function SignalOpenCase({ signals }: { signals: Signal[] }) {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);

  return (
    <>
      {signals.map((s) => {
        const conf = confidenceLabel(s.properties);
        return (
          <article key={s.primaryKey} className="card">
            <strong>{String(s.properties.summary ?? s.primaryKey)}</strong>
            <div className="muted" style={{ marginTop: "0.5rem" }}>
              <span className={`badge ${s.properties.severity === "high" ? "high" : ""}`}>
                {String(s.properties.severity ?? "unknown")}
              </span>{" "}
              · {String(s.properties.status ?? "—")} · {s.primaryKey}
              {conf ? <> · {conf}</> : null}
              {s.properties.provenanceRuleId ? (
                <> · rule {String(s.properties.provenanceRuleId)}</>
              ) : null}
            </div>
            <button
              type="button"
              style={{ marginTop: "0.75rem" }}
              onClick={async () => {
                setStatus(null);
                try {
                  const api = await getClient();
                  const res = await api.openCase({
                    title: `Case for ${s.primaryKey}`,
                    signalIds: [s.primaryKey],
                  });
                  const cid = String(res.caseId);
                  setStatus(`Opened case ${cid} for ${s.primaryKey}`);
                  router.push(`/cases/${cid}`);
                } catch (e) {
                  setStatus(e instanceof Error ? e.message : "Open case failed");
                }
              }}
            >
              Open case
            </button>
          </article>
        );
      })}
      {status && <p className="muted">{status}</p>}
    </>
  );
}
