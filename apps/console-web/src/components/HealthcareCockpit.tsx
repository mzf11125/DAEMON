"use client";

import type { ReactNode } from "react";

type Metric = { label: string; value: string; trend?: string };

export function HealthcareCockpit({ metrics }: { metrics: Metric[] }) {
  if (metrics.length === 0) {
    return null;
  }
  return (
    <section className="card" style={{ marginTop: "1.5rem" }}>
      <h2>Healthcare ops cockpit</h2>
      <p className="muted">Aggregate operational metrics — no PHI in v1 demo.</p>
      <Box style={{ display: "flex", flexWrap: "wrap", gap: "1rem", marginTop: "0.75rem" }}>
        {metrics.map((m) => (
          <Box key={m.label} style={{ minWidth: 140 }}>
            <Box style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{m.label}</Box>
            <Box style={{ fontSize: "1.25rem", fontWeight: 600 }}>{m.value}</Box>
            {m.trend && <Box style={{ fontSize: "0.75rem" }}>{m.trend}</Box>}
          </Box>
        ))}
      </Box>
    </section>
  );
}

function Box({
  children,
  style,
}: {
  children: ReactNode;
  style?: React.CSSProperties;
}) {
  return <div style={style}>{children}</div>;
}
