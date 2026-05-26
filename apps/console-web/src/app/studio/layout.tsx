"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/studio", label: "Dashboard", icon: "⊞" },
  { href: "/studio/objects", label: "Objects", icon: "◆" },
  { href: "/studio/links", label: "Links", icon: "↗" },
  { href: "/studio/actions", label: "Actions", icon: "▶" },
  { href: "/studio/rules", label: "Rules", icon: "⚑" },
  { href: "/studio/compile", label: "Compile", icon: "⚙" },
  { href: "/studio/templates", label: "Templates", icon: "⎌" },
];

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [workspaceId, setWorkspaceId] = useState<string | null>(
    typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("workspace") : null
  );

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0a0a0f", color: "#e0e0e0" }}>
      {/* Sidebar */}
      <nav style={{
        width: 220, background: "#111118", borderRight: "1px solid #222",
        padding: "1.5rem 0", display: "flex", flexDirection: "column",
      }}>
        <div style={{ padding: "0 1.5rem 1.5rem", borderBottom: "1px solid #222", marginBottom: "1rem" }}>
          <h1 style={{ fontSize: "1rem", fontWeight: 700, color: "#a78bfa", margin: 0 }}>
            ◈ Ontology Studio
          </h1>
          {workspaceId && (
            <p style={{ fontSize: "0.75rem", color: "#666", margin: "0.5rem 0 0" }}>
              Workspace: {workspaceId.slice(0, 8)}…
            </p>
          )}
        </div>

        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/studio" && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={workspaceId ? `${item.href}?workspace=${workspaceId}` : item.href}
              style={{
                display: "flex", alignItems: "center", gap: "0.75rem",
                padding: "0.6rem 1.5rem", textDecoration: "none",
                color: isActive ? "#fff" : "#888",
                background: isActive ? "#1a1a2e" : "transparent",
                borderLeft: isActive ? "3px solid #a78bfa" : "3px solid transparent",
                fontSize: "0.875rem", transition: "all 0.15s",
              }}>
              <span style={{ fontSize: "1.1rem" }}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}

        <div style={{ marginTop: "auto", padding: "1rem 1.5rem", borderTop: "1px solid #222" }}>
          <Link href="/" style={{ color: "#666", textDecoration: "none", fontSize: "0.8rem" }}>
            ← Back to Cockpit
          </Link>
        </div>
      </nav>

      {/* Content */}
      <main style={{ flex: 1, padding: "2rem", overflow: "auto" }}>
        {children}
      </main>
    </div>
  );
}
