/* BigPlan Phase 5.1 | Case Management Panel — investigation case tracker */

import { useState } from "react";

interface IntelCase {
  caseId: string;
  title: string;
  status: "OPEN" | "IN_PROGRESS" | "PENDING_APPROVAL" | "CLOSED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  entityIds: string[];
  assignedTo: string;
  createdAt: string;
  updatedAt: string;
  strDraftCount: number;
}

interface CaseManagementPanelProps {
  apiUrl: string;
  apiKey: string;
}

const STATUS_COLORS: Record<IntelCase["status"], string> = {
  OPEN: "#3b82f6",
  IN_PROGRESS: "#f59e0b",
  PENDING_APPROVAL: "#8b5cf6",
  CLOSED: "#6b7280",
};

const PRIORITY_COLORS: Record<IntelCase["priority"], string> = {
  LOW: "#6b7280",
  MEDIUM: "#f59e0b",
  HIGH: "#ef4444",
  CRITICAL: "#dc2626",
};

const MOCK_CASES: IntelCase[] = [
  {
    caseId: "CASE-2026-001",
    title: "Investigasi Structuring — Nasabah A",
    status: "IN_PROGRESS",
    priority: "HIGH",
    entityIds: ["ent-001", "ent-002"],
    assignedTo: "Analis Senior",
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
    strDraftCount: 1,
  },
  {
    caseId: "CASE-2026-002",
    title: "Crypto Mixing — Wallet Cluster B",
    status: "PENDING_APPROVAL",
    priority: "CRITICAL",
    entityIds: ["ent-003"],
    assignedTo: "Tim Kripto",
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    updatedAt: new Date(Date.now() - 7200000).toISOString(),
    strDraftCount: 2,
  },
  {
    caseId: "CASE-2026-003",
    title: "Shell Company Chain — PT XYZ Group",
    status: "OPEN",
    priority: "MEDIUM",
    entityIds: ["ent-004", "ent-005", "ent-006"],
    assignedTo: "Belum Ditugaskan",
    createdAt: new Date(Date.now() - 1800000).toISOString(),
    updatedAt: new Date(Date.now() - 1800000).toISOString(),
    strDraftCount: 0,
  },
];

export function CaseManagementPanel({ apiUrl: _apiUrl, apiKey: _apiKey }: CaseManagementPanelProps) {
  const [cases] = useState<IntelCase[]>(MOCK_CASES);
  const [selected, setSelected] = useState<IntelCase | null>(null);
  const [filter, setFilter] = useState<"ALL" | IntelCase["status"]>("ALL");

  const filteredCases =
    filter === "ALL" ? cases : cases.filter((c) => c.status === filter);

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="case-panel">
      <div className="case-header">
        <h2>📁 Case Management</h2>
        <button
          id="case-new-btn"
          type="button"
          className="primary"
          onClick={() => alert("TODO: new case form")}
        >
          + New Case
        </button>
      </div>

      <div className="case-filters">
        {(["ALL", "OPEN", "IN_PROGRESS", "PENDING_APPROVAL", "CLOSED"] as const).map(
          (s) => (
            <button
              key={s}
              type="button"
              className={filter === s ? "filter-btn active" : "filter-btn"}
              onClick={() => setFilter(s)}
            >
              {s.replace(/_/g, " ")} (
              {s === "ALL" ? cases.length : cases.filter((c) => c.status === s).length})
            </button>
          ),
        )}
      </div>

      <div className="case-list">
        {filteredCases.map((c) => (
          <div
            key={c.caseId}
            className={`case-card ${selected?.caseId === c.caseId ? "selected" : ""}`}
            onClick={() => setSelected(c)}
            onKeyDown={(e) => e.key === "Enter" && setSelected(c)}
            role="button"
            tabIndex={0}
          >
            <div className="case-card-header">
              <span className="case-id">{c.caseId}</span>
              <span
                className="case-priority"
                style={{ color: PRIORITY_COLORS[c.priority], fontWeight: 700 }}
              >
                {c.priority}
              </span>
            </div>
            <p className="case-title">{c.title}</p>
            <div className="case-meta">
              <span
                className="case-status"
                style={{
                  background: STATUS_COLORS[c.status] + "22",
                  color: STATUS_COLORS[c.status],
                }}
              >
                {c.status.replace(/_/g, " ")}
              </span>
              <span className="case-assigned">👤 {c.assignedTo}</span>
              {c.strDraftCount > 0 && (
                <span className="case-str-badge">📋 {c.strDraftCount} STR draft</span>
              )}
            </div>
            <p className="case-date">Updated: {formatDate(c.updatedAt)}</p>
          </div>
        ))}
      </div>

      {selected && (
        <div className="case-detail">
          <h3>{selected.title}</h3>
          <table className="detail-table">
            <tbody>
              <tr>
                <td>Case ID</td>
                <td>
                  <code>{selected.caseId}</code>
                </td>
              </tr>
              <tr>
                <td>Status</td>
                <td style={{ color: STATUS_COLORS[selected.status] }}>{selected.status}</td>
              </tr>
              <tr>
                <td>Priority</td>
                <td style={{ color: PRIORITY_COLORS[selected.priority] }}>
                  {selected.priority}
                </td>
              </tr>
              <tr>
                <td>Assigned To</td>
                <td>{selected.assignedTo}</td>
              </tr>
              <tr>
                <td>Entities</td>
                <td>{selected.entityIds.join(", ")}</td>
              </tr>
              <tr>
                <td>STR Drafts</td>
                <td>{selected.strDraftCount}</td>
              </tr>
              <tr>
                <td>Created</td>
                <td>{formatDate(selected.createdAt)}</td>
              </tr>
              <tr>
                <td>Updated</td>
                <td>{formatDate(selected.updatedAt)}</td>
              </tr>
            </tbody>
          </table>
          <div className="case-actions row">
            <button
              type="button"
              className="primary"
              onClick={() => alert("TODO: open STR review")}
            >
              📋 Review STR Drafts
            </button>
            <button type="button" onClick={() => alert("TODO: run graph analysis")}>
              🕸️ Graph Analysis
            </button>
            <button type="button" onClick={() => alert("TODO: export case")}>
              ⬇️ Export
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
