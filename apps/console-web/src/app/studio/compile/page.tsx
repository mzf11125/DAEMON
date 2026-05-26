"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { validateWorkspace, compileWorkspace } from "@/lib/studio-api";

export default function CompilePage() {
  const searchParams = useSearchParams();
  const workspaceId = searchParams.get("workspace") || "";
  const [validateResult, setValidateResult] = useState<any>(null);
  const [compileResult, setCompileResult] = useState<any>(null);
  const [validating, setValidating] = useState(false);
  const [compiling, setCompiling] = useState(false);
  const [summary, setSummary] = useState("");

  const handleValidate = async () => {
    setValidating(true);
    try {
      const r = await validateWorkspace(workspaceId);
      setValidateResult(r);
    } catch (e: any) { alert(e.message); }
    setValidating(false);
  };

  const handleCompile = async () => {
    setCompiling(true);
    try {
      const r = await compileWorkspace(workspaceId, summary);
      setCompileResult(r);
    } catch (e: any) { alert(e.message); }
    setCompiling(false);
  };

  if (!workspaceId) return <div style={{ color: "#666" }}>Select a workspace first.</div>;

  return (
    <div>
      <h2 style={{ fontSize: "1.25rem", fontWeight: 600, margin: "0 0 2rem" }}>Compile & Publish</h2>

      {/* Validate */}
      <section style={{ marginBottom: "2rem", background: "#111118", border: "1px solid #222", borderRadius: 8, padding: "1.5rem" }}>
        <h3 style={{ margin: "0 0 1rem", fontSize: "1rem" }}>1. Validate</h3>
        <p style={{ fontSize: "0.85rem", color: "#888", marginBottom: "1rem" }}>
          Check workspace for errors: unresolved references, duplicate names, missing required fields.
        </p>
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
              {validateResult.valid ? "✓ Valid" : "✗ Has Errors"}
            </p>
            {validateResult.errors?.length > 0 && (
              <ul style={{ marginTop: "0.5rem", paddingLeft: "1.2rem", color: "#f87171", fontSize: "0.85rem" }}>
                {validateResult.errors.map((e: any, i: number) => (
                  <li key={i}><strong>{e.path}</strong>: {e.message}</li>
                ))}
              </ul>
            )}
            {validateResult.warnings?.length > 0 && (
              <ul style={{ marginTop: "0.5rem", paddingLeft: "1.2rem", color: "#facc15", fontSize: "0.85rem" }}>
                {validateResult.warnings.map((w: any, i: number) => (
                  <li key={i}>{w.message}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      {/* Compile */}
      <section style={{ marginBottom: "2rem", background: "#111118", border: "1px solid #222", borderRadius: 8, padding: "1.5rem" }}>
        <h3 style={{ margin: "0 0 1rem", fontSize: "1rem" }}>2. Compile</h3>
        <p style={{ fontSize: "0.85rem", color: "#888", marginBottom: "1rem" }}>
          Generate a version snapshot. Describe what changed.
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
            <p>Version {compileResult.version} saved — {compileResult.objectCount} objects</p>
          </div>
        )}
      </section>
    </div>
  );
}
