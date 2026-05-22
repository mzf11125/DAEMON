"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getClient } from "@/lib/client";

export function CaseDecisionForm({ caseId }: { caseId: string }) {
  const router = useRouter();
  const [outcome, setOutcome] = useState("reviewed");
  const [rationale, setRationale] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  return (
    <div className="card">
      <h3>Record decision</h3>
      <label className="muted" style={{ display: "block", marginTop: "0.5rem" }}>
        Outcome
        <input
          value={outcome}
          onChange={(e) => setOutcome(e.target.value)}
          style={{ display: "block", width: "100%", marginTop: "0.25rem" }}
        />
      </label>
      <label className="muted" style={{ display: "block", marginTop: "0.5rem" }}>
        Rationale
        <textarea
          value={rationale}
          onChange={(e) => setRationale(e.target.value)}
          rows={3}
          style={{ display: "block", width: "100%", marginTop: "0.25rem" }}
        />
      </label>
      <button
        type="button"
        style={{ marginTop: "0.75rem" }}
        onClick={async () => {
          setStatus(null);
          try {
            const api = await getClient();
            const res = await api.recordDecision({ caseId, outcome, rationale });
            setStatus(`Decision recorded: ${String(res.decisionId ?? "ok")}`);
            router.refresh();
          } catch (e) {
            setStatus(e instanceof Error ? e.message : "Record decision failed");
          }
        }}
      >
        Submit decision
      </button>
      {status && <p className="muted" style={{ marginTop: "0.5rem" }}>{status}</p>}
    </div>
  );
}
