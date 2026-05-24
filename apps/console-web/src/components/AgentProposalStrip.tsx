"use client";

import { useState } from "react";
import { createDaemonClient } from "@/lib/daemon-client";

type Proposal = {
  actionType: string;
  summary: string;
  params: Record<string, unknown>;
};

export function AgentProposalStrip({
  caseId,
  enabled,
}: {
  caseId: string;
  enabled: boolean;
}) {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  async function loadProposals() {
    if (!enabled) return;
    setError(null);
    try {
      const client = createDaemonClient();
      const ctx = await client.summarizeCaseContext(caseId);
      setProposals([
        {
          actionType: "RecordDecision",
          summary: `Review agent summary and record disposition for case ${caseId}`,
          params: { caseId, outcome: "reviewed", rationale: ctx.summary.slice(0, 200) },
        },
        {
          actionType: "CreateWorkOrder",
          summary: "Propose field verification work order from signal context",
          params: { caseId, title: "Field verification — agent proposal" },
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load proposals");
    }
  }

  async function approve(proposal: Proposal) {
    setStatus(null);
    setError(null);
    try {
      const client = createDaemonClient();
      if (proposal.actionType === "RecordDecision") {
        await client.recordDecision({
          caseId: String(proposal.params.caseId),
          outcome: String(proposal.params.outcome ?? "approved"),
          rationale: String(proposal.params.rationale ?? ""),
        });
      } else if (proposal.actionType === "CreateWorkOrder") {
        await client.createWorkOrder({
          caseId: String(proposal.params.caseId),
          title: String(proposal.params.title ?? "Agent work order"),
        });
      }
      setStatus(`Approved ${proposal.actionType}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approval failed");
    }
  }

  if (!enabled) {
    return (
      <section style={{ marginTop: "1.5rem" }} className="card">
        <h2>Agent proposals</h2>
        <p className="muted">Listen-as-agent is disabled for this tenant (see agent maturation gates).</p>
      </section>
    );
  }

  return (
    <section style={{ marginTop: "1.5rem" }} className="card">
      <h2>Agent proposals</h2>
      <p className="muted">Human-in-the-loop: approve before any action executes.</p>
      <button type="button" className="btn" onClick={() => void loadProposals()} style={{ marginBottom: "0.75rem" }}>
        Load proposals
      </button>
      {proposals.length === 0 ? (
        <p className="muted">No proposals loaded.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {proposals.map((p) => (
            <li key={p.actionType} className="card" style={{ marginBottom: "0.5rem" }}>
              <strong>{p.actionType}</strong>
              <p>{p.summary}</p>
              <button type="button" className="btn" onClick={() => void approve(p)}>
                Approve
              </button>
            </li>
          ))}
        </ul>
      )}
      {status && <p className="muted">{status}</p>}
      {error && <p style={{ color: "#f87171" }}>{error}</p>}
    </section>
  );
}
