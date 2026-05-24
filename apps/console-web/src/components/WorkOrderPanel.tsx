"use client";

import { useState } from "react";
import { createDaemonClient } from "@/lib/daemon-client";

export function WorkOrderPanel({ caseId }: { caseId: string }) {
  const [title, setTitle] = useState("");
  const [assetId, setAssetId] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [workOrders, setWorkOrders] = useState<Array<Record<string, unknown>>>([]);

  async function refresh() {
    const client = createDaemonClient();
    const res = await client.listObjects("WorkOrder", { limit: 50 });
    const filtered = (res.items ?? []).filter(
      (wo) => (wo.properties?.caseId as string | undefined) === caseId,
    );
    setWorkOrders(filtered.map((wo) => ({ id: wo.primaryKey, ...wo.properties })));
  }

  async function createWO(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus(null);
    try {
      const client = createDaemonClient();
      await client.createWorkOrder({
        title,
        caseId,
        assetId: assetId || undefined,
      });
      setTitle("");
      setAssetId("");
      setStatus("Work order created.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create work order");
    }
  }

  return (
    <section>
      <h2>Work orders</h2>
      <button type="button" className="btn" onClick={() => void refresh()} style={{ marginBottom: "0.5rem" }}>
        Refresh list
      </button>
      {workOrders.length === 0 ? (
        <p className="muted">No work orders linked to this case yet.</p>
      ) : (
        <ul>
          {workOrders.map((wo) => (
            <li key={String(wo.id)}>
              {String(wo.title ?? wo.id)} · {String(wo.status ?? "open")}
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={(e) => void createWO(e)} style={{ marginTop: "1rem" }}>
        <label>
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} required style={{ display: "block", width: "100%", marginTop: 4 }} />
        </label>
        <label style={{ display: "block", marginTop: "0.75rem" }}>
          Asset ID (optional)
          <input value={assetId} onChange={(e) => setAssetId(e.target.value)} style={{ display: "block", width: "100%", marginTop: 4 }} />
        </label>
        <button type="submit" className="btn" style={{ marginTop: "0.75rem" }}>
          Create work order
        </button>
      </form>
      {status && <p className="muted">{status}</p>}
      {error && <p style={{ color: "#f87171" }}>{error}</p>}
    </section>
  );
}
