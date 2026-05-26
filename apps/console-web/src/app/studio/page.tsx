"use client";

import { useEffect, useState } from "react";
import { getWorkspaces, createWorkspace, deleteWorkspace, getTemplates } from "@/lib/studio-api";
import type { Workspace, Template } from "@/lib/studio-api";
import { useRouter } from "next/navigation";

const CATEGORY_COLORS: Record<string, string> = {
  logistics: "#3b82f6",
  defense: "#ef4444",
  finance: "#22c55e",
  healthcare: "#f97316",
  government: "#8b5cf6",
  web3: "#ec4899",
  agriculture: "#84cc16",
  energy: "#eab308",
};

export default function StudioDashboard() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const router = useRouter();

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [ws, tps] = await Promise.all([getWorkspaces(), getTemplates()]);
      setWorkspaces(ws);
      setTemplates(tps);
    } catch (e: any) {
      setError(e.message || "Could not load workspaces. Is ontology-builder running on :8085?");
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      const ws = await createWorkspace(newName, selectedTemplate || undefined);
      router.push(`/studio/objects?workspace=${ws.id}`);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this workspace and all its contents?")) return;
    await deleteWorkspace(id);
    load();
  };

  if (loading) return <div style={{ color: "#666", padding: "2rem" }}>Loading...</div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 600, margin: 0 }}>Workspaces</h2>
        <button onClick={() => setShowCreate(true)} style={{
          background: "#a78bfa", color: "#000", border: "none", padding: "0.5rem 1.2rem",
          borderRadius: 6, fontWeight: 600, cursor: "pointer", fontSize: "0.875rem",
        }}>
          + New Workspace
        </button>
      </div>

      {error && (
        <div style={{ background: "#1a0a0a", border: "1px solid #3a1a1a", padding: "1rem", borderRadius: 8, marginBottom: "1.5rem", color: "#f87171" }}>
          {error}
        </div>
      )}

      {/* Workspace cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem", marginBottom: "3rem" }}>
        {workspaces.map((ws) => (
          <div key={ws.id} onClick={() => router.push(`/studio/objects?workspace=${ws.id}`)} style={{
            background: "#111118", border: "1px solid #222", borderRadius: 8, padding: "1.25rem",
            cursor: "pointer", transition: "border-color 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#a78bfa")}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#222")}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>{ws.name}</h3>
                <p style={{ margin: "0.25rem 0", fontSize: "0.8rem", color: "#666" }}>
                  {ws.status} · {new Date(ws.updatedAt || ws.createdAt).toLocaleDateString()}
                </p>
              </div>
              <span style={{
                background: ws.status === "published" ? "#1a2e1a" : "#2e2e1a",
                color: ws.status === "published" ? "#4ade80" : "#facc15",
                padding: "0.15rem 0.5rem", borderRadius: 12, fontSize: "0.7rem", fontWeight: 600,
              }}>{ws.status}</span>
            </div>
            {ws.description && <p style={{ fontSize: "0.8rem", color: "#888", marginTop: "0.5rem" }}>{ws.description}</p>}
            <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem" }}>
              <button onClick={(e) => { e.stopPropagation(); router.push(`/studio/objects?workspace=${ws.id}`); }}
                style={{ background: "#1a1a2e", border: "none", color: "#a78bfa", padding: "0.3rem 0.75rem", borderRadius: 4, cursor: "pointer", fontSize: "0.75rem" }}>
                Open
              </button>
              <button onClick={(e) => { e.stopPropagation(); handleDelete(ws.id); }}
                style={{ background: "transparent", border: "none", color: "#ef4444", padding: "0.3rem 0.75rem", cursor: "pointer", fontSize: "0.75rem" }}>
                Delete
              </button>
            </div>
          </div>
        ))}

        {workspaces.length === 0 && !error && (
          <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "3rem", color: "#555" }}>
            <p style={{ fontSize: "1.5rem", margin: "0 0 0.5rem" }}>⊞</p>
            <p>No workspaces yet. Create one above or clone a template below.</p>
          </div>
        )}
      </div>

      {/* Templates */}
      <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1rem" }}>Templates</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
        {templates.map((tpl) => (
          <div key={tpl.id} style={{
            background: "#111118", border: "1px solid #222", borderRadius: 8, padding: "1.25rem",
            cursor: "pointer", transition: "border-color 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#a78bfa")}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#222")}
          onClick={() => { setNewName(tpl.displayName); setSelectedTemplate(tpl.id); setShowCreate(true); }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "0.5rem" }}>
              <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 600 }}>{tpl.displayName}</h3>
              {tpl.category && (
                <span style={{
                  background: (CATEGORY_COLORS[tpl.category] || "#333") + "20",
                  color: CATEGORY_COLORS[tpl.category] || "#888",
                  padding: "0.15rem 0.5rem", borderRadius: 12, fontSize: "0.65rem", fontWeight: 600, textTransform: "uppercase",
                }}>{tpl.category}</span>
              )}
            </div>
            {tpl.description && <p style={{ fontSize: "0.8rem", color: "#888", margin: "0.5rem 0" }}>{tpl.description}</p>}
            {tpl.tags && tpl.tags.length > 0 && (
              <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", marginTop: "0.75rem" }}>
                {tpl.tags.map((tag: string) => (
                  <span key={tag} style={{ background: "#1a1a2e", color: "#666", padding: "0.15rem 0.5rem", borderRadius: 4, fontSize: "0.65rem" }}>
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Create dialog */}
      {showCreate && (
        <div onClick={() => setShowCreate(false)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: "#1a1a24", border: "1px solid #333", borderRadius: 12, padding: "2rem",
            width: 400, maxWidth: "90vw",
          }}>
            <h3 style={{ margin: "0 0 1.5rem", fontSize: "1.1rem" }}>Create Workspace</h3>
            <label style={{ display: "block", fontSize: "0.8rem", color: "#888", marginBottom: "0.3rem" }}>Name</label>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="My workspace"
              autoFocus style={{
                width: "100%", background: "#0a0a0f", border: "1px solid #333", color: "#fff",
                padding: "0.6rem", borderRadius: 6, fontSize: "0.9rem", marginBottom: "1rem", boxSizing: "border-box",
              }} />
            {selectedTemplate && (
              <p style={{ fontSize: "0.75rem", color: "#a78bfa", margin: "0 0 1rem" }}>
                From template: {selectedTemplate}
              </p>
            )}
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button onClick={() => setShowCreate(false)} style={{
                background: "transparent", border: "1px solid #333", color: "#888",
                padding: "0.5rem 1rem", borderRadius: 6, cursor: "pointer",
              }}>Cancel</button>
              <button onClick={handleCreate} style={{
                background: "#a78bfa", border: "none", color: "#000", fontWeight: 600,
                padding: "0.5rem 1.2rem", borderRadius: 6, cursor: "pointer",
              }}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
