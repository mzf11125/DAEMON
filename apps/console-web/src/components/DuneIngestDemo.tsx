"use client";

import { useState } from "react";
import { getClient } from "@/lib/client";

const ENABLED = process.env.NEXT_PUBLIC_ENABLE_DUNE_CONNECTORS === "true";

const DEFAULT_EVM = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
const CHAIN_OPTIONS = [
  { id: 1, label: "Ethereum" },
  { id: 8453, label: "Base" },
  { id: 137, label: "Polygon" },
];

export function DuneIngestDemo(props: {
  busy: boolean;
  run: (fn: () => Promise<void>) => Promise<void>;
  onJobStarted: (jobId: string, status: string) => void;
}) {
  const [address, setAddress] = useState(DEFAULT_EVM);
  const [chains, setChains] = useState<number[]>([1, 8453]);

  if (!ENABLED) {
    return null;
  }

  function toggleChain(id: number) {
    setChains((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id].sort((a, b) => a - b),
    );
  }

  return (
    <div className="card" style={{ marginTop: "1rem", width: "100%" }}>
      <h3 style={{ marginTop: 0 }}>Sim ingest (demo)</h3>
      <p className="muted" style={{ fontSize: "0.875rem" }}>
        Requires <code>SIM_API_KEY</code> on ingestion-service. Feature flag{" "}
        <code>NEXT_PUBLIC_ENABLE_DUNE_CONNECTORS=true</code>.
      </p>
      <label style={{ display: "block", marginBottom: "0.5rem" }}>
        EVM address
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          style={{ display: "block", width: "100%", marginTop: "0.25rem" }}
        />
      </label>
      <div style={{ marginBottom: "0.75rem" }}>
        Chains
        {CHAIN_OPTIONS.map((c) => (
          <label key={c.id} style={{ marginRight: "1rem", marginLeft: "0.5rem" }}>
            <input
              type="checkbox"
              checked={chains.includes(c.id)}
              onChange={() => toggleChain(c.id)}
            />{" "}
            {c.label} ({c.id})
          </label>
        ))}
      </div>
      <button
        type="button"
        disabled={props.busy || chains.length === 0 || !address.trim()}
        onClick={() =>
          props.run(async () => {
            const api = await getClient();
            const res = await api.createJob("sim-dune", {
              addresses: [address.trim()],
              chain_ids: chains,
              sources: ["balances", "activity"],
              limit_per_address: 50,
            });
            props.onJobStarted(res.jobId, String(res.status ?? "pending"));
          })
        }
      >
        Start Sim ingest job
      </button>
    </div>
  );
}
