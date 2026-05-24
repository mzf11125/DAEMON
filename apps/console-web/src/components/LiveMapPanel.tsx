"use client";

import { useState } from "react";
import { AttachmentUpload } from "@/components/AttachmentUpload";
import { LiveMap, type LiveMapPin } from "@/components/LiveMap";

type Signal = {
  signalId: string;
  summary?: string;
  severity?: string;
};

export function LiveMapPanel({
  sites,
  assets,
  signals,
}: {
  sites: LiveMapPin[];
  assets: LiveMapPin[];
  signals: Signal[];
}) {
  const [selected, setSelected] = useState<LiveMapPin | null>(null);

  return (
    <div style={{ display: "flex", gap: "1.25rem", alignItems: "flex-start", flexWrap: "wrap" }}>
      <div style={{ flex: "1 1 420px", minWidth: 280 }}>
        <LiveMap
          sites={sites}
          assets={assets}
          signals={signals}
          selectedId={selected?.id}
          onSelectPin={(pin) => setSelected((prev) => (prev?.id === pin.id ? null : pin))}
        />
      </div>
      {selected && (
        <aside className="card" style={{ flex: "0 1 280px", minWidth: 240, padding: "1rem" }}>
          <h2 style={{ marginTop: 0, fontSize: "1.1rem" }}>{selected.name ?? selected.id}</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            {selected.objectType}
            {selected.vertical ? ` · ${selected.vertical}` : ""}
          </p>
          <p className="muted" style={{ fontSize: "0.875rem" }}>
            {selected.latitude.toFixed(4)}, {selected.longitude.toFixed(4)}
          </p>
          {selected.objectType === "Asset" && (
            <AttachmentUpload
              resourceType="Asset"
              resourceId={selected.id}
              role="thumbnail"
              title="Track preview"
            />
          )}
          {selected.objectType === "Site" && (
            <p className="muted">Select an Asset pin to upload a track preview thumbnail.</p>
          )}
        </aside>
      )}
    </div>
  );
}
