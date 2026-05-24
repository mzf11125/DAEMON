import Link from "next/link";
import { SignalOpenCase } from "@/components/SignalOpenCase";
import { createDaemonClient } from "@/lib/daemon-client";
import { getDevBearer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const bearer = session?.access_token ?? getDevBearer();
  const client = createDaemonClient(bearer);

  let me: Record<string, unknown> | null = null;
  let signals: Array<{ primaryKey: string; properties: Record<string, unknown> }> = [];
  let cases: Array<Record<string, unknown>> = [];
  let error: string | null = null;

  try {
    me = await client.me();
    const signalRes = await client.listSignals();
    signals = signalRes.items ?? [];
    const caseRes = await client.listCases();
    cases = caseRes.items ?? [];
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load data";
  }

  return (
    <main>
      <h1>Operational cockpit</h1>
      <p className="muted">
        {me
          ? `Signed in as ${String(me.displayName)} (${String(me.email)})`
          : session
            ? "Loading profile…"
            : "Sign in below or start Supabase + seed (see README)"}
      </p>
      {error && <p className="muted">API error: {error}</p>}

      <p className="muted">
        <Link href="/dev">Developer tools</Link> (ingestion, rules, Dune)
        {(me?.features as Record<string, unknown> | undefined)?.geoMapEnabled === true && (
          <>
            {" · "}
            <Link href="/live">Live map</Link>
          </>
        )}
      </p>

      <section style={{ marginTop: "2rem" }}>
        <h2>Signal inbox</h2>
        {signals.length === 0 && !error && <p className="muted">No signals in database.</p>}
        <SignalOpenCase signals={signals} />
      </section>

      <section style={{ marginTop: "2rem" }}>
        <h2>Cases</h2>
        {cases.length === 0 && !error && <p className="muted">No cases yet.</p>}
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
