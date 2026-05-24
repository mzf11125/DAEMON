"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { getClient } from "@/lib/client";

type Props = {
  shipmentId: string;
};

export function ExpressCargoConfirmPanel({ shipmentId }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const client = await getClient();
      const res = await client.confirmShipment({ shipmentId });
      setMessage(`Shipment confirmed (${res.status}).`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Confirm failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card" style={{ marginTop: "1rem" }}>
      <h2>Confirm draft shipment</h2>
      <p className="muted">
        Second HITL step: executes <code>ConfirmShipment</code> on ontology-service.
      </p>
      <button type="button" className="btn" disabled={busy} onClick={() => void confirm()}>
        Confirm shipment
      </button>
      {message && <p style={{ marginTop: "0.75rem" }}>{message}</p>}
      {error && <p className="muted">Error: {error}</p>}
    </section>
  );
}
