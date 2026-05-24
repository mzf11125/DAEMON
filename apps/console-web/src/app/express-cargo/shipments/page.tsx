import Link from "next/link";
import { createDaemonClient } from "@/lib/daemon-client";
import { getDevBearer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const PACK = "logistics-express-cargo";

export default async function ShipmentMonitorPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const bearer = session?.access_token ?? getDevBearer();
  const client = createDaemonClient(bearer);

  let shipments: Array<{ primaryKey: string; properties: Record<string, unknown> }> = [];
  let error: string | null = null;

  try {
    const res = await client.listObjects("Shipment", { limit: 100 });
    shipments = (res.items ?? []).filter(
      (s) => String(s.properties?.vertical ?? "") === PACK,
    );
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load shipments";
  }

  return (
    <main>
      <p>
        <Link href="/express-cargo">← Express cargo ops</Link>
      </p>
      <h1>Shipment monitor</h1>
      {error && <p className="muted">API error: {error}</p>}
      {shipments.length === 0 && !error && (
        <p className="muted">No shipments for pack {PACK}. Run seed-sandbox.</p>
      )}
      {shipments.map((s) => (
        <article key={s.primaryKey} className="card">
          <Link href={`/express-cargo/shipments/${encodeURIComponent(s.primaryKey)}`}>
            <strong>{s.primaryKey}</strong>
          </Link>
          <div className="muted" style={{ marginTop: "0.5rem" }}>
            {String(s.properties?.status ?? "—")} · order{" "}
            {String(s.properties?.commercialOrderId ?? "—")}
          </div>
        </article>
      ))}
    </main>
  );
}
