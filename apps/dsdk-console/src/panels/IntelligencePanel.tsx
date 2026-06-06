/* BigPlan Phase 5.1 | Intelligence Agent Panel — OSINT + darkweb surface scan UI */

import { useState } from "react";

interface OsintResult {
  entityName: string;
  scanTimestamp: string;
  signals: {
    signalType: string;
    title: string;
    url: string;
    snippet: string;
    confidence: "LOW" | "MEDIUM" | "HIGH";
  }[];
  riskIndicatorCount: number;
  summary: string;
}

interface IntelligencePanelProps {
  apiUrl: string;
  apiKey: string;
}

export function IntelligencePanel({ apiUrl, apiKey }: IntelligencePanelProps) {
  const [entityName, setEntityName] = useState("");
  const [entityId, setEntityId] = useState("");
  const [result, setResult] = useState<OsintResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeMode, setActiveMode] = useState<"osint" | "darkweb" | "graph">("osint");

  async function runOsintScan() {
    if (!entityName.trim()) {
      setError("Entity name is required");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiUrl}/api/v1/intelligence/osint-scan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": apiKey,
        },
        body: JSON.stringify({ entityName, entityId: entityId || undefined }),
      });
      if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
      const data = (await res.json()) as OsintResult;
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function runDarkwebScan() {
    if (!entityName.trim()) {
      setError("Entity name is required");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiUrl}/api/v1/intelligence/darkweb-surface`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": apiKey,
        },
        body: JSON.stringify({ entityName }),
      });
      if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
      const data = (await res.json()) as OsintResult;
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  const confidenceColor = (c: string) =>
    c === "HIGH" ? "#ef4444" : c === "MEDIUM" ? "#f59e0b" : "#6b7280";

  return (
    <div className="intel-panel">
      <h2>🔍 Intelligence Analysis</h2>

      <div className="intel-mode-tabs">
        {(["osint", "darkweb", "graph"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            className={activeMode === mode ? "mode-tab active" : "mode-tab"}
            onClick={() => setActiveMode(mode)}
          >
            {mode === "osint"
              ? "🌐 OSINT Scan"
              : mode === "darkweb"
                ? "🕵️ Dark Web Surface"
                : "🕸️ Graph Analysis"}
          </button>
        ))}
      </div>

      <div className="intel-form">
        <div className="form-group">
          <label htmlFor="intel-entity-name">Entity Name *</label>
          <input
            id="intel-entity-name"
            type="text"
            placeholder="e.g., Ahmad Santoso, PT Maju Jaya, 1BvBMSEYstWetqTFn5Au4m4..."
            value={entityName}
            onChange={(e) => setEntityName(e.target.value)}
            className="intel-input"
          />
        </div>
        <div className="form-group">
          <label htmlFor="intel-entity-id">Entity ID (optional)</label>
          <input
            id="intel-entity-id"
            type="text"
            placeholder="Daemon entity UUID"
            value={entityId}
            onChange={(e) => setEntityId(e.target.value)}
            className="intel-input"
          />
        </div>
        <button
          id="intel-run-scan"
          type="button"
          className="primary"
          disabled={loading || activeMode === "graph"}
          onClick={activeMode === "osint" ? runOsintScan : runDarkwebScan}
        >
          {loading
            ? "⏳ Scanning..."
            : activeMode === "osint"
              ? "🔍 Run OSINT Scan"
              : activeMode === "darkweb"
                ? "🕵️ Run Dark Web Scan"
                : "🕸️ Graph Analysis (TODO)"}
        </button>
      </div>

      {error && <p className="error">⚠️ {error}</p>}

      {result && (
        <div className="intel-result">
          <div className="result-header">
            <h3>{result.entityName}</h3>
            <span className="result-timestamp">
              {new Date(result.scanTimestamp).toLocaleString("id-ID")}
            </span>
          </div>
          <p className="result-summary">{result.summary}</p>

          {result.riskIndicatorCount > 0 && (
            <div
              className="risk-badge"
              style={{ background: "#ef444422", border: "1px solid #ef4444" }}
            >
              ⚠️ {result.riskIndicatorCount} risk indicator(s) detected
            </div>
          )}

          <div className="signals-list">
            {result.signals.map((signal, idx) => (
              <div key={idx} className="signal-card">
                <div className="signal-header">
                  <span
                    className="signal-type"
                    style={{ color: confidenceColor(signal.confidence) }}
                  >
                    [{signal.confidence}] {signal.signalType.replace(/_/g, " ")}
                  </span>
                </div>
                <p className="signal-title">
                  <a href={signal.url} target="_blank" rel="noopener noreferrer">
                    {signal.title}
                  </a>
                </p>
                <p className="signal-snippet">{signal.snippet}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
