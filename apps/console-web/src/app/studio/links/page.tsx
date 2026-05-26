"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getLinks, getObjects, createLink, deleteLink } from "@/lib/studio-api";
import type { LinkType, ObjectType } from "@/lib/studio-api";

export default function LinksPage() {
  const searchParams = useSearchParams();
  const workspaceId = searchParams.get("workspace") || "";
  const [links, setLinks] = useState<LinkType[]>([]);
  const [objects, setObjects] = useState<ObjectType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    if (!workspaceId) { setLoading(false); return; }
    const [lks, objs] = await Promise.all([getLinks(workspaceId).catch(() => []), getObjects(workspaceId).catch(() => [])]);
    setLinks(lks);
    setObjects(objs);
    setLoading(false);
  };

  useEffect(() => { load(); }, [workspaceId]);

  if (!workspaceId) return <div style={{ color: "#666" }}>Select a workspace first.</div>;
  if (loading) return <div style={{ color: "#666" }}>Loading...</div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, margin: 0 }}>Link Types</h2>
        <button onClick={() => setShowForm(true)} style={{
          background: "#a78bfa", color: "#000", border: "none", padding: "0.4rem 1rem",
          borderRadius: 6, fontWeight: 600, cursor: "pointer", fontSize: "0.85rem",
        }}>+ Add Link</button>
      </div>

      {links.length === 0 ? (
        <div style={{ color: "#555", padding: "2rem", textAlign: "center" }}>
          No links defined yet.
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #222", textAlign: "left" }}>
              <th style={{ padding: "0.75rem", fontSize: "0.8rem", color: "#888" }}>API Name</th>
              <th style={{ padding: "0.75rem", fontSize: "0.8rem", color: "#888" }}>From → To</th>
              <th style={{ padding: "0.75rem", fontSize: "0.8rem", color: "#888" }}>Cardinality</th>
              <th style={{ padding: "0.75rem" }}></th>
            </tr>
          </thead>
          <tbody>
            {links.map((link) => (
              <tr key={link.id} style={{ borderBottom: "1px solid #1a1a24" }}>
                <td style={{ padding: "0.75rem", fontFamily: "monospace", fontSize: "0.85rem" }}>{link.apiName}</td>
                <td style={{ padding: "0.75rem" }}>
                  <span style={{ color: "#a78bfa" }}>{link.fromObjectType}</span>
                  {" → "}
                  <span style={{ color: "#4ade80" }}>{link.toObjectType}</span>
                </td>
                <td style={{ padding: "0.75rem", fontSize: "0.8rem", color: "#888" }}>{link.cardinality}</td>
                <td style={{ padding: "0.75rem" }}>
                  <button onClick={async () => { await deleteLink(workspaceId, link.id); load(); }}
                    style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "0.8rem" }}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showForm && <AddLinkForm workspaceId={workspaceId} objects={objects} onDone={() => { setShowForm(false); load(); }} />}
    </div>
  );
}

function AddLinkForm({ workspaceId, objects, onDone }: { workspaceId: string; objects: ObjectType[]; onDone: () => void }) {
  const [apiName, setApiName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [from, setFrom] = useState(objects[0]?.apiName || "");
  const [to, setTo] = useState(objects[0]?.apiName || "");
  const [cardinality, setCardinality] = useState("MANY_TO_MANY");

  const handleSubmit = async () => {
    if (!apiName || !displayName || !from || !to) return;
    try {
      await createLink(workspaceId, { apiName, displayName, fromObjectType: from, toObjectType: to, cardinality });
      onDone();
    } catch (e: any) { alert(e.message); }
  };

  return (
    <div onClick={() => onDone()} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#1a1a24", border: "1px solid #333", borderRadius: 12, padding: "2rem", width: 400 }}>
        <h3 style={{ margin: "0 0 1.5rem" }}>New Link Type</h3>
        <input value={apiName} onChange={(e) => setApiName(e.target.value)} placeholder="apiName (e.g. FleetMission)" autoFocus
          style={{ width: "100%", background: "#0a0a0f", border: "1px solid #333", color: "#fff", padding: "0.5rem", borderRadius: 6, marginBottom: "0.75rem", boxSizing: "border-box" }} />
        <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Display Name"
          style={{ width: "100%", background: "#0a0a0f", border: "1px solid #333", color: "#fff", padding: "0.5rem", borderRadius: 6, marginBottom: "0.75rem", boxSizing: "border-box" }} />
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
          <select value={from} onChange={(e) => setFrom(e.target.value)} style={{ flex: 1, background: "#0a0a0f", border: "1px solid #333", color: "#fff", padding: "0.5rem", borderRadius: 6 }}>
            {objects.map(o => <option key={o.id} value={o.apiName}>{o.displayName}</option>)}
          </select>
          <span style={{ color: "#888", alignSelf: "center" }}>→</span>
          <select value={to} onChange={(e) => setTo(e.target.value)} style={{ flex: 1, background: "#0a0a0f", border: "1px solid #333", color: "#fff", padding: "0.5rem", borderRadius: 6 }}>
            {objects.map(o => <option key={o.id} value={o.apiName}>{o.displayName}</option>)}
          </select>
        </div>
        <select value={cardinality} onChange={(e) => setCardinality(e.target.value)} style={{ width: "100%", background: "#0a0a0f", border: "1px solid #333", color: "#fff", padding: "0.5rem", borderRadius: 6, marginBottom: "1rem", boxSizing: "border-box" }}>
          <option value="ONE_TO_ONE">One to One</option>
          <option value="ONE_TO_MANY">One to Many</option>
          <option value="MANY_TO_ONE">Many to One</option>
          <option value="MANY_TO_MANY">Many to Many</option>
        </select>
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
          <button onClick={onDone} style={{ background: "transparent", border: "1px solid #333", color: "#888", padding: "0.5rem 1rem", borderRadius: 6, cursor: "pointer" }}>Cancel</button>
          <button onClick={handleSubmit} style={{ background: "#a78bfa", border: "none", color: "#000", fontWeight: 600, padding: "0.5rem 1.2rem", borderRadius: 6, cursor: "pointer" }}>Create</button>
        </div>
      </div>
    </div>
  );
}
