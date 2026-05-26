"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { validateWorkspace, compileWorkspace } from "@/lib/studio-api";

const BASE = process.env.NEXT_PUBLIC_ONTOLOGY_BUILDER_URL || "http://localhost:8085";

async function getMigrationPreview(workspaceId: string) {
  const res = await fetch(`${BASE}/v1/workspaces/${workspaceId}/migrations/preview`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Tenant-Id": typeof window !== "undefined" ? localStorage.getItem("tenantId") || "tenant-demo" : "tenant-demo",
    },
  });
  if (!res.ok) throw new Error("Migration preview failed");
  return res.json();
}

export default function CompilePage() {
  const searchParams = useSearchParams();
  const workspaceId = searchParams.get("workspace") || "";
  const [validateResult, setValidateResult] = useState<any>(null);
  const [compileResult, setCompileResult] = useState<any>(null);
  const [migrationResult, setMigrationResult] = useState<any>(null);
  const [validating, setValidating] = useState(false);
  const [compiling, setCompiling] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [summary, setSummary] = useState("");

  if (!workspaceId) return <div style={{ color: "#666" }}>Select a workspace first.</div>;

  const handleValidate = async () => {
    setValidating(true);
    try { setValidateResult(await validateWorkspace(workspaceId)); }
    catch (e: any) { alert(e.message); }
    setValidating(false);
  };

  const handleCompile = async () => {
    setCompiling(true);
    try { setCompileResult(await compileWorkspace(workspaceId, summary)); }
    catch (e: any) { alert(e.message); }
    setCompiling(false);
  };

  const handleMigrationPreview = async () => {
    setMigrating(true);
    try { setMigrationResult(await getMigrationPreview(workspaceId)); }
    catch (e: any) { alert(e.message); }
    setMigrating(false);
  };

  return (
    <div>
      <h2 style={{ fontSize: "1.25rem", fontWeight: 600, margin: "0 0 2rem" }}>Compile & Publish</h2>

      {/* Validate */}
      <section style={{ marginBottom: "1.5rem", background: "#111118", border: "1px solid #222", borderRadius: 8, padding: "1.5rem" }}>
        <h3 style={{ margin: "0 0 1rem", fontSize: "1rem" }}>1. Validate</h3>
        <button onClick={handleValidate} disabled={validating} style={{
          background: "#1a1a2e", border: "1px solid #333", color: "#a78bfa",
          padding: "0.5rem 1.2rem", borderRadius: 6, cursor: "pointer", fontWeight: 600,
          opacity: validating ? 0.5 : 1,
        }}>
          {validating ? "Validating..." : "Validate Workspace"}
        </button>
        {validateResult && (
          <div style={{ marginTop: "1rem", padding: "1rem", background: "#0a0a0f", borderRadius: 6 }}>
            <p style={{ fontWeight: 600, color: validateResult.valid ? "#4ade80" : "#f87171" }}>
              {validateResult.valid ? "✓ Valid" : "✗ Has Errors"} ({validateResult.objectCount} objects)
            </p>
            {validateResult.errors?.map((e: any, i: number) => (
              <p key={i} style={{ color: "#f87171", fontSize: "0.8rem", margin: "0.25rem 0" }}>
                <strong>{e.path}</strong>: {e.message}
              </p>
            ))}
          </div>
        )}
      </section>

      {/* Migration Preview */}
      <section style={{ marginBottom: "1.5rem", background: "#111118", border: "1px solid #222", borderRadius: 8, padding: "1.5rem" }}>
        <h3 style={{ margin: "0 0 1rem", fontSize: "1rem" }}>2. Migration Preview (DDL)</h3>
        <p style={{ fontSize: "0.85rem", color: "#888", marginBottom: "1rem" }}>
          Preview SQL schema changes: new tables, new columns. Nothing is applied yet.
        </p>
        <button onClick={handleMigrationPreview} disabled={migrating} style={{
          background: "#1a1a2e", border: "1px solid #333", color: "#facc15",
          padding: "0.5rem 1.2rem", borderRadius: 6, cursor: "pointer", fontWeight: 600,
          opacity: migrating ? 0.5 : 1,
        }}>
          {migrating ? "Generating..." : "Preview Migrations"}
        </button>
        {migrationResult && (
          <div style={{ marginTop: "1rem" }}>
            {migrationResult.sql?.map((s: any, i: number) => (
              <div key={i} style={{ marginBottom: "0.75rem", padding: "0.75rem", background: "#0a0a0f", borderRadius: 6 }}>
                <p style={{ color: "#888", fontSize: "0.75rem", margin: "0 0 0.5rem" }}>{s.reason}</p>
                <pre style={{
                  color: "#facc15", fontSize: "0.75rem", margin: 0,
                  whiteSpace: "pre-wrap", fontFamily: "monospace", background: "#050510",
                  padding: "0.5rem", borderRadius: 4, overflow: "auto",
                }}>{s.statement}</pre>
              </div>
            ))}
            {(!migrationResult.sql || migrationResult.sql.length === 0) && (
              <p style={{ color: "#888", fontSize: "0.85rem" }}>No schema changes detected.</p>
            )}
          </div>
        )}
      </section>

      {/* Compile */}
      <section style={{ marginBottom: "1.5rem", background: "#111118", border: "1px solid #222", borderRadius: 8, padding: "1.5rem" }}>
        <h3 style={{ margin: "0 0 1rem", fontSize: "1rem" }}>3. Compile</h3>
        <p style={{ fontSize: "0.85rem", color: "#888", marginBottom: "1rem" }}>
          Compile workspace to disk and save a version snapshot.
        </p>
        <input value={summary} onChange={(e) => setSummary(e.target.value)}
          placeholder="Change summary (e.g. Added DroneFleet object type)" style={{
            width: "100%", background: "#0a0a0f", border: "1px solid #333", color: "#fff",
            padding: "0.5rem", borderRadius: 6, marginBottom: "1rem", boxSizing: "border-box",
          }} />
        <button onClick={handleCompile} disabled={compiling} style={{
          background: "#a78bfa", border: "none", color: "#000",
          padding: "0.5rem 1.2rem", borderRadius: 6, cursor: "pointer", fontWeight: 600,
          opacity: compiling ? 0.5 : 1,
        }}>
          {compiling ? "Compiling..." : "Compile & Save Version"}
        </button>
        {compileResult && (
          <div style={{ marginTop: "1rem", padding: "1rem", background: "#0a0a0f", borderRadius: 6, color: "#4ade80" }}>
            <p>✓ Version {compileResult.version} — {compileResult.objectCount} objects</p>
            {compileResult.compiledPath && (
              <p style={{ fontSize: "0.75rem", color: "#888", margin: "0.25rem 0" }}>
                Written to: {compileResult.compiledPath}
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
