"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { getClient } from "@/lib/client";
import type { IntakeProposal } from "@/lib/express-cargo-intake";

type Props = {
  proposal: IntakeProposal;
  fixtureId: string;
  auditCaseId: string;
};

export function ExpressCargoIntakePanel({ proposal, fixtureId, auditCaseId }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  async function approve() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const client = await getClient();
      const res = await client.createShipmentDraft(proposal.parameters);
      const shipmentId = String(res.shipmentId ?? "");
      if (!shipmentId) {
        throw new Error("CreateShipmentDraft did not return shipmentId");
      }
      setMessage(`Draft shipment ${shipmentId} created.`);
      router.push(`/express-cargo/shipments/${encodeURIComponent(shipmentId)}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Approve failed");
    } finally {
      setBusy(false);
    }
  }

  async function reject() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const client = await getClient();
      await client.recordDecision({
        caseId: auditCaseId,
        outcome: "intake_rejected",
        rationale: rejectReason || `Rejected intake proposal from fixture ${fixtureId}`,
      });
      setMessage("Proposal rejected; decision recorded on audit case.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reject failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card" style={{ marginTop: "1rem" }}>
      <h2>Human review</h2>
      <p className="muted">
        Approve executes <code>CreateShipmentDraft</code> via Go ontology-service (not mutating MCP).
      </p>
      {proposal.reviewFlags.length > 0 && (
        <p>
          Review flags:{" "}
          {proposal.reviewFlags.map((f) => (
            <span key={f} className="muted">
              {f}{" "}
            </span>
          ))}
        </p>
      )}
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.75rem" }}>
        <button type="button" className="btn" disabled={busy} onClick={() => void approve()}>
          Approve & create draft
        </button>
      </div>
      <label style={{ display: "block", marginTop: "1rem" }}>
        Reject reason (optional)
        <input
          type="text"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="Why this proposal is rejected"
          style={{ display: "block", width: "100%", marginTop: "0.25rem" }}
        />
      </label>
      <button
        type="button"
        disabled={busy}
        onClick={() => void reject()}
        style={{ marginTop: "0.5rem" }}
      >
        Reject proposal
      </button>
      {message && <p style={{ marginTop: "0.75rem" }}>{message}</p>}
      {error && <p className="muted">Error: {error}</p>}
    </section>
  );
}
