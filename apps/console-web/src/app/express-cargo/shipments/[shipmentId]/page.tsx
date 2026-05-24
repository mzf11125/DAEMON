import Link from "next/link";
import { ExpressCargoConfirmPanel } from "@/components/ExpressCargoConfirmPanel";
import { createDaemonClient } from "@/lib/daemon-client";
import { getDevBearer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const PACK = "logistics-express-cargo";

export default async function ShipmentDetailPage({
  params,
}: {
  params: Promise<{ shipmentId: string }>;
}) {
  const { shipmentId } = await params;
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const bearer = session?.access_token ?? getDevBearer();
  const client = createDaemonClient(bearer);

  let shipment: { primaryKey: string; properties: Record<string, unknown> } | null = null;
  let legs: Array<{ primaryKey: string; properties: Record<string, unknown> }> = [];
  let touchpoints: Array<{ primaryKey: string; properties: Record<string, unknown> }> = [];
  let signals: Array<{ primaryKey: string; properties: Record<string, unknown> }> = [];
  let error: string | null = null;

  try {
    const shipRes = await client.listObjects("Shipment", { limit: 100 });
    shipment =
      (shipRes.items ?? []).find((s) => s.primaryKey === shipmentId) ?? null;

    const legRes = await client.listObjects("ShipmentLeg", { limit: 100 });
    legs = (legRes.items ?? []).filter(
      (l) => String(l.properties?.shipmentId ?? "") === shipmentId,
    );

    const tpRes = await client.listObjects("ActivityTouchpoint", { limit: 100 });
    touchpoints = (tpRes.items ?? []).filter(
      (t) => String(t.properties?.shipmentId ?? "") === shipmentId,
    );

    const sigRes = await client.listObjects("Signal", { limit: 100 });
    signals = (sigRes.items ?? []).filter((s) => {
      const props = s.properties ?? {};
      if (String(props.shipmentId ?? "") === shipmentId) return true;
      const legIds = legs.map((l) => l.primaryKey);
      if (legIds.includes(String(props.shipmentLegId ?? ""))) return true;
      return String(props.vertical ?? "") === PACK && String(props.shipmentId ?? "") === shipmentId;
    });
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load shipment";
  }

  return (
    <main>
      <p>
        <Link href="/express-cargo/shipments">← Shipment monitor</Link>
      </p>
      <h1>{shipmentId}</h1>
      <p className="muted">Pack: {PACK}</p>
      {error && <p className="muted">API error: {error}</p>}
      {shipment && (
        <section className="card" style={{ marginTop: "1rem" }}>
          <div>Status: {String(shipment.properties?.status ?? "—")}</div>
          <div>Order: {String(shipment.properties?.commercialOrderId ?? "—")}</div>
        </section>
      )}
      {shipment?.properties?.status === "draft" && (
        <ExpressCargoConfirmPanel shipmentId={shipmentId} />
      )}

      <section style={{ marginTop: "1.5rem" }}>
        <h2>Leg timeline</h2>
        {legs.length === 0 ? (
          <p className="muted">No legs linked in ontology store.</p>
        ) : (
          <ol>
            {legs.map((leg) => (
              <li key={leg.primaryKey} style={{ marginBottom: "0.75rem" }}>
                <strong>{leg.primaryKey}</strong>
                <div className="muted">
                  SLA: {String(leg.properties?.slaStatus ?? "—")} · seq{" "}
                  {String(leg.properties?.sequence ?? "—")}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section style={{ marginTop: "1.5rem" }}>
        <h2>Linked signals</h2>
        {signals.length === 0 ? (
          <p className="muted">No signals linked to this shipment.</p>
        ) : (
          <ul>
            {signals.map((sig) => (
              <li key={sig.primaryKey} style={{ marginBottom: "0.5rem" }}>
                <strong>{sig.primaryKey}</strong> · {String(sig.properties?.severity ?? "—")} ·{" "}
                {String(sig.properties?.summary ?? "—")}
                {sig.properties?.provenanceRuleId ? (
                  <span className="muted"> · rule {String(sig.properties.provenanceRuleId)}</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section style={{ marginTop: "1.5rem" }}>
        <h2>Touchpoints</h2>
        {touchpoints.length === 0 ? (
          <p className="muted">No activity touchpoints.</p>
        ) : (
          <ul>
            {touchpoints.map((tp) => (
              <li key={tp.primaryKey}>
                {String(tp.properties?.touchpointType ?? tp.primaryKey)} ·{" "}
                {String(tp.properties?.occurredAt ?? "—")}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
