/* BigPlan Phase 5.3 | Credit Monitor Panel — YDC API usage & budget tracking */

import { useState } from "react";

interface CreditUsage {
  totalBudgetUSD: number;
  usedUSD: number;
  remainingUSD: number;
  alertThresholdUSD: number;
  hardLimitUSD: number;
  queriesTotal: number;
  queriesLast24h: number;
  avgCostPerQuery: number;
  projectedExhaustionDate: string | null;
  lastUpdated: string;
  queryLog: {
    queryId: string;
    timestamp: string;
    mode: "search" | "contents" | "research";
    query: string;
    costUSD: number;
    entityId?: string;
  }[];
}

const MOCK_CREDIT: CreditUsage = {
  totalBudgetUSD: 100,
  usedUSD: 4.73,
  remainingUSD: 95.27,
  alertThresholdUSD: 10,
  hardLimitUSD: 5,
  queriesTotal: 47,
  queriesLast24h: 12,
  avgCostPerQuery: 0.1,
  projectedExhaustionDate: null,
  lastUpdated: new Date().toISOString(),
  queryLog: [
    {
      queryId: "q-001",
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      mode: "search",
      query: "Ahmad Santoso PPATK darkweb",
      costUSD: 0.08,
      entityId: "ent-001",
    },
    {
      queryId: "q-002",
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      mode: "research",
      query: "PT Maju Jaya money laundering Indonesia",
      costUSD: 0.35,
      entityId: "ent-002",
    },
    {
      queryId: "q-003",
      timestamp: new Date(Date.now() - 10800000).toISOString(),
      mode: "contents",
      query: "crypto wallet darkweb exposure",
      costUSD: 0.12,
    },
  ],
};

interface CreditMonitorPanelProps {
  apiUrl: string;
  apiKey: string;
}

export function CreditMonitorPanel({ apiUrl, apiKey }: CreditMonitorPanelProps) {
  const [credit, setCredit] = useState<CreditUsage>(MOCK_CREDIT);
  const [loading, setLoading] = useState(false);

  const usagePercent = (credit.usedUSD / credit.totalBudgetUSD) * 100;
  const isWarning = credit.remainingUSD <= credit.alertThresholdUSD;
  const isDanger = credit.remainingUSD <= credit.hardLimitUSD;

  const barColor = isDanger ? "#ef4444" : isWarning ? "#f59e0b" : "#10b981";

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/v1/intelligence/credit-usage`, {
        headers: { "X-API-Key": apiKey },
      });
      if (res.ok) {
        const data = (await res.json()) as CreditUsage;
        setCredit(data);
      }
    } catch {
      // Keep mock data if API not available
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="credit-panel">
      <div className="credit-header">
        <h2>💳 YDC Credit Monitor</h2>
        <button
          id="credit-refresh-btn"
          type="button"
          onClick={refresh}
          disabled={loading}
          className="refresh-btn"
        >
          {loading ? "⏳" : "🔄"} Refresh
        </button>
      </div>

      {isDanger && (
        <div className="credit-alert danger">
          🚨 PERINGATAN KRITIS: Kredit tersisa <strong>${credit.remainingUSD.toFixed(2)}</strong> —
          di bawah hard limit! Query YDC akan diblokir otomatis.
        </div>
      )}
      {isWarning && !isDanger && (
        <div className="credit-alert warning">
          ⚠️ Kredit mendekati batas peringatan (${credit.alertThresholdUSD}). Sisa:{" "}
          <strong>${credit.remainingUSD.toFixed(2)}</strong>
        </div>
      )}

      <div className="credit-summary">
        <div className="credit-stat">
          <span className="stat-label">Total Budget</span>
          <span className="stat-value">${credit.totalBudgetUSD.toFixed(2)}</span>
        </div>
        <div className="credit-stat">
          <span className="stat-label">Used</span>
          <span className="stat-value" style={{ color: barColor }}>
            ${credit.usedUSD.toFixed(2)}
          </span>
        </div>
        <div className="credit-stat">
          <span className="stat-label">Remaining</span>
          <span className="stat-value" style={{ color: barColor, fontWeight: 700 }}>
            ${credit.remainingUSD.toFixed(2)}
          </span>
        </div>
        <div className="credit-stat">
          <span className="stat-label">Total Queries</span>
          <span className="stat-value">{credit.queriesTotal}</span>
        </div>
        <div className="credit-stat">
          <span className="stat-label">Queries (24h)</span>
          <span className="stat-value">{credit.queriesLast24h}</span>
        </div>
        <div className="credit-stat">
          <span className="stat-label">Avg Cost/Query</span>
          <span className="stat-value">${credit.avgCostPerQuery.toFixed(3)}</span>
        </div>
      </div>

      <div className="credit-bar-container">
        <div className="credit-bar-track">
          <div
            className="credit-bar-fill"
            style={{ width: `${Math.min(100, usagePercent)}%`, background: barColor }}
          />
        </div>
        <div className="credit-bar-labels">
          <span>{usagePercent.toFixed(1)}% used</span>
          <span>
            Alert: ${credit.alertThresholdUSD} | Hard limit: ${credit.hardLimitUSD}
          </span>
        </div>
      </div>

      <div className="query-log">
        <h3>Recent Queries</h3>
        <table className="log-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Mode</th>
              <th>Query</th>
              <th>Cost</th>
              <th>Entity</th>
            </tr>
          </thead>
          <tbody>
            {credit.queryLog.map((q) => (
              <tr key={q.queryId}>
                <td className="log-time">
                  {new Date(q.timestamp).toLocaleTimeString("id-ID")}
                </td>
                <td>
                  <span className={`mode-badge mode-${q.mode}`}>{q.mode}</span>
                </td>
                <td className="log-query">
                  {q.query.slice(0, 60)}
                  {q.query.length > 60 ? "..." : ""}
                </td>
                <td className="log-cost">${q.costUSD.toFixed(3)}</td>
                <td className="log-entity">{q.entityId ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="credit-footer">
        Last updated: {new Date(credit.lastUpdated).toLocaleString("id-ID")}
      </p>
    </div>
  );
}
