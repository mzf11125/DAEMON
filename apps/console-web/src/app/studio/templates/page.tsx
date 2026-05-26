"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getTemplates, getWorkspaces, createWorkspace,
  saveWorkspaceAsTemplate, deleteTemplate,
  exportWorkspace, importWorkspace,
} from "@/lib/studio-api";
import type { Template, Workspace } from "@/lib/studio-api";

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

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showSave, setShowSave] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importData, setImportData] = useState("");
  const [importError, setImportError] = useState("");
  const [exportMsg, setExportMsg] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [tps, ws] = await Promise.all([getTemplates(), getWorkspaces()]);
      setTemplates(tps);
      setWorkspaces(ws);
    } catch (e: any) {
      setError(e.message || "Could not load data. Is ontology-builder running on :8085?");
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleClone = async (templateId: string, templateName: string) => {
    const name = prompt("Workspace name:", `Clone of ${templateName}`);
    if (!name) return;
    try {
      const ws = await createWorkspace(name, templateId);
      router.push(`/studio/objects?workspace=${ws.id}`);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDelete = async (templateId: string, templateName: string) => {
    if (!confirm(`Delete template "${templateName}"?`)) return;
    try {
      await deleteTemplate(templateId);
      load();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleExport = async (workspaceId: string) => {
    try {
      const data = await exportWorkspace(workspaceId);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `workspace-${workspaceId.slice(0, 8)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setExportMsg(`Exported workspace ${workspaceId.slice(0, 8)}…`);
      setTimeout(() => setExportMsg(""), 3000);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleImport = async () => {
    setImportError("");
    try {
      const parsed = JSON.parse(importData);
      const ws = await importWorkspace(parsed);
      setShowImport(false);
      setImportData("");
      load();
      router.push(`/studio/objects?workspace=${ws.id}`);
    } catch (e: any) {
      setImportError(e.message || "Invalid JSON or import failed");
    }
  };

  if (loading) return <div style={{ color: "#666", padding: "2rem" }}>Loading...</div>;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 600, margin: 0 }}>Template Marketplace</h2>
          <p style={{ fontSize: "0.8rem", color: "#666", margin: "0.25rem 0 0" }}>
            Browse, clone, save, import and export workspace templates
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button onClick={() => setShowImport(true)} style={{
            background: "transparent", border: "1px solid #333", color: "#a78bfa",
            padding: "0.4rem 1rem", borderRadius: 6, cursor: "pointer",
            fontSize: "0.85rem", fontWeight: 600,
          }}>Import</button>
          <button onClick={() => setShowSave(true)} style={{
            background: "#a78bfa", color: "#000", border: "none",
            padding: "0.4rem 1rem", borderRadius: 6, fontWeight: 600,
            cursor: "pointer", fontSize: "0.85rem",
          }}>Save Workspace as Template</button>
        </div>
      </div>

      {error && (
        <div style={{ background: "#1a0a0a", border: "1px solid #3a1a1a", padding: "1rem", borderRadius: 8, marginBottom: "1.5rem", color: "#f87171" }}>
          {error}
        </div>
      )}

      {exportMsg && (
        <div style={{ background: "#0a1a0a", border: "1px solid #1a3a1a", padding: "0.75rem 1rem", borderRadius: 8, marginBottom: "1rem", color: "#4ade80", fontSize: "0.85rem" }}>
          {exportMsg}
        </div>
      )}

      {/* Templates Grid */}
      <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem", color: "#a78bfa" }}>
        Available Templates ({templates.length})
      </h3>

      {templates.length === 0 ? (
        <div style={{ color: "#555", padding: "3rem", textAlign: "center", marginBottom: "3rem" }}>
          <p style={{ fontSize: "1.5rem", margin: "0 0 0.5rem" }}>⊞</p>
          <p>No templates yet. Save a workspace as a template to share it.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1rem", marginBottom: "3rem" }}>
          {templates.map((tpl) => (
            <div key={tpl.id} style={{
              background: "#111118", border: "1px solid #222", borderRadius: 8, padding: "1.25rem",
              transition: "border-color 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#a78bfa")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#222")}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "0.5rem" }}>
                <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 600 }}>{tpl.displayName}</h3>
                {tpl.category && (
                  <span style={{
                    background: (CATEGORY_COLORS[tpl.category] || "#333") + "20",
                    color: CATEGORY_COLORS[tpl.category] || "#888",
                    padding: "0.15rem 0.5rem", borderRadius: 12, fontSize: "0.65rem",
                    fontWeight: 600, textTransform: "uppercase",
                  }}>{tpl.category}</span>
                )}
              </div>

              <p style={{ fontSize: "0.7rem", color: "#555", fontFamily: "monospace", margin: "0 0 0.5rem" }}>
                {tpl.name}
              </p>

              {tpl.description && (
                <p style={{ fontSize: "0.8rem", color: "#888", margin: "0.5rem 0", lineHeight: 1.4 }}>
                  {tpl.description}
                </p>
              )}

              {tpl.tags && tpl.tags.length > 0 && (
                <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
                  {tpl.tags.map((tag) => (
                    <span key={tag} style={{
                      background: "#1a1a2e", color: "#666", padding: "0.15rem 0.5rem",
                      borderRadius: 4, fontSize: "0.65rem",
                    }}>{tag}</span>
                  ))}
                </div>
              )}

              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
                <button onClick={() => handleClone(tpl.id, tpl.displayName)} style={{
                  flex: 1, background: "#1a1a2e", border: "none", color: "#a78bfa",
                  padding: "0.4rem 0.75rem", borderRadius: 6, cursor: "pointer",
                  fontSize: "0.8rem", fontWeight: 600,
                }}>Clone</button>
                <button onClick={() => handleDelete(tpl.id, tpl.displayName)} style={{
                  background: "transparent", border: "1px solid #333", color: "#ef4444",
                  padding: "0.4rem 0.75rem", borderRadius: 6, cursor: "pointer",
                  fontSize: "0.8rem",
                }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Workspaces (for export / save-as-template) */}
      <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem", color: "#888" }}>
        Your Workspaces — Export or Save as Template
      </h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
        {workspaces.map((ws) => (
          <div key={ws.id} style={{
            background: "#111118", border: "1px solid #222", borderRadius: 8, padding: "1rem",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
              <div>
                <h4 style={{ margin: 0, fontSize: "0.9rem", fontWeight: 600 }}>{ws.name}</h4>
                <p style={{ margin: "0.25rem 0 0", fontSize: "0.7rem", color: "#555", fontFamily: "monospace" }}>
                  {ws.id.slice(0, 8)}…
                </p>
              </div>
              <span style={{
                background: ws.status === "published" ? "#1a2e1a" : "#2e2e1a",
                color: ws.status === "published" ? "#4ade80" : "#facc15",
                padding: "0.1rem 0.4rem", borderRadius: 10, fontSize: "0.65rem", fontWeight: 600,
              }}>{ws.status || "draft"}</span>
            </div>
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
              <button onClick={() => handleExport(ws.id)} style={{
                flex: 1, background: "#1a1a2e", border: "none", color: "#facc15",
                padding: "0.35rem 0.5rem", borderRadius: 4, cursor: "pointer",
                fontSize: "0.75rem", fontWeight: 600,
              }}>Export</button>
              <button onClick={() => { setShowSave(true); }} style={{
                flex: 1, background: "#1a1a2e", border: "none", color: "#a78bfa",
                padding: "0.35rem 0.5rem", borderRadius: 4, cursor: "pointer",
                fontSize: "0.75rem", fontWeight: 600,
              }}>Save as Template</button>
            </div>
          </div>
        ))}
        {workspaces.length === 0 && (
          <div style={{ gridColumn: "1 / -1", color: "#555", textAlign: "center", padding: "2rem" }}>
            No workspaces yet. Create one from the Dashboard first.
          </div>
        )}
      </div>

      {/* Save as Template Dialog */}
      {showSave && (
        <SaveTemplateDialog
          workspaces={workspaces}
          onDone={() => { setShowSave(false); load(); }}
          onCancel={() => setShowSave(false)}
        />
      )}

      {/* Import Dialog */}
      {showImport && (
        <div onClick={() => setShowImport(false)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: "#1a1a24", border: "1px solid #333", borderRadius: 12,
            padding: "2rem", width: 500, maxWidth: "90vw",
          }}>
            <h3 style={{ margin: "0 0 1rem", fontSize: "1.1rem" }}>Import Workspace</h3>
            <p style={{ fontSize: "0.8rem", color: "#888", marginBottom: "1rem" }}>
              Paste exported workspace JSON below.
            </p>
            <textarea value={importData} onChange={(e) => setImportData(e.target.value)}
              placeholder="Paste JSON here…"
              style={{
                width: "100%", minHeight: 200, background: "#0a0a0f", border: "1px solid #333",
                color: "#fff", padding: "0.75rem", borderRadius: 6, fontSize: "0.8rem",
                fontFamily: "monospace", resize: "vertical", boxSizing: "border-box",
                marginBottom: "1rem",
              }} />
            {importError && (
              <div style={{ color: "#f87171", fontSize: "0.85rem", marginBottom: "1rem" }}>{importError}</div>
            )}
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button onClick={() => setShowImport(false)} style={{
                background: "transparent", border: "1px solid #333", color: "#888",
                padding: "0.5rem 1rem", borderRadius: 6, cursor: "pointer",
              }}>Cancel</button>
              <button onClick={handleImport} style={{
                background: "#a78bfa", border: "none", color: "#000", fontWeight: 600,
                padding: "0.5rem 1.2rem", borderRadius: 6, cursor: "pointer",
              }}>Import</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Save Template Dialog ──────────────────────────────

function SaveTemplateDialog({ workspaces, onDone, onCancel }: {
  workspaces: Workspace[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const [workspaceId, setWorkspaceId] = useState(workspaces[0]?.id || "");
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fieldStyle: React.CSSProperties = {
    width: "100%", background: "#0a0a0f", border: "1px solid #333", color: "#fff",
    padding: "0.5rem", borderRadius: 6, marginBottom: "0.75rem", boxSizing: "border-box",
    fontSize: "0.85rem",
  };

  const handleSave = async () => {
    if (!workspaceId || !name.trim() || !displayName.trim()) {
      alert("Please fill in workspace, name, and display name.");
      return;
    }
    setSubmitting(true);
    try {
      await saveWorkspaceAsTemplate(workspaceId, {
        name: name.trim(),
        displayName: displayName.trim(),
        description: description.trim() || undefined,
        category: category.trim() || undefined,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      });
      onDone();
    } catch (e: any) {
      alert(e.message);
    }
    setSubmitting(false);
  };

  return (
    <div onClick={onCancel} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "#1a1a24", border: "1px solid #333", borderRadius: 12,
        padding: "2rem", width: 450, maxWidth: "90vw",
      }}>
        <h3 style={{ margin: "0 0 1.5rem", fontSize: "1.1rem" }}>Save Workspace as Template</h3>

        <label style={{ display: "block", fontSize: "0.75rem", color: "#888", marginBottom: "0.3rem", fontWeight: 600 }}>
          Workspace
        </label>
        <select value={workspaceId} onChange={(e) => setWorkspaceId(e.target.value)} style={fieldStyle}>
          {workspaces.map((ws) => (
            <option key={ws.id} value={ws.id}>{ws.name} ({ws.id.slice(0, 8)}…)</option>
          ))}
        </select>

        <label style={{ display: "block", fontSize: "0.75rem", color: "#888", marginBottom: "0.3rem", fontWeight: 600 }}>
          Template Slug *
        </label>
        <input value={name} onChange={(e) => setName(e.target.value)}
          placeholder="e.g. express-cargo" autoFocus style={fieldStyle} />

        <label style={{ display: "block", fontSize: "0.75rem", color: "#888", marginBottom: "0.3rem", fontWeight: 600 }}>
          Display Name *
        </label>
        <input value={displayName} onChange={(e) => setDisplayName(e.target.value)}
          placeholder="e.g. Express Cargo Operations" style={fieldStyle} />

        <label style={{ display: "block", fontSize: "0.75rem", color: "#888", marginBottom: "0.3rem", fontWeight: 600 }}>
          Description
        </label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe what this template is for…"
          style={{ ...fieldStyle, minHeight: 60, resize: "vertical" }} />

        <label style={{ display: "block", fontSize: "0.75rem", color: "#888", marginBottom: "0.3rem", fontWeight: 600 }}>
          Category
        </label>
        <select value={category} onChange={(e) => setCategory(e.target.value)} style={fieldStyle}>
          <option value="">None</option>
          <option value="logistics">Logistics</option>
          <option value="defense">Defense</option>
          <option value="finance">Finance</option>
          <option value="healthcare">Healthcare</option>
          <option value="government">Government</option>
          <option value="web3">Web3</option>
          <option value="agriculture">Agriculture</option>
          <option value="energy">Energy</option>
        </select>

        <label style={{ display: "block", fontSize: "0.75rem", color: "#888", marginBottom: "0.3rem", fontWeight: 600 }}>
          Tags (comma-separated)
        </label>
        <input value={tags} onChange={(e) => setTags(e.target.value)}
          placeholder="e.g. drone, fleet, logistics" style={fieldStyle} />

        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
          <button onClick={onCancel} style={{
            background: "transparent", border: "1px solid #333", color: "#888",
            padding: "0.5rem 1rem", borderRadius: 6, cursor: "pointer",
          }}>Cancel</button>
          <button onClick={handleSave} disabled={submitting} style={{
            background: "#a78bfa", border: "none", color: "#000", fontWeight: 600,
            padding: "0.5rem 1.2rem", borderRadius: 6, cursor: "pointer",
            opacity: submitting ? 0.5 : 1,
          }}>{submitting ? "Saving..." : "Save Template"}</button>
        </div>
      </div>
    </div>
  );
}
