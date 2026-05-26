"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getObjects, createObject, deleteObject } from "@/lib/studio-api";
import type { ObjectType } from "@/lib/studio-api";

export default function ObjectsPage() {
  return (
    <Suspense fallback={<div style={{ color: "#666", padding: "2rem" }}>Loading...</div>}>
      <ObjectsPageContent />
    </Suspense>
  );
}

function ObjectsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const workspaceId = searchParams.get("workspace") || "";
  const [objects, setObjects] = useState<ObjectType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    if (!workspaceId) { setLoading(false); return; }
    try {
      const items = await getObjects(workspaceId);
      setObjects(items);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [workspaceId]);

  if (!workspaceId) return <div style={{ color: "#666" }}>Select a workspace from the Dashboard first.</div>;
  if (loading) return <div style={{ color: "#666" }}>Loading...</div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, margin: 0 }}>Object Types</h2>
        <button onClick={() => setShowForm(true)} style={{
          background: "#a78bfa", color: "#000", border: "none", padding: "0.4rem 1rem",
          borderRadius: 6, fontWeight: 600, cursor: "pointer", fontSize: "0.85rem",
        }}>+ Add Object Type</button>
      </div>

      {error && <div style={{ color: "#f87171", marginBottom: "1rem" }}>{error}</div>}

      {objects.length === 0 ? (
        <div style={{ color: "#555", padding: "2rem", textAlign: "center" }}>
          No object types yet. Add your first one.
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #222", textAlign: "left" }}>
              <th style={{ padding: "0.75rem", fontSize: "0.8rem", color: "#888" }}>API Name</th>
              <th style={{ padding: "0.75rem", fontSize: "0.8rem", color: "#888" }}>Display Name</th>
              <th style={{ padding: "0.75rem", fontSize: "0.8rem", color: "#888" }}>Properties</th>
              <th style={{ padding: "0.75rem", fontSize: "0.8rem", color: "#888" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {objects.map((obj) => (
              <tr key={obj.id} style={{ borderBottom: "1px solid #1a1a24" }}>
                <td style={{ padding: "0.75rem", fontFamily: "monospace", fontSize: "0.85rem" }}>{obj.apiName}</td>
                <td style={{ padding: "0.75rem" }}>{obj.displayName}</td>
                <td style={{ padding: "0.75rem", color: "#888", fontSize: "0.8rem" }}>
                  {obj.properties?.length || 0}
                </td>
                <td style={{ padding: "0.75rem" }}>
                  <button onClick={async () => { await deleteObject(workspaceId, obj.id); load(); }}
                    style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "0.8rem" }}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Quick-add form */}
      {showForm && <AddObjectForm workspaceId={workspaceId} onDone={() => { setShowForm(false); load(); }} />}
    </div>
  );
}

function AddObjectForm({ workspaceId, onDone }: { workspaceId: string; onDone: () => void }) {
  const [apiName, setApiName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!apiName || !displayName) return;
    setSubmitting(true);
    try {
      await createObject(workspaceId, { apiName, displayName, properties: [] });
      onDone();
    } catch (e: any) { alert(e.message); }
    setSubmitting(false);
  };

  return (
    <div onClick={() => onDone()} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "#1a1a24", border: "1px solid #333", borderRadius: 12, padding: "2rem", width: 380,
      }}>
        <h3 style={{ margin: "0 0 1.5rem" }}>New Object Type</h3>
        <input value={apiName} onChange={(e) => setApiName(e.target.value)}
          placeholder="apiName (e.g. DroneFleet)" autoFocus style={{
            width: "100%", background: "#0a0a0f", border: "1px solid #333", color: "#fff",
            padding: "0.5rem", borderRadius: 6, marginBottom: "0.75rem", boxSizing: "border-box",
          }} />
        <input value={displayName} onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Display Name (e.g. Drone Fleet)" style={{
            width: "100%", background: "#0a0a0f", border: "1px solid #333", color: "#fff",
            padding: "0.5rem", borderRadius: 6, marginBottom: "1rem", boxSizing: "border-box",
          }} />
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
          <button onClick={onDone} style={{
            background: "transparent", border: "1px solid #333", color: "#888",
            padding: "0.5rem 1rem", borderRadius: 6, cursor: "pointer",
          }}>Cancel</button>
          <button onClick={handleSubmit} disabled={submitting} style={{
            background: "#a78bfa", border: "none", color: "#000", fontWeight: 600,
            padding: "0.5rem 1.2rem", borderRadius: 6, cursor: "pointer", opacity: submitting ? 0.5 : 1,
          }}>Create</button>
        </div>
      </div>
    </div>
  );
}
