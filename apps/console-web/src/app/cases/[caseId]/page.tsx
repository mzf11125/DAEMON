import Link from "next/link";
import { CaseAuditStrip } from "@/components/CaseAuditStrip";
import { CaseDecisionForm } from "@/components/CaseDecisionForm";
import { createDaemonClient } from "@/lib/daemon-client";
import { getDevBearer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = await params;
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const bearer = session?.access_token ?? getDevBearer();
  const client = createDaemonClient(bearer);

  let caseData: Record<string, unknown> | null = null;
  let summary: string | null = null;
  let auditItems: Array<Record<string, unknown>> = [];
  let error: string | null = null;

  try {
    caseData = await client.getCase(caseId);
    const sum = await client.summarizeCaseContext(caseId);
    summary = sum.summary;
    const audit = await client.listAuditEvents({
      resourceType: "Case",
      resourceId: caseId,
      limit: 20,
    });
    auditItems = audit.items ?? [];
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load case";
  }

  const signalIds = (caseData?.signalIds as string[] | undefined) ?? [];

  return (
    <main>
      <p>
        <Link href="/">← Cockpit</Link>
      </p>
      <h1>{String(caseData?.title ?? caseId)}</h1>
      {error && <p className="muted">API error: {error}</p>}
      {caseData && (
        <p className="muted">
          {String(caseData.status)} · {caseId}
        </p>
      )}
      {summary && (
        <section style={{ marginTop: "1.5rem" }}>
          <h2>Context summary</h2>
          <p className="card">{summary}</p>
        </section>
      )}
      <section style={{ marginTop: "1.5rem" }}>
        <h2>Linked signals</h2>
        {signalIds.length === 0 ? (
          <p className="muted">No signals linked.</p>
        ) : (
          <ul>
            {signalIds.map((sid) => (
              <li key={sid}>{sid}</li>
            ))}
          </ul>
        )}
      </section>
      <section style={{ marginTop: "1.5rem" }}>
        <h2>Audit trail</h2>
        <CaseAuditStrip items={auditItems as Parameters<typeof CaseAuditStrip>[0]["items"]} />
      </section>
      <section style={{ marginTop: "1.5rem" }}>
        <CaseDecisionForm caseId={caseId} />
      </section>
    </main>
  );
}
