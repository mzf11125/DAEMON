import type { CSSProperties, ReactNode } from "react";

export function Badge({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "high";
}) {
  const style: CSSProperties = {
    display: "inline-block",
    padding: "0.15rem 0.5rem",
    borderRadius: 4,
    fontSize: "0.75rem",
    background: tone === "high" ? "#5c2b2b" : "#2d3a4d",
    color: tone === "high" ? "#ffb4b4" : "#e7ecf3",
  };
  return <span style={style}>{children}</span>;
}

export function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article
      style={{
        border: "1px solid #2a3544",
        borderRadius: 8,
        padding: "1rem",
        marginBottom: "0.75rem",
        background: "#151b24",
      }}
    >
      <strong>{title}</strong>
      <div style={{ marginTop: "0.5rem", color: "#8b9bb4", fontSize: "0.875rem" }}>{children}</div>
    </article>
  );
}
