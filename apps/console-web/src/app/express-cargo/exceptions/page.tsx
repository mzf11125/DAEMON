import Link from "next/link";
import { SignalOpenCase } from "@/components/SignalOpenCase";
import { ExceptionDeskActions } from "@/components/ExceptionDeskActions";
import { createDaemonClient } from "@/lib/daemon-client";
import { getDevBearer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function isExpressSignal(props: Record<string, unknown>, pk: string): boolean {
  const rule = String(props.provenanceRuleId ?? "");
  return pk.startsWith("signal-express-") || rule.startsWith("express-");
}

export default async function ExceptionDeskPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const bearer = session?.access_token ?? getDevBearer();
  const client = createDaemonClient(bearer);

  let signals: Array<{ primaryKey: string; properties: Record<string, unknown> }> = [];
  let cases: Array<Record<string, unknown>> = [];
  let error: string | null = null;

  try {
    const signalRes = await client.listSignals();
    signals = (signalRes.items ?? []).filter((s) =>
      isExpressSignal(s.properties ?? {}, s.primaryKey),
    );
    const caseRes = await client.listCases();
    cases = (caseRes.items ?? []).filter((c) =>
      String(c.caseId ?? "").includes("express"),
    );
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load exceptions";
  }

  return (
    <main>
      <p>
        <Link href="/express-cargo">← Express cargo ops</Link>
      </p>
      <h1>Exception desk</h1>
      <p className="muted">Filtered to express-cargo signals and cases</p>
      <ExceptionDeskActions />
      {error && <p className="muted">API error: {error}</p>}

      <section style={{ marginTop: "1.5rem" }}>
        <h2>Signals</h2>
        {signals.length === 0 && !error && <p className="muted">No express signals.</p>}
        <SignalOpenCase signals={signals} />
      </section>

      <section style={{ marginTop: "2rem" }}>
        <h2>Cases</h2>
        {cases.length === 0 && !error && <p className="muted">No express cases.</p>}
        {cases.map((c) => (
          <article key={String(c.caseId)} className="card">
            <Link href={`/cases/${String(c.caseId)}`}>
              <strong>{String(c.title)}</strong>
            </Link>
            <div className="muted" style={{ marginTop: "0.5rem" }}>
              {String(c.status)} · {String(c.priority ?? "—")}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
