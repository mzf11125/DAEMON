/* BigPlan Phase 5.2 | STR Review Panel — review dan approve draft LTMS/STR */

import { useState } from "react";

interface STRDraft {
  reportId: string;
  caseId: string;
  entityName: string;
  typology: string;
  generatedAt: string;
  status: "DRAFT" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "SUBMITTED";
  narrative: string;
  analystId: string;
}

const MOCK_DRAFTS: STRDraft[] = [
  {
    reportId: "STR-2026-001-A1B2C3",
    caseId: "CASE-2026-001",
    entityName: "Ahmad Santoso",
    typology: "STRUCTURING",
    generatedAt: new Date(Date.now() - 7200000).toISOString(),
    status: "DRAFT",
    analystId: "analis.senior@ppatk.go.id",
    narrative: `LAPORAN TRANSAKSI KEUANGAN MENCURIGAKAN (DRAFT)
Nomor Laporan: STR-2026-001-A1B2C3
Tanggal Dibuat: ${new Date().toLocaleDateString("id-ID")}
Status: DRAFT — Perlu review manusia

I. IDENTITAS SUBJEK
Nama: Ahmad Santoso
NIK: [TERENKRIPSI]

II. TIPOLOGI: STRUCTURING (Pasal 3 UU 8/2010)

III. URAIAN TRANSAKSI
- 12 transaksi dalam 7 hari
- Nilai per transaksi: Rp 450.000.000 – Rp 495.000.000
- Total: Rp 5.670.000.000
- Semua transaksi ke rekening berbeda

IV. ANALISIS RISIKO
Risk Score: 87/100 (CRITICAL)
Indikator utama: Structuring, velocity spike, round numbers

V. REKOMENDASI
File STR segera. Lakukan Enhanced Due Diligence.
`,
  },
];

interface STRReviewPanelProps {
  apiUrl: string;
  apiKey: string;
}

const STATUS_COLORS: Record<STRDraft["status"], string> = {
  DRAFT: "#6b7280",
  UNDER_REVIEW: "#f59e0b",
  APPROVED: "#10b981",
  REJECTED: "#ef4444",
  SUBMITTED: "#3b82f6",
};

export function STRReviewPanel({ apiUrl: _apiUrl, apiKey: _apiKey }: STRReviewPanelProps) {
  const [drafts] = useState<STRDraft[]>(MOCK_DRAFTS);
  const [selected, setSelected] = useState<STRDraft | null>(null);
  const [comment, setComment] = useState("");

  function handleApprove() {
    if (!selected) return;
    alert(
      `STR ${selected.reportId} marked for approval.\nComment: ${comment || "(none)"}\n\nTODO: POST to /api/v1/str/${selected.reportId}/approve`,
    );
  }

  function handleReject() {
    if (!selected) return;
    if (!comment.trim()) {
      alert("Rejection requires a comment/reason.");
      return;
    }
    alert(
      `STR ${selected.reportId} rejected.\nReason: ${comment}\n\nTODO: POST to /api/v1/str/${selected.reportId}/reject`,
    );
  }

  return (
    <div className="str-panel">
      <h2>📋 STR Draft Review</h2>
      <p className="str-notice">
        ⚠️ Semua draft STR/LTMS WAJIB direview oleh analis manusia sebelum disubmit ke PPATK.
        Referensi: UU No. 8/2010 Pasal 23.
      </p>

      <div className="str-layout">
        <div className="str-list">
          <h3>
            Draft Menunggu Review (
            {drafts.filter((d) => d.status === "DRAFT" || d.status === "UNDER_REVIEW").length})
          </h3>
          {drafts.map((draft) => (
            <div
              key={draft.reportId}
              className={`str-card ${selected?.reportId === draft.reportId ? "selected" : ""}`}
              onClick={() => {
                setSelected(draft);
                setComment("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setSelected(draft);
                  setComment("");
                }
              }}
              role="button"
              tabIndex={0}
            >
              <div className="str-card-header">
                <code className="str-id">{draft.reportId}</code>
                <span className="str-status" style={{ color: STATUS_COLORS[draft.status] }}>
                  {draft.status}
                </span>
              </div>
              <p className="str-entity">{draft.entityName}</p>
              <p className="str-typology">
                Tipologi: <strong>{draft.typology}</strong>
              </p>
              <p className="str-date">
                {new Date(draft.generatedAt).toLocaleString("id-ID")}
              </p>
            </div>
          ))}
        </div>

        {selected && (
          <div className="str-review-pane">
            <div className="str-meta">
              <span>
                Case: <strong>{selected.caseId}</strong>
              </span>
              <span>
                Analis: <strong>{selected.analystId}</strong>
              </span>
            </div>
            <textarea
              id="str-narrative"
              className="str-narrative"
              readOnly
              value={selected.narrative}
              rows={20}
            />
            <div className="str-actions">
              <textarea
                id="str-comment"
                className="str-comment"
                placeholder="Catatan reviewer (wajib jika menolak)..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
              />
              <div className="row">
                <button
                  id="str-approve-btn"
                  type="button"
                  className="primary"
                  onClick={handleApprove}
                  style={{ background: "#10b981" }}
                >
                  ✅ Setujui & Teruskan ke PPATK
                </button>
                <button
                  id="str-reject-btn"
                  type="button"
                  onClick={handleReject}
                  style={{ color: "#ef4444", border: "1px solid #ef4444" }}
                >
                  ❌ Tolak & Kembalikan
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
