import Link from "next/link";
import { ExpressCargoIntakePanel } from "@/components/ExpressCargoIntakePanel";
import { buildIntakeProposal, loadIntakeFixture } from "@/lib/express-cargo-intake";
import { createDaemonClient } from "@/lib/daemon-client";
import { getDevBearer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const FIXTURE_ID = "bast-sim-001";
const AUDIT_CASE_ID = "case-express-sla-001";

export default async function ExpressCargoIntakePage() {
  const fixture = loadIntakeFixture(FIXTURE_ID);
  const proposal = buildIntakeProposal(fixture);
  const { parameters } = proposal;

  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const bearer = session?.access_token ?? getDevBearer();
  const client = createDaemonClient(bearer);

  let attachments: Array<Record<string, unknown>> = [];
  let attachmentError: string | null = null;
  try {
    const res = await client.listAttachments({
      resourceType: "Case",
      resourceId: AUDIT_CASE_ID,
    });
    attachments = res.items ?? [];
  } catch (e) {
    attachmentError =
      e instanceof Error ? e.message : "Could not load attachments from platform-api";
  }

  return (
    <main>
      <p>
        <Link href="/express-cargo">← Express cargo ops</Link>
      </p>
      <h1>Document intake — human review</h1>
      <p className="muted">
        Fixture <code>{FIXTURE_ID}</code> · propose-only agent path; approve executes Go{" "}
        <code>CreateShipmentDraft</code>.
      </p>

      <section className="card" style={{ marginTop: "1rem" }}>
        <h2>Linked attachments</h2>
        <p className="muted">
          From <code>GET /v1/attachments</code> for case <code>{AUDIT_CASE_ID}</code>
        </p>
        {attachmentError && <p className="muted">{attachmentError}</p>}
        {attachments.length === 0 && !attachmentError && (
          <p className="muted">No attachments linked to this case.</p>
        )}
        {attachments.map((a) => (
          <div key={String(a.attachmentId ?? a.id)} style={{ marginTop: "0.5rem" }}>
            <strong>{String(a.filename ?? "attachment")}</strong>
            <span className="muted"> · {String(a.contentType ?? "—")}</span>
          </div>
        ))}
      </section>

      <section className="card" style={{ marginTop: "1rem" }}>
        <h2>Proposed fields</h2>
        <p>Customer account: {parameters.customerAccountId}</p>
        <p>Origin: {parameters.origin}</p>
        <p>Destination: {parameters.destination}</p>
        <p>Weight: {parameters.weight}</p>
        <pre style={{ fontSize: "0.85rem", overflow: "auto" }}>
          {JSON.stringify(parameters.references, null, 2)}
        </pre>
      </section>

      <ExpressCargoIntakePanel
        proposal={proposal}
        fixtureId={FIXTURE_ID}
        auditCaseId={AUDIT_CASE_ID}
      />
    </main>
  );
}
