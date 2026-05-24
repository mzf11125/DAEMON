import Link from "next/link";
import { createDaemonClient } from "@/lib/daemon-client";
import { getDevBearer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const PACK = "logistics-express-cargo";

function isExpressSignal(props: Record<string, unknown>, pk: string): boolean {
  const rule = String(props.provenanceRuleId ?? "");
  return pk.startsWith("signal-express-") || rule.startsWith("express-");
}

export default async function ExpressCargoOpsPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const bearer = session?.access_token ?? getDevBearer();
  const client = createDaemonClient(bearer);

  let shipments: Array<{ primaryKey: string; properties: Record<string, unknown> }> = [];
  let signals: Array<{ primaryKey: string; properties: Record<string, unknown> }> = [];
  let cases: Array<Record<string, unknown>> = [];
  let error: string | null = null;

  try {
    const shipRes = await client.listObjects("Shipment", { limit: 100 });
    shipments = (shipRes.items ?? []).filter(
      (s) => String(s.properties?.vertical ?? "") === PACK,
    );
    const signalRes = await client.listSignals();
    signals = (signalRes.items ?? []).filter((s) =>
      isExpressSignal(s.properties ?? {}, s.primaryKey),
    );
    const caseRes = await client.listCases();
    cases = (caseRes.items ?? []).filter((c) =>
      String(c.caseId ?? "").includes("express"),
    );
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load express-cargo data";
  }

  const inTransit = shipments.filter((s) => s.properties?.status === "in_transit").length;
  const openSignals = signals.filter((s) => s.properties?.status !== "closed").length;
  const openCases = cases.filter((c) => c.status !== "closed").length;

  return (
    <main>
      <p>
        <Link href="/">← Cockpit</Link>
      </p>
      <h1>Express cargo — operations</h1>
      <p className="muted">Pack: {PACK} · simulation MVP</p>
      {error && <p className="muted">API error: {error}</p>}

      <section style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginTop: "1.5rem" }}>
        <article className="card" style={{ minWidth: "10rem" }}>
          <strong>{inTransit}</strong>
          <div className="muted">Shipments in transit</div>
        </article>
        <article className="card" style={{ minWidth: "10rem" }}>
          <strong>{openSignals}</strong>
          <div className="muted">Open express signals</div>
        </article>
        <article className="card" style={{ minWidth: "10rem" }}>
          <strong>{openCases}</strong>
          <div className="muted">Open express cases</div>
        </article>
      </section>

      <p style={{ marginTop: "1.5rem" }}>
        <Link href="/express-cargo/intake">Document intake (HITL)</Link>
        {" · "}
        <Link href="/express-cargo/shipments">Shipment monitor</Link>
        {" · "}
        <Link href="/express-cargo/exceptions">Exception desk</Link>
        {" · "}
        <Link href="/express-cargo/accounts/account-tier-b-silent-001/brief">
          Sales brief (silent account)
        </Link>
      </p>
    </main>
  );
}
