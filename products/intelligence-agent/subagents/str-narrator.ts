/** BigPlan Phase 2.4 | STR Narrator Subagent — Suspicious Transaction Report narrative generation */
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import type { CompositeRiskScore } from "@daemon/engine/logic-engine/risk-scoring/composite-risk-engine.js";

export const STR_NARRATOR_SYSTEM_PROMPT = `
Kamu adalah compliance officer AI dalam platform Daemon Ontology, spesialis dalam
menulis Laporan Transaksi Keuangan Mencurigakan (LTMS/STR) sesuai format PPATK.

TUGAS UTAMA:
Menghasilkan narasi STR yang komprehensif, faktual, dan memenuhi standar pelaporan PPATK.

FORMAT NARASI STR (sesuai Peraturan PPATK No. 14/2017):
1. IDENTITAS PELAPOR
   - Nama PJK, nomor perizinan
2. IDENTITAS SUBJEK
   - Nama lengkap, NIK/nomor identitas, jabatan (jika relevan), alamat
3. URAIAN TRANSAKSI MENCURIGAKAN
   - Tanggal, jumlah, rekening, counterparty
   - Pattern yang mencurigakan (strukturisasi, layering, dll)
4. ANALISIS INDIKATOR KECURIGAAN
   - Indikator sesuai Peraturan PPATK
   - Cross-reference dengan database sanctions/daftar terduga
5. TEMUAN INVESTIGASI
   - Hasil OSINT, dark web signals (jika ada)
   - Risk score dan breakdown
   - Evidence chain (SMT hashes)
6. KESIMPULAN DAN REKOMENDASI
   - Tingkat keyakinan (LOW/MEDIUM/HIGH/VERY_HIGH)
   - Rekomendasi tindak lanjut

ATURAN PENULISAN:
- Gunakan bahasa Indonesia formal dan baku
- Sertakan tanggal dan nomor referensi setiap evidence
- JANGAN masukkan asumsi — hanya fakta yang didukung evidence
- Sertakan referensi ke pasal UU yang relevan
- Format angka: Rp 1.500.000.000 (bukan 1500000000)
`;

export const generateSTRNarrativeTool = tool(
  async ({ entityId, transactionIds, typologyType, analystId, additionalContext }) => {
    const baseUrl = process.env.DAEMON_API_BASE_URL ?? "http://127.0.0.1:3000";
    const apiKey = process.env.DAEMON_API_KEY ?? "";

    const entityRes = await fetch(`${baseUrl}/api/v1/entities/${entityId}`, {
      headers: { "X-API-Key": apiKey },
    });

    if (!entityRes.ok) {
      return `Error: cannot fetch entity ${entityId}: ${entityRes.status}`;
    }

    const entityData = (await entityRes.json()) as Record<string, unknown>;

    const riskRes = await fetch(`${baseUrl}/api/v1/risk-scores/${entityId}`, {
      headers: { "X-API-Key": apiKey },
    }).catch(() => null);

    const riskData = riskRes?.ok ? ((await riskRes.json()) as CompositeRiskScore) : null;

    const reportId = `STR-${Date.now()}-${entityId.slice(0, 8).toUpperCase()}`;
    const now = new Date().toISOString();

    const evidenceRefs =
      riskData?.evidence?.map((e) => e.sourceId).join(", ") ?? "N/A";

    const narrativeTemplate = `
LAPORAN TRANSAKSI KEUANGAN MENCURIGAKAN (DRAFT)
Nomor Laporan: ${reportId}
Tanggal Dibuat: ${now.split("T")[0]}
Status: DRAFT — Perlu review analis manusia sebelum disubmit

═══════════════════════════════════════════

I. IDENTITAS SUBJEK LAPORAN
Entitas ID: ${entityId}
Data Entitas: ${JSON.stringify(entityData, null, 2).slice(0, 500)}...

II. TIPOLOGI KECURIGAAN
Jenis Tipologi: ${typologyType}

III. TRANSAKSI YANG DILAPORKAN
Transaction IDs: ${transactionIds.join(", ")}
[Data transaksi lengkap perlu diambil dari sistem core banking]

IV. ANALISIS RISIKO
${
  riskData
    ? `
Risk Score: ${riskData.compositeScore}/100 (${riskData.riskLevel})
Breakdown:
- Transaction Risk: ${riskData.breakdown.transactionRisk}
- Sanctions Score: ${riskData.breakdown.sanctionsHitScore}
- Adverse Media: ${riskData.breakdown.adverseMediaScore}
- Dark Web Exposure: ${riskData.breakdown.darkwebExposureScore}
Evidence Refs: ${evidenceRefs}
`
    : "[Risk score belum tersedia]"
}

V. KONTEKS TAMBAHAN
${additionalContext ?? "-"}

VI. REKOMENDASI
[Diisi oleh analis setelah review temuan di atas]

═══════════════════════════════════════════
CATATAN: Draft ini dihasilkan secara otomatis oleh Daemon Ontology Intelligence Agent.
WAJIB direview dan divalidasi oleh analis manusia (${analystId}) sebelum disubmit ke PPATK.
Referensi: UU No. 8/2010 Pasal 23 — Kewajiban Pelaporan LTMS
`;

    return narrativeTemplate.trim();
  },
  {
    name: "generate_str_narrative",
    description:
      "Generate a draft Suspicious Transaction Report (STR/LTMS) narrative in Bahasa Indonesia " +
      "following PPATK format (Peraturan PPATK No. 14/2017). " +
      "Output is a DRAFT that MUST be reviewed by a human analyst before submission. " +
      "Use when there is sufficient evidence to justify filing a report.",
    schema: z.object({
      entityId: z.string().describe("Primary subject entity ID"),
      transactionIds: z
        .array(z.string())
        .min(1)
        .describe("Transaction IDs to include in report"),
      typologyType: z
        .enum([
          "STRUCTURING",
          "LAYERING",
          "INTEGRATION",
          "TBML",
          "CRYPTO_MIXING",
          "SMURFING",
          "SHELL_COMPANY",
          "OTHER",
        ])
        .describe("AML typology type detected"),
      analystId: z
        .string()
        .describe("Analyst ID responsible for this report (for audit)"),
      additionalContext: z
        .string()
        .optional()
        .describe(
          "Additional investigation context, OSINT findings, or notes from analyst",
        ),
    }),
  },
);

export const strNarratorSubagent = {
  name: "str-narrator",
  description:
    "STR/LTMS narrative generation specialist. " +
    "Generates draft Suspicious Transaction Reports in Bahasa Indonesia following PPATK format. " +
    "Always requires human analyst review before submission.",
  systemPrompt: STR_NARRATOR_SYSTEM_PROMPT,
  tools: [generateSTRNarrativeTool],
};
