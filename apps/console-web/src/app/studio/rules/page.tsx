"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getRules, createRule, deleteRule, compileRule, getObjects } from "@/lib/studio-api";
import type { Rule, RuleCondition, RuleSignal, ObjectType } from "@/lib/studio-api";

const OPS = [
  { value: "eq", label: "=" },
  { value: "neq", label: "!=" },
  { value: "gt", label: ">" },
  { value: "gte", label: ">=" },
  { value: "lt", label: "<" },
  { value: "lte", label: "<=" },
  { value: "in", label: "IN" },
  { value: "contains", label: "contains" },
  { value: "regex", label: "~=" },
];

const SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

const CRON_PRESETS = [
  { value: "* * * * *", label: "Every minute" },
  { value: "*/5 * * * *", label: "Every 5 minutes" },
  { value: "*/15 * * * *", label: "Every 15 minutes" },
  { value: "0 * * * *", label: "Hourly" },
  { value: "0 */6 * * *", label: "Every 6 hours" },
  { value: "0 0 * * *", label: "Daily at midnight" },
];

export default function RulesPage() {
  return (
    <Suspense fallback={<div style={{ color: "#666", padding: "2rem" }}>Loading rule designer...</div>}>
      <RulesPageContent />
    </Suspense>
  );
}

function RulesPageContent() {
  const searchParams = useSearchParams();
  const workspaceId = searchParams.get("workspace") || "";
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [compileResult, setCompileResult] = useState<Record<string, any>>({});

  const load = async () => {
    if (!workspaceId) { setLoading(false); return; }
    setError("");
    try {
      const items = await getRules(workspaceId);
      setRules(items);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [workspaceId]);

  const handleDelete = async (ruleId: string) => {
    if (!confirm("Delete this rule?")) return;
    await deleteRule(workspaceId, ruleId);
    load();
  };

  const handleCompile = async (ruleId: string) => {
    try {
      const result = await compileRule(workspaceId, ruleId);
      setCompileResult((prev) => ({ ...prev, [ruleId]: result }));
    } catch (e: any) {
      alert(e.message);
    }
  };

  if (!workspaceId) return <div style={{ color: "#666" }}>Select a workspace from the Dashboard first.</div>;
  if (loading) return <div style={{ color: "#666" }}>Loading...</div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 600, margin: 0 }}>Rule Designer</h2>
          <p style={{ fontSize: "0.8rem", color: "#666", margin: "0.25rem 0 0" }}>
            Define detection rules over your object types
          </p>
        </div>
        <button onClick={() => setShowForm(true)} style={{
          background: "#a78bfa", color: "#000", border: "none", padding: "0.4rem 1rem",
          borderRadius: 6, fontWeight: 600, cursor: "pointer", fontSize: "0.85rem",
        }}>+ New Rule</button>
      </div>

      {error && <div style={{ color: "#f87171", marginBottom: "1rem" }}>{error}</div>}

      {rules.length === 0 ? (
        <div style={{ color: "#555", padding: "3rem", textAlign: "center" }}>
          <p style={{ fontSize: "1.5rem", margin: "0 0 0.5rem" }}>⚑</p>
          <p>No rules defined yet. Create your first detection rule above.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {rules.map((rule) => (
            <div key={rule.id} style={{
              background: "#111118", border: "1px solid #222", borderRadius: 8, padding: "1.25rem",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "0.75rem" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 600, fontFamily: "monospace" }}>
                      {rule.displayName}
                    </h3>
                    <span style={{
                      background: getSeverityColor(rule.signal.severity) + "20",
                      color: getSeverityColor(rule.signal.severity),
                      padding: "0.1rem 0.4rem", borderRadius: 10, fontSize: "0.65rem", fontWeight: 700,
                    }}>{rule.signal.severity}</span>
                    <span style={{
                      background: rule.enabled !== false ? "#1a2e1a" : "#2e1e1a",
                      color: rule.enabled !== false ? "#4ade80" : "#f87171",
                      padding: "0.1rem 0.4rem", borderRadius: 10, fontSize: "0.65rem", fontWeight: 600,
                    }}>{rule.enabled !== false ? "Active" : "Disabled"}</span>
                  </div>
                  <p style={{ margin: "0.25rem 0 0", fontSize: "0.75rem", color: "#666" }}>
                    on <span style={{ color: "#a78bfa" }}>{rule.sourceObjectType}</span>
                    {" · "}{rule.schedule}
                    {" · "}{rule.conditions?.length || 0} condition{rule.conditions?.length !== 1 ? "s" : ""}
                    {" · "}{rule.conditionLogic || "AND"}
                  </p>
                  {rule.signal.titleTemplate && (
                    <p style={{ margin: "0.25rem 0 0", fontSize: "0.75rem", color: "#888" }}>
                      Signal: &ldquo;{rule.signal.titleTemplate}&rdquo;
                    </p>
                  )}
                </div>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <button onClick={() => handleCompile(rule.id)} style={{
                    background: "transparent", border: "1px solid #333", color: "#facc15",
                    padding: "0.3rem 0.6rem", borderRadius: 4, cursor: "pointer", fontSize: "0.7rem",
                  }}>Compile</button>
                  <button onClick={() => handleDelete(rule.id)} style={{
                    background: "transparent", border: "none", color: "#ef4444",
                    cursor: "pointer", fontSize: "0.8rem",
                  }}>Delete</button>
                </div>
              </div>

              {/* Conditions display */}
              {rule.conditions && rule.conditions.length > 0 && (
                <div style={{ marginTop: "0.5rem" }}>
                  <p style={{ fontSize: "0.7rem", color: "#555", margin: "0 0 0.4rem", textTransform: "uppercase" }}>
                    Conditions ({rule.conditionLogic || "AND"})
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                    {rule.conditions.map((c, i) => (
                      <div key={i} style={{
                        display: "flex", alignItems: "center", gap: "0.5rem",
                        background: "#0a0a0f", borderRadius: 4, padding: "0.35rem 0.6rem",
                        fontSize: "0.75rem",
                      }}>
                        <span style={{ color: "#a78bfa", fontFamily: "monospace" }}>{c.field}</span>
                        <span style={{ color: "#888" }}>{c.op}</span>
                        <span style={{ color: "#4ade80", fontFamily: "monospace", fontWeight: 600 }}>
                          {typeof c.value === "string" ? c.value : JSON.stringify(c.value)}
                        </span>
                        {i < rule.conditions.length - 1 && (
                          <span style={{
                            color: "#facc15", fontSize: "0.65rem", fontWeight: 700,
                            background: "#1a1a0e", padding: "0.1rem 0.35rem", borderRadius: 3,
                          }}>{rule.conditionLogic || "AND"}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Compile result */}
              {compileResult[rule.id] && (
                <div style={{
                  marginTop: "0.75rem", padding: "0.75rem",
                  background: "#0a1a0a", border: "1px solid #1a3a1a", borderRadius: 6,
                  fontSize: "0.75rem",
                }}>
                  <span style={{ color: "#4ade80", fontWeight: 600 }}>✓ Compiled</span>
                  <pre style={{
                    color: "#888", margin: "0.4rem 0 0", maxHeight: 150, overflow: "auto",
                    whiteSpace: "pre-wrap", fontFamily: "monospace",
                  }}>
                    {JSON.stringify(compileResult[rule.id], null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <AddRuleForm
          workspaceId={workspaceId}
          onDone={() => { setShowForm(false); load(); }}
        />
      )}
    </div>
  );
}

function getSeverityColor(severity: string): string {
  const map: Record<string, string> = {
    LOW: "#3b82f6",
    MEDIUM: "#facc15",
    HIGH: "#f97316",
    CRITICAL: "#ef4444",
  };
  return map[severity] || "#888";
}

// ── Add Rule Form ──────────────────────────────────────

function AddRuleForm({ workspaceId, onDone }: { workspaceId: string; onDone: () => void }) {
  const [apiName, setApiName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [sourceObjectType, setSourceObjectType] = useState("");
  const [schedule, setSchedule] = useState("*/15 * * * *");
  const [conditionLogic, setConditionLogic] = useState("AND");
  const [conditions, setConditions] = useState<RuleCondition[]>([
    { field: "", op: "eq", value: "" },
  ]);
  const [signal, setSignal] = useState<RuleSignal>({
    severity: "HIGH",
    titleTemplate: "",
    bodyTemplate: "",
  });
  const [objects, setObjects] = useState<ObjectType[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<"basics" | "conditions" | "signal">("basics");

  useEffect(() => {
    getObjects(workspaceId).then(setObjects).catch(() => {});
  }, [workspaceId]);

  const handleSubmit = async () => {
    if (!apiName || !displayName || !sourceObjectType) {
      alert("Please fill in all required fields.");
      return;
    }
    setSubmitting(true);
    try {
      await createRule(workspaceId, {
        apiName,
        displayName,
        sourceObjectType,
        schedule,
        conditionLogic,
        conditions: conditions.filter((c) => c.field && c.value !== ""),
        signal,
      });
      onDone();
    } catch (e: any) { alert(e.message); }
    setSubmitting(false);
  };

  const fieldStyle: React.CSSProperties = {
    width: "100%", background: "#0a0a0f", border: "1px solid #333", color: "#fff",
    padding: "0.5rem", borderRadius: 6, marginBottom: "0.75rem", boxSizing: "border-box",
    fontSize: "0.85rem",
  };

  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: "0.75rem", color: "#888", marginBottom: "0.3rem",
    fontWeight: 600, textTransform: "uppercase",
  };

  return (
    <div onClick={() => onDone()} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "#1a1a24", border: "1px solid #333", borderRadius: 12, padding: "2rem",
        width: 550, maxWidth: "95vw", maxHeight: "90vh", overflow: "auto",
      }}>
        <h3 style={{ margin: "0 0 1.5rem", fontSize: "1.1rem" }}>New Rule</h3>

        {/* Step indicator */}
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
          {(["basics", "conditions", "signal"] as const).map((s, i) => (
            <button key={s} onClick={() => setStep(s)} style={{
              flex: 1, padding: "0.4rem", borderRadius: 6, border: step === s ? "1px solid #a78bfa" : "1px solid #333",
              background: step === s ? "#1a1a2e" : "transparent", color: step === s ? "#a78bfa" : "#555",
              cursor: "pointer", fontSize: "0.75rem", fontWeight: 600,
            }}>
              {i + 1}. {s === "basics" ? "Basics" : s === "conditions" ? "Conditions" : "Signal"}
            </button>
          ))}
        </div>

        {step === "basics" && (
          <div>
            <label style={labelStyle}>API Name *</label>
            <input value={apiName} onChange={(e) => setApiName(e.target.value)}
              placeholder="e.g. FleetNotReady" autoFocus style={fieldStyle} />

            <label style={labelStyle}>Display Name *</label>
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Fleet Not Ready" style={fieldStyle} />

            <label style={labelStyle}>Source Object Type *</label>
            <select value={sourceObjectType} onChange={(e) => setSourceObjectType(e.target.value)} style={fieldStyle}>
              <option value="">-- Select object type --</option>
              {objects.map((o) => (
                <option key={o.id} value={o.apiName}>{o.displayName} ({o.apiName})</option>
              ))}
            </select>

            <label style={labelStyle}>Schedule (cron)</label>
            <select value={schedule} onChange={(e) => setSchedule(e.target.value)} style={fieldStyle}>
              {CRON_PRESETS.map((p) => (
                <option key={p.value} value={p.value}>{p.label} ({p.value})</option>
              ))}
            </select>
            <input value={schedule} onChange={(e) => setSchedule(e.target.value)}
              placeholder="Custom cron expression" style={{ ...fieldStyle, marginTop: "-0.25rem" }} />

            <label style={labelStyle}>Condition Logic</label>
            <select value={conditionLogic} onChange={(e) => setConditionLogic(e.target.value)} style={fieldStyle}>
              <option value="AND">AND — all conditions must match</option>
              <option value="OR">OR — any condition matches</option>
            </select>
          </div>
        )}

        {step === "conditions" && (
          <div>
            <label style={labelStyle}>Conditions</label>
            {conditions.map((cond, idx) => (
              <div key={idx} style={{
                background: "#111118", border: "1px solid #222", borderRadius: 8,
                padding: "0.75rem", marginBottom: "0.75rem",
              }}>
                <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  <input value={cond.field} onChange={(e) => {
                    const next = [...conditions];
                    next[idx] = { ...next[idx], field: e.target.value };
                    setConditions(next);
                  }} placeholder="Field name" style={{ flex: 1, ...fieldStyle, marginBottom: 0 }} />
                  <select value={cond.op} onChange={(e) => {
                    const next = [...conditions];
                    next[idx] = { ...next[idx], op: e.target.value };
                    setConditions(next);
                  }} style={{ width: 100, ...fieldStyle, marginBottom: 0 }}>
                    {OPS.map((op) => (
                      <option key={op.value} value={op.value}>{op.label}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <input value={typeof cond.value === "string" ? cond.value : JSON.stringify(cond.value)}
                    onChange={(e) => {
                      const next = [...conditions];
                      next[idx] = { ...next[idx], value: e.target.value };
                      setConditions(next);
                    }}
                    placeholder="Value" style={{ flex: 1, ...fieldStyle, marginBottom: 0 }} />
                  {conditions.length > 1 && (
                    <button onClick={() => {
                      setConditions(conditions.filter((_, i) => i !== idx));
                    }} style={{
                      background: "transparent", border: "none", color: "#ef4444",
                      cursor: "pointer", fontSize: "1.2rem", padding: "0 0.3rem",
                    }}>×</button>
                  )}
                </div>
              </div>
            ))}
            <button onClick={() => setConditions([...conditions, { field: "", op: "eq", value: "" }])} style={{
              background: "transparent", border: "1px dashed #333", color: "#a78bfa",
              padding: "0.4rem 1rem", borderRadius: 6, cursor: "pointer", fontSize: "0.8rem",
              width: "100%",
            }}>
              + Add Condition
            </button>
          </div>
        )}

        {step === "signal" && (
          <div>
            <label style={labelStyle}>Severity *</label>
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
              {SEVERITIES.map((sev) => (
                <button key={sev} onClick={() => setSignal({ ...signal, severity: sev })} style={{
                  flex: 1, padding: "0.4rem", borderRadius: 6,
                  border: signal.severity === sev ? `2px solid ${getSeverityColor(sev)}` : "1px solid #333",
                  background: signal.severity === sev ? getSeverityColor(sev) + "20" : "transparent",
                  color: signal.severity === sev ? getSeverityColor(sev) : "#555",
                  cursor: "pointer", fontSize: "0.75rem", fontWeight: 600,
                }}>{sev}</button>
              ))}
            </div>

            <label style={labelStyle}>Title Template *</label>
            <input value={signal.titleTemplate} onChange={(e) => setSignal({ ...signal, titleTemplate: e.target.value })}
              placeholder="e.g. Fleet {{fleet_id}} not ready" style={fieldStyle} />

            <label style={labelStyle}>Body Template (optional)</label>
            <textarea value={signal.bodyTemplate || ""} onChange={(e) => setSignal({ ...signal, bodyTemplate: e.target.value })}
              placeholder="e.g. Readiness: {{readiness}}, Drone count: {{drone_count}}"
              style={{ ...fieldStyle, minHeight: 60, resize: "vertical" }} />
          </div>
        )}

        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "space-between", marginTop: "1rem" }}>
          <div>
            {step !== "basics" && (
              <button onClick={() => setStep(step === "signal" ? "conditions" : "basics")} style={{
                background: "transparent", border: "1px solid #333", color: "#888",
                padding: "0.5rem 1rem", borderRadius: 6, cursor: "pointer",
              }}>← Back</button>
            )}
          </div>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button onClick={() => onDone()} style={{
              background: "transparent", border: "1px solid #333", color: "#888",
              padding: "0.5rem 1rem", borderRadius: 6, cursor: "pointer",
            }}>Cancel</button>
            {step !== "signal" ? (
              <button onClick={() => setStep(step === "basics" ? "conditions" : "signal")} style={{
                background: "#1a1a2e", border: "1px solid #a78bfa", color: "#a78bfa",
                padding: "0.5rem 1.2rem", borderRadius: 6, cursor: "pointer", fontWeight: 600,
              }}>Next →</button>
            ) : (
              <button onClick={handleSubmit} disabled={submitting} style={{
                background: "#a78bfa", border: "none", color: "#000", fontWeight: 600,
                padding: "0.5rem 1.2rem", borderRadius: 6, cursor: "pointer",
                opacity: submitting ? 0.5 : 1,
              }}>{submitting ? "Creating..." : "Create Rule"}</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
